import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, X, Wallet, Search, Filter, Calendar, Hash, User, Phone, ShoppingBag, ArrowRight, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatBRL, rankSize, sortPedidos, parseSupabaseError, normalizePhone, formatPhoneMask } from "@/lib/utils";
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
        String(pedidoSeq[p.id] || "").includes(term) ||
        String(p.cliente_telefone || "").includes(term);
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

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'pendente': return { label: 'Pendente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'concluido': return { label: 'Concluído', color: 'bg-green-500/10 text-green-500 border-green-500/20' };
      case 'devolvido': return { label: 'Devolvido', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
      case 'parcialmente_devolvido': return { label: 'P. Devolvido', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
      case 'cancelado': return { label: 'Cancelado', color: 'bg-muted/10 text-muted-foreground border-muted-foreground/20' };
      default: return { label: status, color: 'bg-muted/10 text-muted-foreground' };
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 shadow-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-4 md:p-10">
          <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                  <ShoppingBag className="w-8 h-8" /> Gestão de Pedidos
                </CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Controle operacional e fluxo de caixa em tempo real</p>
              </div>
              <div className="flex items-center gap-3">
                  <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/10 text-[10px] font-black uppercase text-muted-foreground flex flex-col items-center justify-center min-w-[100px] bg-background/40">
                    <span className="opacity-50">Total</span>
                    <span className="text-primary">{pedidos.length}</span>
                  </Badge>
                  <Button
                    variant="ghost"
                    onClick={fetchPedidos}
                    disabled={refreshingOrders}
                    className={`h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/20 transition-all ${refreshingOrders ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <RefreshCw className={`w-5 h-5 text-primary ${refreshingOrders ? 'animate-spin' : ''}`} />
                  </Button>
              </div>
            </div>

          {/* Dashboard Superior Rápido */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
             {[
               { label: 'Hoje', val: pedidos.filter(p => new Date(p.data_criacao).toDateString() === new Date().toDateString()).length, color: 'text-primary' },
               { label: 'Pendentes', val: pedidos.filter(p => p.status === 'pendente').length, color: 'text-amber-500' },
               { label: 'Finalizados', val: pedidos.filter(p => p.status === 'concluido').length, color: 'text-green-500' },
               { label: 'Cancelados', val: pedidos.filter(p => p.status === 'cancelado').length, color: 'text-muted-foreground' }
             ].map((stat, i) => (
                <div key={i} className="bg-muted/10 p-5 rounded-3xl border border-primary/5 flex flex-col items-center justify-center group hover:bg-muted/20 transition-all">
                   <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">{stat.label}</span>
                   <span className={`text-2xl font-black ${stat.color}`}>{stat.val}</span>
                </div>
             ))}
          </div>

          {/* Filtros Premium */}
          <div className="relative group overflow-hidden">
             <div className="absolute inset-0 bg-primary/10 blur-[50px] opacity-10 -z-10" />
             <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 bg-muted/10 rounded-[2.5rem] border border-primary/5">
                <div className="flex-1 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60" />
                   <Input 
                     placeholder="BUSCAR CLIENTE, TELEFONE OU ID..." 
                     value={pedidoSearch}
                     onChange={(e) => { setPedidoSearch(e.target.value); setPedidoPage(1); }}
                     className="h-14 bg-background/50 border-primary/5 pl-14 pr-6 rounded-2xl uppercase font-black text-xs tracking-widest focus:ring-primary/20"
                   />
                </div>
                <div className="w-full md:w-[280px]">
                   <Select value={pedidoStatusFilter} onValueChange={(val) => { setPedidoStatusFilter(val); setPedidoPage(1); }}>
                     <SelectTrigger className="h-14 bg-background/50 border-primary/5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-primary px-6">
                        <div className="flex items-center gap-3">
                           <Filter className="w-3 h-3 opacity-60" />
                           <SelectValue placeholder="STATUS DO PEDIDO" />
                        </div>
                     </SelectTrigger>
                     <SelectContent className="bg-card border-primary/20 rounded-xl">
                        <SelectItem value="todos" className="text-[10px] font-black uppercase">Todos os Pedidos</SelectItem>
                        <SelectItem value="pendente" className="text-[10px] font-black uppercase">⏳ Pedidos Pendentes</SelectItem>
                        <SelectItem value="concluido" className="text-[10px] font-black uppercase">✅ Pedidos Concluídos</SelectItem>
                        <SelectItem value="cancelado" className="text-[10px] font-black uppercase">❌ Pedidos Cancelados</SelectItem>
                        <SelectItem value="devolvido" className="text-[10px] font-black uppercase">🔄 Pedidos Devolvidos</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
             </div>
          </div>

          {/* Listagem / Tabela */}
          <div className="space-y-6">
            {orderedPedidos.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                 <ShoppingBag className="w-16 h-16" />
                 <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhum pedido encontrado nos registros.</p>
              </div>
            ) : (
              <>
                {/* Cards para Mobile */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {visiblePedidos.map((p) => {
                    const status = getStatusInfo(p.status);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => setPedidoDetalhesId(p.id)}
                        className="p-6 rounded-[2rem] bg-muted/5 border border-primary/10 space-y-5 relative overflow-hidden active:scale-[0.98] transition-all hover:border-primary/40 shadow-xl"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[40px] -z-10" />
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-background/80 border border-primary/10 flex items-center justify-center font-black text-primary/40 text-sm shadow-inner group-hover:scale-110 transition-transform italic">
                              #{pedidoSeq[p.id] ?? '—'}
                            </div>
                            <div className="min-w-0">
                               <h4 className="font-black text-sm uppercase truncate leading-none mb-1">{p.cliente_nome}</h4>
                               <p className="text-[10px] font-black text-muted-foreground opacity-60 tracking-widest">{formatPhoneMask(p.cliente_telefone)}</p>
                            </div>
                          </div>
                          <Badge className={`${status.color} uppercase text-[7px] font-black border tracking-tighter`}>{status.label}</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-primary italic leading-none">{formatBRL(Number(p.valor_total || 0))}</span>
                              <span className="text-[8px] font-black text-muted-foreground opacity-30 uppercase tracking-widest mt-1">{new Date(p.data_criacao).toLocaleDateString()} · {new Date(p.data_criacao).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           </div>
                           <div className="flex gap-2">
                             {p.status === 'pendente' ? (
                               <>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-10 w-10 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black transition-all border border-green-500/10"
                                   onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: p.id, action: 'concluir' }); }}
                                 >
                                    <Check className="w-5 h-5" />
                                 </Button>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black transition-all border border-red-500/10"
                                   onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: p.id, action: 'cancelar' }); }}
                                 >
                                    <X className="w-5 h-5" />
                                 </Button>
                               </>
                             ) : (
                               <Button variant="ghost" className="h-10 px-4 rounded-xl bg-primary/5 text-[9px] font-black uppercase text-primary border border-primary/10 hover:bg-primary/20">DETALHES</Button>
                             )}
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tabela para Desktop */}
                <div className="hidden md:block overflow-hidden rounded-[2.5rem] border border-primary/10 bg-muted/5 shadow-2xl">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-primary/5 border-b border-primary/10">
                        <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Sequencial</th>
                        <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Data / Hora</th>
                        <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Cliente</th>
                        <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Total Pago</th>
                        <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Status</th>
                        <th className="px-8 py-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-primary">Ações Operacionais</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {visiblePedidos.map((p) => {
                        const status = getStatusInfo(p.status);
                        return (
                          <tr 
                            key={p.id} 
                            onClick={() => setPedidoDetalhesId(p.id)} 
                            className="hover:bg-primary/5 transition-all cursor-pointer group"
                          >
                            <td className="px-8 py-6 whitespace-nowrap">
                               <div className="w-10 h-10 rounded-xl bg-background/50 border border-primary/5 flex items-center justify-center font-black text-primary/40 text-xs">
                                  #{pedidoSeq[p.id] ?? '—'}
                               </div>
                            </td>
                            <td className="px-8 py-6 whitespace-nowrap">
                               <div className="flex flex-col">
                                  <span className="text-[11px] font-black uppercase">{new Date(p.data_criacao).toLocaleDateString()}</span>
                                  <span className="text-[9px] text-muted-foreground opacity-50 font-medium">{new Date(p.data_criacao).toLocaleTimeString()}</span>
                               </div>
                            </td>
                            <td className="px-8 py-6 whitespace-nowrap">
                               <div className="flex flex-col min-w-[200px]">
                                  <span className="font-black text-xs uppercase group-hover:text-primary transition-colors underline decoration-primary/0 group-hover:decoration-primary/30 transition-all">{p.cliente_nome}</span>
                                  <span className="text-[10px] text-muted-foreground font-medium">{formatPhoneMask(p.cliente_telefone)}</span>
                               </div>
                            </td>
                            <td className="px-8 py-6 whitespace-nowrap">
                               <span className="text-base font-black text-primary">{formatBRL(Number(p.valor_total || 0))}</span>
                            </td>
                            <td className="px-8 py-6 whitespace-nowrap">
                               <Badge className={`${status.color} border font-black uppercase text-[8px] tracking-widest px-3 py-1 rounded-lg shadow-sm`}>
                                  {status.label}
                               </Badge>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-3">
                                 {p.status === 'pendente' ? (
                                   <>
                                     <Button 
                                       className="h-10 bg-green-500 hover:bg-green-600 text-black font-black uppercase text-[9px] tracking-widest px-6 rounded-xl shadow-lg shadow-green-500/10"
                                       onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: p.id, action: 'concluir' }); }}
                                     >
                                       Concluir
                                     </Button>
                                     <Button 
                                       variant="destructive"
                                       className="h-10 font-black uppercase text-[9px] tracking-widest px-6 rounded-xl shadow-lg shadow-red-500/10"
                                       onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: p.id, action: 'cancelar' }); }}
                                     >
                                       Cancelar
                                     </Button>
                                   </>
                                 ) : (
                                   <Button 
                                     variant="outline" 
                                     className="h-10 rounded-xl bg-primary/5 hover:bg-primary/20 text-primary border-primary/10 font-black uppercase text-[9px] tracking-widest px-6"
                                   >
                                     <History className="w-3.5 h-3.5 mr-2" />
                                     Detalhes
                                   </Button>
                                 )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginação Premium */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                   <div className="flex items-center gap-4 bg-muted/10 px-6 py-2 rounded-2xl border border-primary/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exibir</span>
                      <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPedidoPage(1); }}>
                        <SelectTrigger className="h-8 w-20 bg-background/50 border-none font-black text-[10px] focus:ring-0">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-primary/10">
                           {[15, 30, 50].map(s => <SelectItem key={s} value={String(s)} className="text-[10px] font-black uppercase">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>

                   <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        disabled={pedidoPage <= 1} 
                        onClick={() => setPedidoPage(p => Math.max(1, p - 1))}
                        className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10"
                      >
                        Anterior
                      </Button>
                      <div className="flex items-center gap-1.5 p-1 bg-muted/20 rounded-2xl border border-primary/5">
                         {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = i + 1;
                            if (totalPages > 5 && pedidoPage > 3) pageNum = Math.min(pedidoPage - 2 + i, totalPages - 4 + i);
                            return (
                              <Button
                                key={pageNum}
                                variant={pedidoPage === pageNum ? "default" : "ghost"}
                                size="icon"
                                onClick={() => setPedidoPage(pageNum)}
                                className={`h-10 w-10 rounded-xl font-black text-xs ${pedidoPage === pageNum ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground/40 hover:text-primary'}`}
                              >
                                {pageNum}
                              </Button>
                            );
                         })}
                      </div>
                      <Button 
                        variant="ghost" 
                        disabled={pedidoPage >= totalPages} 
                        onClick={() => setPedidoPage(p => Math.min(totalPages, p + 1))}
                        className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/10"
                      >
                        Próxima
                      </Button>
                   </div>
                </div>
               </>
            )}
           </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Confirmar Ação (Concluir/Cancelar) */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => setConfirmAction(open ? confirmAction : null)}>
        <DialogContent className="bg-card text-foreground border-primary/30 max-w-lg rounded-[3rem] p-10 overflow-hidden shadow-3xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10" />
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-primary flex items-center gap-3">
              <Check className="w-6 h-6" /> Requisitar {confirmAction?.action === 'concluir' ? 'Baixa' : 'Estorno'}
            </DialogTitle>
            <DialogDescription className="text-base font-medium opacity-60">
              Revise a movimentação de estoque antes de confirmar esta operação de caixa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
            {(pedidos.find(p => p.id === confirmAction?.id)?.itens || []).map((it, idx) => {
              const prod = storedProducts.find(sp => sp.id === it.product_id);
              const estoqueAtual = Math.max(0, Number((prod?.stockBySize || {})[it.tamanho] || 0));
              const apos = confirmAction?.action === 'concluir' ? Math.max(0, estoqueAtual - Number(it.quantidade || 0)) : estoqueAtual;
              return (
                <div key={idx} className="flex items-center justify-between p-6 rounded-[1.5rem] bg-muted/10 border border-primary/5">
                  <div className="space-y-1">
                    <div className="text-sm font-black uppercase">{it.produto}</div>
                    <div className="flex items-center gap-2">
                       <Badge variant="outline" className="h-5 text-[8px] font-black border-primary/10">TAM {it.tamanho}</Badge>
                       <span className="text-[10px] font-black text-muted-foreground opacity-50 uppercase">Qtd: {it.quantidade}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-[8px] font-black uppercase tracking-widest opacity-30">Movimentação</div>
                    <div className="flex items-center gap-2 font-black text-sm">
                      <span className="opacity-40">{estoqueAtual}</span>
                      <ArrowRight className="w-3 h-3 text-primary" />
                      <span className={confirmAction?.action === 'concluir' ? 'text-primary' : 'text-green-500'}>{apos}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="mt-10 gap-3">
            <Button variant="ghost" onClick={() => setConfirmAction(null)} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest">Voltar</Button>
            <Button 
              className={`h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${confirmAction?.action === 'concluir' ? "bg-green-500 text-black hover:bg-green-600 shadow-green-500/20" : "bg-destructive text-white hover:bg-destructive shadow-red-500/20"}`}
              onClick={() => { if (confirmAction) handleConfirmAction(confirmAction.id, confirmAction.action); setConfirmAction(null); }}
            >
              {confirmAction?.action === 'concluir' ? 'Concluir Venda' : 'Cancelar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Pedido Premium (Estilo Sheet de CRM) */}
      <Dialog open={pedidoDetalhesId != null} onOpenChange={(open) => setPedidoDetalhesId(open ? pedidoDetalhesId : null)}>
        <DialogContent className="bg-card text-foreground border-primary/30 max-w-2xl max-h-[90vh] overflow-hidden rounded-[3rem] p-0 shadow-[0_0_100px_-20px_rgba(var(--primary),0.2)]">
          {(() => {
            const pedido = pedidos.find(p => p.id === pedidoDetalhesId);
            if (!pedido) return null;
            const status = getStatusInfo(pedido.status);
            return (
              <div className="flex flex-col h-full">
                <div className="bg-primary/5 p-10 border-b border-primary/10 relative">
                  <div className="absolute top-0 right-0 w-40 h-full bg-primary/5 blur-[50px] -z-10" />
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-background/50 border border-primary/10 flex items-center justify-center font-black text-primary text-2xl shadow-xl shadow-black/20 italic">
                      #{pedidoSeq[String(pedidoDetalhesId ?? '')] ?? '—'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                         <h2 className="text-2xl font-black uppercase tracking-tight">{pedido.cliente_nome}</h2>
                         <Badge className={`${status.color} uppercase text-[8px] font-black border`}>{status.label}</Badge>
                      </div>
                      <p className="text-sm font-black text-muted-foreground opacity-60 flex items-center gap-2 uppercase tracking-widest">
                        <Phone className="w-3.5 h-3.5 text-primary" /> {formatPhoneMask(pedido.cliente_telefone)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-muted/10 p-6 rounded-[2rem] border border-primary/5 space-y-6">
                       <div className="flex flex-col gap-1 items-center justify-center text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-50 mb-2">Total do Pedido</span>
                          <span className="text-3xl font-black text-primary">{formatBRL(pedido.valor_total)}</span>
                       </div>
                    </div>
                    <div className="bg-muted/10 p-6 rounded-[2rem] border border-primary/5 space-y-6">
                       <div className="flex flex-col gap-1 items-center justify-center text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-50 mb-2">Pagamento Via</span>
                           <div className="flex items-center gap-2 font-black uppercase text-sm">
                             <Wallet className="w-4 h-4 text-primary" />
                             {pedido.forma_pagamento || 'Não Inf.'}
                           </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">
                       <ShoppingBag className="w-4 h-4" /> Composição do Carrinho
                    </h5>
                    <div className="grid grid-cols-1 gap-4">
                      {pedido.itens.map((it, i) => (
                        <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-muted/5 border border-primary/5 hover:border-primary/20 transition-all group">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs italic group-hover:scale-110 transition-transform">
                              {it.tamanho}
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-black uppercase leading-tight">{it.produto}</h4>
                              {it.cor && <p className="text-[9px] text-muted-foreground font-black uppercase opacity-60">Variante: {it.cor}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="text-xs font-black uppercase opacity-40">x{it.quantidade}</div>
                             <div className="text-sm font-black text-primary">{formatBRL(it.preco_unitario * it.quantidade)}</div>
                             {Number(it.devolvido || 0) > 0 && (
                               <Badge variant="outline" className="text-[8px] bg-red-500/10 text-red-500 border-red-500/20 px-2 mt-1 font-black">ESTORNADO: {it.devolvido}</Badge>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {pedido.status === 'concluido' && (
                    <div className="pt-6 border-t border-primary/10">
                      <Button 
                        variant="ghost" 
                        className="w-full h-14 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white font-black uppercase tracking-widest text-[10px] transition-all border border-destructive/10"
                        onClick={() => handleOpenDevolucao(pedido)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Iniciar Protocolo de Devolução
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-8 border-t border-primary/5 bg-muted/5">
                   <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Registrado em {new Date(pedido.data_criacao).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog: Devolução de Pedido Premium */}
      {devolucaoPedidoId && (
        <Dialog open={!!devolucaoPedidoId} onOpenChange={(o) => { if (!o) { setDevolucaoPedidoId(null); setDevolucaoParcial(false); setDevolucaoQuantidades([]); } }}>
          <DialogContent className="bg-card text-foreground border-primary/30 max-w-lg rounded-[3rem] p-10 shadow-3xl">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-amber-500 flex items-center gap-3">
                 <RefreshCw className="w-6 h-6" /> Devolução de Estoque
              </DialogTitle>
              <DialogDescription className="text-base font-medium opacity-60">
                 Selecione os itens que estão retornando fisicamente para a sua prateleira.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8">
              <div className="flex p-1.5 bg-muted/10 rounded-2xl border border-primary/5">
                <Button 
                  variant="ghost"
                  onClick={() => setConfirmTotalOpen(true)}
                  className={`flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest ${!devolucaoParcial ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'opacity-40'}`}
                >
                  Devolução Total
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setDevolucaoParcial(true)}
                  className={`flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest ${devolucaoParcial ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'opacity-40'}`}
                >
                  Devolução Parcial
                </Button>
              </div>

              {devolucaoParcial && (
                <div className="space-y-4 max-h-[35vh] overflow-y-auto custom-scrollbar pr-2">
                  {(pedidos.find(p => p.id === devolucaoPedidoId)?.itens || []).map((it, idx) => {
                    const max = Math.max(0, Number(it.quantidade || 0) - Number(it.devolvido || 0));
                    return (
                      <div key={idx} className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-muted/10 border border-primary/5">
                        <div className="flex-1 space-y-1">
                          <h4 className="text-xs font-black uppercase leading-tight">{it.produto}</h4>
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="h-4 text-[7px] font-black border-primary/10">TAM {it.tamanho}</Badge>
                             <span className="text-[9px] font-black text-muted-foreground opacity-50 uppercase">Restante: {max}</span>
                          </div>
                        </div>
                        <Input 
                          type="number" 
                          min={0} 
                          max={max} 
                          value={devolucaoQuantidades[idx] ?? 0} 
                          className="w-20 h-10 bg-background/50 border-primary/10 text-center font-black rounded-xl"
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
            <DialogFooter className="mt-10 gap-3">
              <Button variant="ghost" onClick={() => { setDevolucaoPedidoId(null); setDevolucaoParcial(false); setDevolucaoQuantidades([]); }} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest">Desistir</Button>
              <Button 
                className="h-14 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
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
                Confirmar Devolução
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* AlertDialog: Confirmar Devolução Total Premium */}
      <AlertDialog open={confirmTotalOpen} onOpenChange={setConfirmTotalOpen}>
        <AlertDialogContent className="bg-card border-primary/30 rounded-[3rem] p-10 shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-amber-500">Protocolo de Devolução Total</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium opacity-60 py-4">
              Esta ação devolverá **TODOS** os itens desta venda para o estoque e atualizará o status do pedido para **"Devolvido"**. Deseja prosseguir com o estorno físico?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel onClick={() => setConfirmTotalOpen(false)} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest border-primary/10">Abortar</AlertDialogCancel>
            <AlertDialogAction 
              className="h-14 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-500/20"
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
              Sim, Estornar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersTab;
