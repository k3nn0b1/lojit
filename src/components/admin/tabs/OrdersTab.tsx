import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatBRL, rankSize, sortPedidos, parseSupabaseError } from "@/lib/utils";
import { Pedido, AdminProduct } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";

interface OrdersTabProps {
  tenantId: string;
  pedidos: Pedido[];
  setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
  storedProducts: AdminProduct[];
  setStoredProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>;
  refreshingOrders: boolean;
  fetchPedidos: () => Promise<void>;
}

const OrdersTab = ({
  tenantId,
  pedidos,
  setPedidos,
  storedProducts,
  setStoredProducts,
  refreshingOrders,
  fetchPedidos,
}: OrdersTabProps) => {
  const [pedidoSearch, setPedidoSearch] = useState("");
  const [pedidoStatusFilter, setPedidoStatusFilter] = useState("todos");
  const [pedidoPage, setPedidoPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "concluir" | "cancelar" } | null>(null);
  const [pedidoDetalhesId, setPedidoDetalhesId] = useState<string | null>(null);
  const [devolucaoPedidoId, setDevolucaoPedidoId] = useState<string | null>(null);
  const [devolucaoParcial, setDevolucaoParcial] = useState(false);
  const [devolucaoQuantidades, setDevolucaoQuantidades] = useState<number[]>([]);
  const [confirmTotalOpen, setConfirmTotalOpen] = useState(false);
  const [pedidoSeq, setPedidoSeq] = useState<Record<string, number>>({});

  // Sequencial estável por ordem de criação (mais antigo = 1)
  useEffect(() => {
    const ordered = [...pedidos].sort((a, b) => new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime());
    const map: Record<string, number> = {};
    ordered.forEach((p, i) => { map[String(p.id)] = i + 1; });
    setPedidoSeq(map);
  }, [pedidos]);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter((p) => {
      const matchesStatus = pedidoStatusFilter === "todos" || p.status === pedidoStatusFilter;
      const term = pedidoSearch.toLowerCase().trim();
      const matchesSearch =
        p.cliente_nome.toLowerCase().includes(term) ||
        String(p.id).toLowerCase().includes(term) ||
        String(pedidoSeq[p.id] || "").includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [pedidos, pedidoStatusFilter, pedidoSearch, pedidoSeq]);

  const orderedPedidos = useMemo(() => sortPedidos(filteredPedidos), [filteredPedidos]);
  const totalPages = Math.max(1, Math.ceil(orderedPedidos.length / pageSize));
  const visiblePedidos = orderedPedidos.slice((pedidoPage - 1) * pageSize, pedidoPage * pageSize);

  const applyBaixaDeEstoque = async (pedido: Pedido) => {
    for (const item of pedido.itens || []) {
      const productId = item.product_id;
      const tamanho = item.tamanho;
      const qty = Number(item.quantidade || 0);
      if (!productId || !tamanho || qty <= 0) continue;
      
      const { error } = await supabase.rpc('update_inventory', {
        p_product_id: productId,
        p_tenant_id: tenantId,
        p_size: tamanho,
        p_delta: -qty
      });

      if (error) console.error(`Erro ao debitar estoque [ID:${productId}]:`, error);
    }
  };

  const handleConfirmAction = async (id: string, action: "concluir" | "cancelar") => {
    const target = pedidos.find((p) => p.id === id);
    if (!target) return;
    try {
      if (action === 'concluir') {
        await applyBaixaDeEstoque(target);
      }
      const { error } = await supabase.from('pedidos').update({ status: action === 'concluir' ? 'concluido' : 'cancelado' }).eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      
      toast.success(action === 'concluir' ? 'Pedido concluído' : 'Pedido cancelado');
      await fetchPedidos();
    } catch (e: any) {
      toast.error('Falha ao atualizar pedido', { description: parseSupabaseError(e) });
    }
  };

  const applyDevolucaoEstoqueParcial = async (pedido: Pedido, quantidades: number[]) => {
    try {
      for (let i = 0; i < (pedido.itens || []).length; i++) {
        const it = pedido.itens[i];
        const already = Number(it.devolvido || 0);
        const maxReturn = Math.max(0, Number(it.quantidade || 0) - already);
        const qty = Math.max(0, Math.min(maxReturn, Number(quantidades[i] || 0)));
        if (qty <= 0) continue;
        
        const productId = it.product_id;
        const tamanho = it.tamanho;

        const { error } = await supabase.rpc('update_inventory', {
            p_product_id: productId,
            p_tenant_id: tenantId,
            p_size: tamanho,
            p_delta: qty
        });

        if (error) console.error(`Erro ao devolver estoque [ID:${productId}]:`, error);
      }

      const newItens = (pedido.itens || []).map((it, idx) => {
        const already = Number(it.devolvido || 0);
        const maxReturn = Math.max(0, Number(it.quantidade || 0) - already);
        const qty = Math.max(0, Math.min(maxReturn, Number(quantidades[idx] || 0)));
        if (qty <= 0) return it;
        return { ...it, devolvido: already + qty };
      });

      const isTotalReturn = newItens.every((it) => Number(it.devolvido || 0) >= Number(it.quantidade || 0));
      const { error } = await supabase.from('pedidos').update({ itens: newItens, status: isTotalReturn ? 'devolvido' : 'parcialmente_devolvido' }).eq('id', pedido.id).eq('tenant_id', tenantId);
      if (error) throw error;

      toast.success('Devolução aplicada e estoque atualizado');
      await fetchPedidos();
    } catch (e: any) {
      toast.error('Falha ao aplicar devolução', { description: parseSupabaseError(e) });
    }
  };

  const handleOpenDevolucao = (pedido: Pedido) => {
    setDevolucaoPedidoId(pedido.id);
    setDevolucaoParcial(true);
    setDevolucaoQuantidades(pedido.itens.map(() => 0));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-black uppercase tracking-widest text-primary">Pedidos</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPedidos}
            disabled={refreshingOrders}
            className="h-9 gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingOrders ? 'animate-spin text-primary' : ''}`} />
            {refreshingOrders ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Buscar Cliente ou ID</Label>
              <Input
                placeholder="Ex: João ou 123..."
                value={pedidoSearch}
                onChange={(e) => {
                  setPedidoSearch(e.target.value);
                  setPedidoPage(1);
                }}
                className="bg-muted/20 border-primary/10"
              />
            </div>
            <div className="w-full md:w-[240px] space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Filtrar por Status</Label>
              <Select
                value={pedidoStatusFilter}
                onValueChange={(val) => {
                  setPedidoStatusFilter(val);
                  setPedidoPage(1);
                }}
              >
                <SelectTrigger className="bg-muted/20 border-primary/10">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Pedidos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="devolvido">Devolvido</SelectItem>
                  <SelectItem value="parcialmente_devolvido">Parcialmente Devolvido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {visiblePedidos.length === 0 ? (
            <div className="py-20 text-center space-y-4 rounded-2xl border-2 border-dashed border-primary/5">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto text-muted-foreground/30 italic font-serif">?</div>
              <p className="text-muted-foreground font-medium italic">Nenhum pedido encontrado com estes filtros.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cards para Mobile */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {visiblePedidos.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => setPedidoDetalhesId(p.id)}
                    className="p-5 rounded-2xl bg-muted/10 border border-primary/10 space-y-4 relative overflow-hidden active:scale-[0.98] transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-black text-primary/40 leading-none">#{pedidoSeq[p.id] || '—'}</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase leading-none">{new Date(p.data_criacao).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-black text-sm uppercase truncate max-w-[150px]">{p.cliente_nome}</h4>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-primary leading-none text-base">{formatBRL(Number(p.valor_total || 0))}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                      <div className="flex items-center gap-2">
                        {p.status === 'pendente' && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black uppercase text-[9px]">Pendente</Badge>}
                        {p.status === 'concluido' && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-black uppercase text-[9px]">Concluído</Badge>}
                        {p.status === 'devolvido' && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-black uppercase text-[9px]">Devolvido</Badge>}
                        {p.status === 'parcialmente_devolvido' && <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-black uppercase text-[9px]">P. Devolvido</Badge>}
                        {p.status === 'cancelado' && <Badge variant="outline" className="font-black uppercase text-[9px]">Cancelado</Badge>}
                      </div>
                      
                      {p.status === 'pendente' && (
                        <div className="flex gap-2">
                          <Button 
                            className="h-8 w-8 bg-green-600 rounded-full p-0"
                            onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: p.id, action: 'concluir' }); }}
                          >
                             <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="destructive"
                            className="h-8 w-8 rounded-full p-0"
                            onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: p.id, action: 'cancelar' }); }}
                          >
                             <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela para Desktop */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-primary/10 bg-muted/5">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-primary/10">
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {visiblePedidos.map((p) => (
                      <tr 
                        key={p.id} 
                        onClick={() => setPedidoDetalhesId(p.id)} 
                        className="hover:bg-primary/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-xs font-medium">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{new Date(p.data_criacao).toLocaleDateString()}</span>
                              </TooltipTrigger>
                              <TooltipContent>{new Date(p.data_criacao).toLocaleTimeString()}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono text-[10px] font-bold text-primary/70">{pedidoSeq[p.id] ?? '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap font-bold text-foreground max-w-[180px] truncate">{p.cliente_nome}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-muted-foreground">{p.cliente_telefone}</td>
                        <td className="px-4 py-4 whitespace-nowrap font-black text-primary">{formatBRL(Number(p.valor_total || 0))}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {p.status === 'pendente' && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black uppercase tracking-tighter text-[9px]">Pendente</Badge>}
                          {p.status === 'concluido' && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-black uppercase tracking-tighter text-[9px]">Concluído</Badge>}
                          {p.status === 'devolvido' && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-black uppercase tracking-tighter text-[9px]">Devolvido</Badge>}
                          {p.status === 'parcialmente_devolvido' && <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-black uppercase tracking-tighter text-[9px]">P. Devolvido</Badge>}
                          {p.status === 'cancelado' && <Badge variant="outline" className="font-black uppercase tracking-tighter text-[9px]">Cancelado</Badge>}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-[10px] font-black">
                             {p.status === 'pendente' ? (
                               <>
                                 <Button 
                                   size="sm" 
                                   className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px]"
                                   onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: p.id, action: 'concluir' }); }}
                                 >
                                   Concluir
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   variant="destructive"
                                   className="h-8 font-bold text-[10px]"
                                   onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: p.id, action: 'cancelar' }); }}
                                 >
                                   Cancelar
                                 </Button>
                               </>
                             ) : (
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 className="h-8 border-primary/20 font-bold text-[10px] group-hover:bg-primary/10 group-hover:text-primary transition-all"
                               >
                                 Detalhes
                               </Button>
                             )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Itens por página:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPedidoPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 bg-muted/20 border-primary/10 text-[10px] font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[15, 30, 50].map((size) => (
                        <SelectItem key={size} value={String(size)} className="text-[10px] font-bold">
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={pedidoPage <= 1} 
                    onClick={() => setPedidoPage((p) => Math.max(1, p - 1))}
                    className="h-8 font-bold text-[10px] border-primary/10"
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && pedidoPage > 3) {
                         pageNum = Math.min(pedidoPage - 2 + i, totalPages - 4 + i);
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pedidoPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPedidoPage(pageNum)}
                          className={`h-8 w-8 font-black text-[10px] ${pedidoPage === pageNum ? 'shadow-lg shadow-primary/20' : 'border-primary/10'}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={pedidoPage >= totalPages} 
                    onClick={() => setPedidoPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 font-bold text-[10px] border-primary/10"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Confirmar Ação (Concluir/Cancelar) */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => setConfirmAction(open ? confirmAction : null)}>
        <DialogContent className="bg-card text-foreground border-primary/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-widest text-primary">
              Confirmar {confirmAction?.action === 'concluir' ? 'Conclusão' : 'Cancelamento'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium italic">
              Revise os itens e o impacto no estoque antes de prosseguir.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {(pedidos.find(p => p.id === confirmAction?.id)?.itens || []).map((it, idx) => {
              const prod = storedProducts.find(sp => sp.id === it.product_id);
              const estoqueAtual = Math.max(0, Number((prod?.stockBySize || {})[it.tamanho] || 0));
              const apos = confirmAction?.action === 'concluir' ? Math.max(0, estoqueAtual - Number(it.quantidade || 0)) : estoqueAtual;
              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-primary/10">
                  <div className="space-y-1">
                    <div className="text-sm font-bold flex items-center gap-2">
                       {it.produto}
                       <Badge variant="outline" className="h-5 text-[9px] font-black">{it.tamanho}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">Quantidade: {it.quantidade} unidade(s)</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-[9px] text-muted-foreground uppercase font-black">Estoque</div>
                    <div className="flex items-center gap-2 font-black text-xs">
                      <span>{estoqueAtual}</span>
                      <span className="text-primary/40">→</span>
                      <span className={confirmAction?.action === 'concluir' ? 'text-primary' : ''}>{apos}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmAction(null)} className="font-bold">Voltar</Button>
            <Button 
              className={confirmAction?.action === 'concluir' ? "bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest" : "bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest"} 
              onClick={() => { if (confirmAction) handleConfirmAction(confirmAction.id, confirmAction.action); setConfirmAction(null); }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Pedido */}
      <Dialog open={pedidoDetalhesId != null} onOpenChange={(open) => setPedidoDetalhesId(open ? pedidoDetalhesId : null)}>
        <DialogContent className="bg-card text-foreground border-primary/20 max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar border">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
              Pedido <span className="text-primary">#{pedidoSeq[String(pedidoDetalhesId ?? '')] ?? '—'}</span>
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px] opacity-40">{pedidoDetalhesId}</DialogDescription>
          </DialogHeader>
          {(() => {
            const pedido = pedidos.find(p => p.id === pedidoDetalhesId);
            if (!pedido) return null;
            return (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-muted/10 border border-primary/10 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">Informações do Cliente</div>
                    <div className="space-y-1.5">
                      <div className="text-lg font-black">{pedido.cliente_nome}</div>
                      <div className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {pedido.cliente_telefone}
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground pt-2">Registrado em: {new Date(pedido.data_criacao).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/10 border border-primary/10 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">Resumo da Venda</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-muted-foreground">Status</span>
                        <Badge className={`${pedido.status === 'concluido' ? 'bg-green-500' : 'bg-amber-500'} font-black text-[10px] uppercase text-white`}>{pedido.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                        <span className="text-sm font-bold text-muted-foreground">Total Pago</span>
                        <span className="text-xl font-black text-primary">{formatBRL(pedido.valor_total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Itens Adquiridos</div>
                  <div className="grid grid-cols-1 gap-2">
                    {pedido.itens.map((it, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-primary/5 group hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary text-xs italic">{it.tamanho}</div>
                          <div className="space-y-0.5">
                            <div className="text-sm font-bold">{it.produto}</div>
                            {it.cor && <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Cor: {it.cor}</div>}
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="text-xs font-black">x{it.quantidade}</div>
                          <div className="text-[10px] text-primary font-bold">{formatBRL(it.preco_unitario * it.quantidade)}</div>
                          {Number(it.devolvido || 0) > 0 && (
                            <Badge variant="outline" className="text-[8px] bg-red-500/10 text-red-500 border-red-500/20 px-1.5 h-4">Devolvido: {it.devolvido}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {pedido.status === 'concluido' && (
                  <div className="pt-4 border-t border-primary/10">
                    <Button 
                      variant="outline" 
                      className="w-full h-12 border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold uppercase tracking-widest text-xs"
                      onClick={() => handleOpenDevolucao(pedido)}
                    >
                      Solicitar Devolução
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog: Devolução de Pedido */}
      {devolucaoPedidoId && (
        <Dialog open={!!devolucaoPedidoId} onOpenChange={(o) => { if (!o) { setDevolucaoPedidoId(null); setDevolucaoParcial(false); setDevolucaoQuantidades([]); } }}>
          <DialogContent className="bg-card text-foreground border-primary/20 max-w-lg border">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-widest text-amber-500">Devolução de Pedido</DialogTitle>
              <DialogDescription className="font-medium italic">Selecione os itens e quantidades a serem retornados ao estoque.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-6">
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/20 rounded-xl">
                <Button 
                  variant={!devolucaoParcial ? "default" : "ghost"} 
                  onClick={() => setConfirmTotalOpen(true)}
                  className={`h-11 font-black text-xs uppercase ${!devolucaoParcial ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : ''}`}
                >
                  Total
                </Button>
                <Button 
                  variant={devolucaoParcial ? "default" : "ghost"} 
                  onClick={() => setDevolucaoParcial(true)}
                  className={`h-11 font-black text-xs uppercase ${devolucaoParcial ? 'bg-primary text-black shadow-lg shadow-primary/20' : ''}`}
                >
                  Parcial
                </Button>
              </div>

              {devolucaoParcial && (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {(pedidos.find(p => p.id === devolucaoPedidoId)?.itens || []).map((it, idx) => {
                    const max = Math.max(0, Number(it.quantidade || 0) - Number(it.devolvido || 0));
                    return (
                      <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-muted/10 border border-primary/5">
                        <div className="flex-1 space-y-0.5">
                          <div className="text-xs font-bold">{it.produto}</div>
                          <div className="text-[10px] text-muted-foreground font-black uppercase">Tam {it.tamanho} <span className="opacity-40 px-1">|</span> Máx: {max}</div>
                        </div>
                        <Input 
                          type="number" 
                          min={0} 
                          max={max} 
                          value={devolucaoQuantidades[idx] ?? 0} 
                          className="w-20 h-9 bg-background border-primary/10 text-center font-bold"
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(max, Number(e.target.value || 0)));
                            setDevolucaoQuantidades(prev => {
                              const next = [...prev];
                              next[idx] = v;
                              return next;
                            });
                          }} 
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => { setDevolucaoPedidoId(null); setDevolucaoParcial(false); setDevolucaoQuantidades([]); }} className="font-bold">Cancelar</Button>
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest"
                onClick={() => {
                  const pedido = pedidos.find(p => p.id === devolucaoPedidoId);
                  if (!pedido) return;
                  const qs = devolucaoParcial 
                    ? devolucaoQuantidades 
                    : pedido.itens.map(it => Math.max(0, Number(it.quantidade || 0) - Number(it.devolvido || 0)));
                  
                  if (qs.every(q => q === 0)) {
                    toast.error("Nenhuma quantidade selecionada para devolução");
                    return;
                  }

                  applyDevolucaoEstoqueParcial(pedido, qs);
                  setDevolucaoPedidoId(null);
                  setDevolucaoParcial(false);
                  setDevolucaoQuantidades([]);
                }}
              >
                Concluir Devolução
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* AlertDialog: Confirmar Devolução Total */}
      <AlertDialog open={confirmTotalOpen} onOpenChange={setConfirmTotalOpen}>
        <AlertDialogContent className="bg-card border-primary/30 border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-widest text-amber-500">Confirmar Devolução Total</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium italic">
              Esta ação devolverá TODOS os itens restantes do pedido ao estoque. Você tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmTotalOpen(false)} className="font-bold">Voltar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest"
              onClick={() => {
                const pedido = pedidos.find(p => p.id === devolucaoPedidoId);
                if (pedido) {
                  const qs = pedido.itens.map(it => Math.max(0, Number(it.quantidade || 0) - Number(it.devolvido || 0)));
                  applyDevolucaoEstoqueParcial(pedido, qs);
                }
                setConfirmTotalOpen(false);
                setDevolucaoPedidoId(null);
                setDevolucaoParcial(false);
                setDevolucaoQuantidades([]);
              }}
            >
              Sim, Devolver Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersTab;
