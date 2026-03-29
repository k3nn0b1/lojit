import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { 
  Pencil, Check, X, MessageCircle, UserPlus, Users, Search, 
  Trash2, ShoppingCart, TrendingUp, Crown, Gem, Trophy, Award, History, Info
} from "lucide-react";
import { normalizePhone, formatPhoneMask, parseSupabaseError, formatBRL } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Pedido } from "@/lib/types";

interface CustomersTabProps {
  tenantId: string;
  IS_SUPABASE_READY: boolean;
  pedidos: Pedido[];
}

const CustomersTab = ({ tenantId, IS_SUPABASE_READY, pedidos }: CustomersTabProps) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientesQuery, setClientesQuery] = useState("");
  const [filterProfile, setFilterProfile] = useState("todos");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [editingClienteId, setEditingClienteId] = useState<number | null>(null);
  const [editingClienteNome, setEditingClienteNome] = useState("");
  const [editingClienteTelefone, setEditingClienteTelefone] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!IS_SUPABASE_READY || !tenantId) return;
    
    const fetchClientes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (!error && data) setClientes(data);
      setLoading(false);
    };
    
    void fetchClientes();
  }, [IS_SUPABASE_READY, tenantId]);

  // CRM: Calcular estatísticas do cliente a partir dos pedidos
  const customerStats = useMemo(() => {
    const stats: Record<string, { count: number; spent: number; lastOrder: string | null }> = {};
    
    pedidos.forEach((p) => {
      const tel = normalizePhone(p.cliente_telefone);
      if (!stats[tel]) {
        stats[tel] = { count: 0, spent: 0, lastOrder: p.data_criacao };
      }
      stats[tel].count += 1;
      stats[tel].spent += Number(p.valor_total);
      
      if (new Date(p.data_criacao) > new Date(stats[tel].lastOrder || 0)) {
        stats[tel].lastOrder = p.data_criacao;
      }
    });

    return stats;
  }, [pedidos]);

  const getClientRank = (count: number) => {
    if (count >= 10) return { label: "Diamante", color: "bg-cyan-500", icon: <Gem className="w-3 h-3 mr-1" /> };
    if (count >= 5) return { label: "Ouro", color: "bg-yellow-500", icon: <Crown className="w-3 h-3 mr-1" /> };
    if (count >= 2) return { label: "Prata", color: "bg-slate-400", icon: <Trophy className="w-3 h-3 mr-1" /> };
    if (count === 1) return { label: "Bronze", color: "bg-orange-600", icon: <Award className="w-3 h-3 mr-1" /> };
    return { label: "Recém-Chegado", color: "bg-muted", icon: <UserPlus className="w-3 h-3 mr-1" /> };
  };

  const clientesFiltered = clientes.filter((c) => {
    const term = clientesQuery.toLowerCase().trim();
    const matchesSearch = term === "" || c.nome?.toLowerCase().includes(term) || String(c.telefone || "").toLowerCase().includes(term);
    
    // Filtro por Perfil CRM
    const stats = customerStats[normalizePhone(c.telefone)] || { count: 0, spent: 0 };
    let matchesProfile = true;
    
    if (filterProfile === "diamante") matchesProfile = stats.count >= 10;
    else if (filterProfile === "ouro") matchesProfile = stats.count >= 5 && stats.count < 10;
    else if (filterProfile === "prata") matchesProfile = stats.count >= 2 && stats.count < 5;
    else if (filterProfile === "bronze") matchesProfile = stats.count === 1;
    else if (filterProfile === "novo") matchesProfile = stats.count === 0;

    return matchesSearch && matchesProfile;
  });

  const totalPages = Math.max(1, Math.ceil(clientesFiltered.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const visibleClientes = clientesFiltered.slice(startIndex, startIndex + pageSize);

  const handleAddCliente = async () => {
    const nome = clienteNome.trim();
    const telRaw = normalizePhone(clienteTelefone.trim());
    
    if (!nome || telRaw.length < 10) {
      toast.error("Preencha nome e telefone válidos");
      return;
    }

    try {
      const { error } = await supabase
        .from("clientes")
        .insert({ nome, telefone: telRaw, tenant_id: tenantId });
      if (error) throw error;

      toast.success("Cliente cadastrado com sucesso!");
      setClienteNome("");
      setClienteTelefone("");
      
      // Update local list
      const fetchClientes = async () => {
        const { data } = await supabase
          .from("clientes")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });
        if (data) setClientes(data);
      };
      void fetchClientes();
    } catch (e: any) {
      toast.error("Erro ao cadastrar", { description: parseSupabaseError(e) });
    }
  };

  const handleSaveEdit = async (id: number) => {
    const nome = editingClienteNome.trim();
    const telRaw = normalizePhone(editingClienteTelefone.trim());

    if (!nome || telRaw.length < 10) {
      toast.error("Dados inválidos");
      return;
    }

    try {
      const { error } = await supabase
        .from("clientes")
        .update({ nome, telefone: telRaw })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      toast.success("Dados atualizados");
      setClientes(prev => prev.map(c => c.id === id ? { ...c, nome, telefone: telRaw } : c));
      setEditingClienteId(null);
    } catch (e: any) {
      toast.error("Erro ao atualizar");
    }
  };

  const handleRemoveCliente = async (id: number) => {
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      setClientes(prev => prev.filter(c => c.id !== id));
      toast.success("Cliente removido");
    } catch (e: any) {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-2xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <Users className="w-8 h-8" /> Mini CRM Elite
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60 mt-1">Gestão inteligente e fidelização de clientes</p>
            </div>
            <div className="flex items-center gap-2 bg-background/40 p-2 rounded-2xl border border-primary/5">
                <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/10 text-[10px] font-black uppercase text-muted-foreground flex flex-col items-center justify-center min-w-[80px]">
                  <span className="opacity-50">Clientes</span>
                  <span className="text-primary">{clientes.length}</span>
                </Badge>
                <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/10 text-[10px] font-black uppercase text-muted-foreground flex flex-col items-center justify-center min-w-[80px]">
                  <span className="opacity-50">Pedidos</span>
                  <span className="text-primary">{pedidos.length}</span>
                </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-10 space-y-12">
          {/* Quick Add Bar */}
          <div className="relative group overflow-hidden">
            <div className="absolute inset-0 bg-primary/10 blur-[50px] opacity-20 -z-10 transition-all group-hover:opacity-40" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 bg-muted/10 p-4 md:p-6 rounded-[2rem] border border-primary/5">
              <div className="md:col-span-5 space-y-1.5">
                 <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary ml-2">Identificação do Cliente</Label>
                 <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Ex: João da Silva Sauro" className="h-12 bg-background/50 border-primary/10 uppercase font-black text-xs px-5 rounded-xl" />
              </div>
              <div className="md:col-span-4 space-y-1.5">
                 <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary ml-2">Canal de Contato (WhatsApp)</Label>
                 <Input value={clienteTelefone} onChange={(e) => setClienteTelefone(formatPhoneMask(e.target.value))} placeholder="(75) 90000-0000" className="h-12 bg-background/50 border-primary/10 font-black text-xs px-5 rounded-xl" />
              </div>
              <div className="md:col-span-3 flex items-end">
                 <Button onClick={handleAddCliente} className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                   <UserPlus className="w-4 h-4 mr-2" /> Cadastrar Novo
                 </Button>
              </div>
            </div>
          </div>

          {/* Mini CRM Controls */}
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  <div className="relative w-full md:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <Input
                          value={clientesQuery}
                          onChange={(e) => { setClientesQuery(e.target.value); setCurrentPage(1); }}
                          placeholder="Buscar por nome ou número..."
                          className="h-12 bg-muted/20 border-primary/10 rounded-2xl pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:ring-primary/20"
                      />
                  </div>
                  
                  <Select value={filterProfile} onValueChange={(val) => { setFilterProfile(val); setCurrentPage(1); }}>
                    <SelectTrigger className="h-12 rounded-2xl border-primary/10 bg-muted/20 w-full md:w-56 font-black uppercase text-[10px] tracking-widest text-primary">
                      <SelectValue placeholder="Perfil de Fidelidade" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/20 rounded-xl">
                      <SelectItem value="todos" className="text-[10px] font-black uppercase">Todos os Clientes</SelectItem>
                      <SelectItem value="diamante" className="text-[10px] font-black uppercase">💎 Diamante (10+ pedidos)</SelectItem>
                      <SelectItem value="ouro" className="text-[10px] font-black uppercase">🥇 Ouro (5+ pedidos)</SelectItem>
                      <SelectItem value="prata" className="text-[10px] font-black uppercase">🥈 Prata (2+ pedidos)</SelectItem>
                      <SelectItem value="bronze" className="text-[10px] font-black uppercase">🥉 Bronze (1 pedido)</SelectItem>
                      <SelectItem value="novo" className="text-[10px] font-black uppercase">❄️ Novos / Potenciais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-4 bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10">
                   <Info className="w-4 h-4 text-primary opacity-60" />
                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mostrando <span className="text-primary">{clientesFiltered.length}</span> resultados filtrados</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleClientes.map((c) => {
                const tel = normalizePhone(c.telefone);
                const stats = customerStats[tel] || { count: 0, spent: 0, lastOrder: null };
                const rank = getClientRank(stats.count);
                const clientOrders = pedidos.filter(p => normalizePhone(p.cliente_telefone) === tel);

                return (
                  <div key={c.id} className="group relative rounded-[2.5rem] border border-primary/10 bg-muted/5 p-8 hover:border-primary shadow-xl shadow-primary/[0.02] hover:shadow-primary/5 transition-all duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] -z-10 group-hover:bg-primary/15 transition-all duration-500" />
                    
                    {editingClienteId === c.id ? (
                      <div className="space-y-6 animate-in zoom-in duration-300">
                           <div className="space-y-4">
                               <div className="space-y-1">
                                 <Label className="text-[9px] font-black uppercase ml-1 opacity-60">Nome</Label>
                                 <Input value={editingClienteNome} onChange={(e) => setEditingClienteNome(e.target.value)} className="h-11 text-xs font-black uppercase rounded-xl border-primary/20" />
                               </div>
                               <div className="space-y-1">
                                 <Label className="text-[9px] font-black uppercase ml-1 opacity-60">WhatsApp</Label>
                                 <Input value={editingClienteTelefone} onChange={(e) => setEditingClienteTelefone(formatPhoneMask(e.target.value))} className="h-11 text-xs font-mono rounded-xl border-primary/20" />
                               </div>
                           </div>
                           <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleSaveEdit(c.id)} className="flex-1 h-11 rounded-xl bg-primary/10 text-primary font-black uppercase text-[10px] hover:bg-primary hover:text-black">
                                  <Check className="w-4 h-4 mr-2" /> Salvar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingClienteId(null)} className="flex-1 h-11 rounded-xl bg-destructive/5 text-destructive font-black uppercase text-[10px] hover:bg-destructive hover:text-white">
                                  <X className="w-4 h-4 mr-2" /> Cancelar
                              </Button>
                           </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${rank.color} text-white shadow-xl rotate-3 group-hover:rotate-0`}>
                                {rank.icon || <Users className="w-7 h-7" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h4 className="font-black text-base uppercase truncate leading-tight group-hover:text-primary transition-colors">{c.nome}</h4>
                                  <p className="text-[10px] font-black text-muted-foreground opacity-60 tracking-widest">{formatPhoneMask(c.telefone)}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                               <Badge className={`${rank.color} text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md shadow-lg shadow-black/20`}>
                                  {rank.label}
                               </Badge>
                               {stats.count > 0 && (
                                 <span className="text-[8px] font-black opacity-30 italic">Nível {stats.count}</span>
                               )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                             <div className="bg-background/40 p-4 rounded-2xl border border-primary/5 flex flex-col gap-1 items-center justify-center">
                                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1 opacity-50">Total Compras</span>
                                <div className="flex items-center gap-2">
                                   <ShoppingCart className="w-3 h-3 text-primary" />
                                   <span className="text-sm font-black text-primary">{stats.count}</span>
                                </div>
                             </div>
                             <div className="bg-background/40 p-4 rounded-2xl border border-primary/5 flex flex-col gap-1 items-center justify-center">
                                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1 opacity-50">Valor Total</span>
                                <div className="flex items-center gap-2">
                                   <TrendingUp className="w-3 h-3 text-green-500" />
                                   <span className="text-sm font-black text-green-500">{formatBRL(stats.spent)}</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 h-12 rounded-2xl border-primary/10 hover:bg-primary/20 hover:text-primary font-black uppercase text-[9px] tracking-widest shadow-inner group-hover:border-primary/30"
                                >
                                  <History className="w-3.5 h-3.5 mr-2" /> Histórico
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="right" className="bg-card w-full sm:max-w-xl border-l border-primary/10 p-0 overflow-hidden rounded-l-[3rem] p-0">
                                <SheetHeader className="bg-primary/5 p-10 border-b border-primary/5">
                                  <div className="flex items-center gap-6">
                                     <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${rank.color} text-white shadow-2xl`}>
                                        {rank.icon}
                                     </div>
                                     <div>
                                        <div className="flex items-center gap-3">
                                          <SheetTitle className="text-2xl font-black uppercase tracking-tight text-primary">{c.nome}</SheetTitle>
                                          <Badge className={`${rank.color} text-[9px] font-black uppercase`}>{rank.label}</Badge>
                                        </div>
                                        <p className="text-xs font-mono text-muted-foreground mt-1 opacity-60">{formatPhoneMask(c.telefone)}</p>
                                     </div>
                                  </div>
                                </SheetHeader>
                                <div className="p-10 space-y-8 overflow-y-auto h-[calc(100vh-160px)] custom-scrollbar">
                                   <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-muted/10 p-6 rounded-[1.5rem] border border-primary/5">
                                         <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 opacity-50">Volume de Compras</p>
                                         <p className="text-2xl font-black">{stats.count} <span className="text-xs font-medium text-muted-foreground">pedidos</span></p>
                                      </div>
                                      <div className="bg-muted/10 p-6 rounded-[1.5rem] border border-primary/5">
                                         <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 opacity-50">Investimento Total</p>
                                         <p className="text-2xl font-black text-green-500">{formatBRL(stats.spent)}</p>
                                      </div>
                                   </div>

                                   <div className="space-y-4">
                                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                         <ShoppingCart className="w-4 h-4" /> Cronologia de Pedidos
                                      </h5>
                                      {clientOrders.length === 0 ? (
                                        <div className="py-20 text-center opacity-20 text-xs font-black uppercase italic">Nenhum pedido registrado para este cliente</div>
                                      ) : (
                                        <div className="space-y-4">
                                          {clientOrders.map((p, idx) => (
                                            <div key={p.id} className="relative pl-6 border-l border-primary/10 group/item">
                                               <div className="absolute left-[-5px] top-6 w-2.5 h-2.5 rounded-full bg-primary border-4 border-background" />
                                               <div className="bg-muted/5 border border-primary/5 rounded-2xl p-6 hover:border-primary/20 transition-all">
                                                  <div className="flex justify-between items-start mb-4">
                                                     <div>
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Pedido #{idx + 1}</p>
                                                        <p className="text-xs font-black opacity-40">{new Date(p.data_criacao).toLocaleDateString()}</p>
                                                     </div>
                                                     <Badge className="text-[8px] font-black uppercase">{p.status}</Badge>
                                                  </div>
                                                  <div className="space-y-2">
                                                     {Array.isArray(p.itens) && p.itens.map((item: any, i: number) => (
                                                       <p key={i} className="text-[11px] font-medium flex justify-between">
                                                          <span>{item.quantidade}x {item.produto} {item.tamanho ? `(${item.tamanho})` : ""}</span>
                                                          <span className="font-black text-muted-foreground">{formatBRL(item.preco_unitario * item.quantidade)}</span>
                                                       </p>
                                                     ))}
                                                  </div>
                                                  <div className="mt-4 pt-4 border-t border-primary/5 flex justify-between items-center">
                                                     <span className="text-[10px] font-black uppercase text-muted-foreground">Total do Pedido</span>
                                                     <span className="text-sm font-black text-primary">{formatBRL(Number(p.valor_total))}</span>
                                                  </div>
                                               </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                   </div>
                                </div>
                              </SheetContent>
                            </Sheet>
                            
                            <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-12 w-12 rounded-2xl bg-primary/5 hover:bg-primary/10 hover:text-primary transition-all"
                                  onClick={() => { setEditingClienteId(c.id); setEditingClienteNome(c.nome); setEditingClienteTelefone(c.telefone); }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-destructive/5 hover:bg-destructive hover:text-white transition-all text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-card border-primary/20 rounded-[3rem] p-10">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Excluir Perfil?</AlertDialogTitle>
                                      <AlertDialogDescription className="text-base font-medium opacity-80 py-4">
                                        Ao remover o cliente <span className="text-primary font-black">"{c.nome}"</span>, você perderá todas as métricas de fidelidade e histórico de contato associados a este número.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-6 gap-3">
                                      <AlertDialogCancel className="rounded-[1.5rem] border-primary/10 px-8 h-12 uppercase font-black text-[10px] tracking-widest">Voltar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleRemoveCliente(c.id)} className="bg-destructive hover:bg-destructive/90 rounded-[1.5rem] px-8 h-12 font-black uppercase text-[10px] tracking-widest text-white">Remover Permanentemente</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </div>
                          </div>

                          <Button 
                            variant="ghost" 
                            className="w-full h-12 rounded-2xl bg-green-500/5 hover:bg-green-500/10 text-green-500 font-black uppercase text-[9px] tracking-[0.2em] border border-green-500/0 hover:border-green-500/20"
                            onClick={() => window.open(`https://wa.me/55${normalizePhone(c.telefone)}`, '_blank')}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" /> Iniciar Remarketing
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {visibleClientes.length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                   <Users className="w-16 h-16" />
                   <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhum cliente encontrado neste perfil.</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-16">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage <= 1} 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                      className="rounded-2xl px-6 h-12 border-primary/10 font-black uppercase text-[10px] tracking-widest hover:bg-primary/10"
                    >
                      Anterior
                    </Button>
                    <div className="px-8 h-12 flex items-center justify-center bg-primary/10 rounded-2xl text-primary font-black text-xs shadow-inner">
                        {currentPage} / {totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage >= totalPages} 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                      className="rounded-2xl px-6 h-12 border-primary/10 font-black uppercase text-[10px] tracking-widest hover:bg-primary/10"
                    >
                      Próxima
                    </Button>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersTab;
