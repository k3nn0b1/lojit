import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { 
  Pencil, Check, X, MessageCircle, UserPlus, Users, Search, 
  Trash2, ShoppingCart, TrendingUp, Gem, Trophy, Award, History, Info, Filter, Star, Phone, ArrowRight, Loader2
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
  const [adding, setAdding] = useState(false);

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

  const customerStats = useMemo(() => {
    const stats: Record<string, { count: number; spent: number; lastOrder: string | null }> = {};
    pedidos.forEach((p) => {
      if (p.status !== 'concluido') return;
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
    if (count >= 10) return { label: "Diamante", color: "bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/20", icon: <Gem className="w-4 h-4" /> };
    if (count >= 5) return { label: "Ouro", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: <Star className="w-4 h-4" /> };
    if (count >= 2) return { label: "Prata", color: "bg-slate-400/10 text-slate-400 border-slate-400/20", icon: <Trophy className="w-4 h-4" /> };
    if (count === 1) return { label: "Bronze", color: "bg-orange-600/10 text-orange-600 border-orange-600/20", icon: <Award className="w-4 h-4" /> };
    return { label: "New Entry", color: "bg-muted/10 text-muted-foreground border-muted-foreground/20", icon: <UserPlus className="w-4 h-4" /> };
  };

  const clientesFiltered = clientes.filter((c) => {
    const term = clientesQuery.toLowerCase().trim();
    const matchesSearch = term === "" || c.nome?.toLowerCase().includes(term) || String(c.telefone || "").toLowerCase().includes(term);
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
    const nome = clienteNome.trim().toUpperCase();
    const telRaw = normalizePhone(clienteTelefone.trim());
    if (!nome || telRaw.length < 10) {
      toast.error("Preencha nome e telefone válidos");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("clientes").insert({ nome, telefone: telRaw, tenant_id: tenantId });
      if (error) throw error;
      toast.success("Perfil sincronizado com sucesso!");
      setClienteNome("");
      setClienteTelefone("");
      const { data } = await supabase.from("clientes").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (data) setClientes(data);
    } catch (e: any) {
      toast.error("Erro ao cadastrar", { description: parseSupabaseError(e) });
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    const nome = editingClienteNome.trim().toUpperCase();
    const telRaw = normalizePhone(editingClienteTelefone.trim());
    if (!nome || telRaw.length < 10) {
      toast.error("Dados inválidos");
      return;
    }
    try {
      const { error } = await supabase.from("clientes").update({ nome, telefone: telRaw }).eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      toast.success("Atualização efetuada");
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
      toast.success("Registro removido");
    } catch (e: any) {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-3xl rounded-[3rem]">
        <CardHeader className="bg-primary/5 py-10 border-b border-primary/10 px-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-6">
                 <Users className="w-10 h-10" /> PROTOCOLO CRM
              </CardTitle>
              <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.3em] opacity-40">Engenharia de retenção e inteligência de mercado</p>
            </div>
            <div className="flex items-center gap-4 bg-background/30 p-3 rounded-[2rem] border border-primary/10 shadow-inner">
                <div className="flex flex-col items-center px-6 border-r border-primary/10">
                   <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">DATABASE</span>
                   <span className="text-xl font-black text-primary">{clientes.length}</span>
                </div>
                <div className="flex flex-col items-center px-6">
                   <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">CONVERSOES</span>
                   <span className="text-xl font-black text-green-500">{pedidos.filter(p => p.status === 'concluido').length}</span>
                </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-12 space-y-14">
          <div className="relative group p-1 bg-gradient-to-br from-primary/10 to-transparent rounded-[2.5rem] shadow-3xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-muted/10 p-10 rounded-[2.4rem] border border-primary/5 backdrop-blur-3xl relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -z-10 group-hover:scale-110 transition-transform" />
              <div className="lg:col-span-5 space-y-4">
                 <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2">Identificação Nominal</Label>
                 <div className="relative">
                    <Users className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-30" />
                    <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="EX: JOHN CONNOR..." className="h-16 bg-background/50 border-primary/5 uppercase font-black text-sm pl-16 rounded-2xl shadow-2xl focus:ring-primary/20" />
                 </div>
              </div>
              <div className="lg:col-span-4 space-y-4">
                 <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2">Canais de Contato</Label>
                 <div className="relative">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-30" />
                    <Input value={clienteTelefone} onChange={(e) => setClienteTelefone(formatPhoneMask(e.target.value))} placeholder="(00) 00000-0000" className="h-16 bg-background/50 border-primary/5 font-black text-sm pl-16 rounded-2xl shadow-2xl focus:ring-primary/20" />
                 </div>
              </div>
              <div className="lg:col-span-3 flex items-end">
                 <Button onClick={handleAddCliente} disabled={adding} className="w-full h-16 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.05] active:scale-95 flex items-center justify-center gap-4">
                   {adding ? <Loader2 className="w-6 h-6 animate-spin" /> : <><UserPlus className="w-6 h-6" /> SINCRONIZAR</>}
                 </Button>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 flex-1 max-w-4xl">
                  <div className="relative flex-1 group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                      <Input
                          value={clientesQuery}
                          onChange={(e) => { setClientesQuery(e.target.value); setCurrentPage(1); }}
                          placeholder="FILTRAR POR ID OU NOME MASTER..."
                          className="h-14 bg-muted/10 border-primary/5 rounded-2xl pl-16 pr-8 text-[11px] font-black uppercase tracking-widest focus:ring-primary/20 shadow-inner group-hover:bg-muted/20 transition-all"
                      />
                  </div>
                  <Select value={filterProfile} onValueChange={(val) => { setFilterProfile(val); setCurrentPage(1); }}>
                    <SelectTrigger className="h-14 rounded-2xl border-primary/5 bg-muted/10 w-full md:w-64 font-black uppercase text-[10px] tracking-[0.2em] text-primary shadow-inner">
                      <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 opacity-50" />
                        <SelectValue placeholder="SEGMENTAÇÃO RFM" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/20 rounded-2xl overflow-hidden p-2">
                      <SelectItem value="todos" className="text-[10px] font-black uppercase py-4">Status: Todos</SelectItem>
                      <SelectItem value="diamante" className="text-[10px] font-black uppercase py-4">💎 Elite Diamante (10+)</SelectItem>
                      <SelectItem value="ouro" className="text-[10px] font-black uppercase py-4">🥇 Patente Ouro (5+)</SelectItem>
                      <SelectItem value="prata" className="text-[10px] font-black uppercase py-4">🥈 Patente Prata (2+)</SelectItem>
                      <SelectItem value="bronze" className="text-[10px] font-black uppercase py-4">🥉 Patente Bronze (1)</SelectItem>
                      <SelectItem value="novo" className="text-[10px] font-black uppercase py-4">❄️ Fresh Entry (0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="hidden xl:flex items-center gap-4 bg-primary/5 px-8 py-4 rounded-3xl border border-primary/10">
                   <Info className="w-5 h-5 text-primary opacity-40 animate-pulse" />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Mostrando <span className="text-primary">{clientesFiltered.length}</span> perfis segmentados</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {visibleClientes.map((c) => {
                const tel = normalizePhone(c.telefone);
                const stats = customerStats[tel] || { count: 0, spent: 0, lastOrder: null };
                const rank = getClientRank(stats.count);
                const clientOrders = pedidos.filter(p => normalizePhone(p.cliente_telefone) === tel);

                return (
                  <div key={c.id} className="group relative rounded-[3.5rem] border border-primary/5 bg-muted/5 p-10 hover:border-primary/40 shadow-2xl transition-all duration-700 overflow-hidden flex flex-col gap-10">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[50px] -z-10 group-hover:bg-primary/10 transition-all duration-700" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 blur-[40px] -z-10" />
                    
                    {editingClienteId === c.id ? (
                      <div className="space-y-8 animate-in zoom-in duration-500 flex-1 flex flex-col justify-center">
                           <div className="space-y-6">
                               <div className="space-y-2">
                                 <Label className="text-[10px] font-black uppercase tracking-widest ml-2 opacity-40">NOME MASTER</Label>
                                 <Input value={editingClienteNome} onChange={(e) => setEditingClienteNome(e.target.value)} className="h-14 text-sm font-black uppercase rounded-2xl border-primary/10 bg-background/50" />
                               </div>
                               <div className="space-y-2">
                                 <Label className="text-[10px] font-black uppercase tracking-widest ml-2 opacity-40">PROTOCOLO CONTATO</Label>
                                 <Input value={editingClienteTelefone} onChange={(e) => setEditingClienteTelefone(formatPhoneMask(e.target.value))} className="h-14 text-sm font-black rounded-2xl border-primary/10 bg-background/50" />
                               </div>
                           </div>
                           <div className="flex gap-4">
                              <Button variant="ghost" onClick={() => handleSaveEdit(c.id)} className="flex-1 h-14 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-widest hover:opacity-90 shadow-xl shadow-primary/20">
                                  Validar
                              </Button>
                              <Button variant="ghost" onClick={() => setEditingClienteId(null)} className="flex-1 h-14 rounded-2xl bg-destructive/10 text-destructive font-black uppercase text-[10px] tracking-widest hover:bg-destructive hover:text-white">
                                  Sair
                              </Button>
                           </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-10 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-6">
                              <div className={`w-20 h-20 rounded-[2.5rem] border-2 border-white/5 flex items-center justify-center transition-all duration-700 ${rank.color} shadow-2xl group-hover:rotate-[360deg] group-hover:scale-90`}>
                                {rank.icon || <Users className="w-10 h-10" />}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                  <h4 className="font-black text-lg uppercase truncate leading-none group-hover:text-primary transition-colors tracking-tight">{c.nome}</h4>
                                  <p className="text-[11px] font-black text-muted-foreground opacity-40 tracking-[0.2em]">{formatPhoneMask(c.telefone)}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                               <Badge className={`${rank.color} border px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl`}>
                                  {rank.label}
                                </Badge>
                               {stats.count > 0 && (
                                 <span className="text-[9px] font-black text-primary opacity-40 uppercase tracking-widest italic">{stats.count}X LOYALTY</span>
                               )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                             <div className="bg-background/40 p-6 rounded-[2rem] border border-primary/5 flex flex-col gap-2 items-center justify-center shadow-inner group-hover:bg-primary/5 transition-colors">
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40">CONVERSOES</span>
                                <div className="flex items-center gap-3">
                                   <ShoppingCart className="w-4 h-4 text-primary" />
                                   <span className="text-xl font-black text-foreground">{stats.count}</span>
                                </div>
                             </div>
                             <div className="bg-background/40 p-6 rounded-[2rem] border border-primary/5 flex flex-col gap-2 items-center justify-center shadow-inner group-hover:bg-primary/5 transition-colors">
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-40">LTV TOTAL</span>
                                <div className="flex items-center gap-3">
                                   <TrendingUp className="w-4 h-4 text-green-500" />
                                   <span className="text-xl font-black text-green-500">{formatBRL(stats.spent)}</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex gap-4">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className="flex-1 h-14 rounded-2xl bg-muted/10 hover:bg-primary hover:text-black border border-primary/5 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl group-hover:border-primary/30 transition-all active:scale-95"
                                >
                                  <History className="w-4 h-4 mr-3" /> Historico
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="right" className="bg-card w-full sm:max-w-xl border-l border-primary/30 p-0 overflow-hidden rounded-l-[4rem] shadow-3xl">
                                <div className="bg-primary/5 p-16 border-b border-primary/10 relative">
                                   <div className="absolute top-0 right-0 w-64 h-full bg-primary/10 blur-[80px] -z-10" />
                                   <div className="flex items-center gap-10">
                                      <div className={`w-24 h-24 rounded-[2.5rem] border-4 border-white/10 flex items-center justify-center ${rank.color} shadow-3xl transform -rotate-6`}>
                                         {rank.icon}
                                      </div>
                                      <div className="space-y-2">
                                         <div className="flex items-center gap-6">
                                           <SheetTitle className="text-3xl font-black uppercase tracking-tighter text-foreground">{c.nome}</SheetTitle>
                                           <Badge className={`${rank.color} py-2 px-4 rounded-full text-[10px] font-black uppercase border`}>{rank.label}</Badge>
                                         </div>
                                         <p className="text-sm font-black text-primary uppercase tracking-[0.4em] opacity-60 italic">{formatPhoneMask(c.telefone)}</p>
                                      </div>
                                   </div>
                                </div>
                                <div className="p-16 space-y-12 overflow-y-auto h-[calc(100vh-210px)] custom-scrollbar">
                                   <div className="grid grid-cols-2 gap-8">
                                      <div className="bg-muted/10 p-8 rounded-[2.5rem] border border-primary/10 flex flex-col items-center justify-center text-center shadow-inner">
                                         <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4 opacity-40">MÉTRICA FREQUÊNCIA</p>
                                         <p className="text-4xl font-black">{stats.count} <span className="text-xs font-medium text-muted-foreground opacity-40">ORDERS</span></p>
                                      </div>
                                      <div className="bg-muted/10 p-8 rounded-[2.5rem] border border-primary/10 flex flex-col items-center justify-center text-center shadow-inner">
                                         <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4 opacity-40">CAPITAL INJETADO</p>
                                         <p className="text-3xl font-black text-green-500">{formatBRL(stats.spent)}</p>
                                      </div>
                                   </div>

                                   <div className="space-y-10">
                                      <h5 className="text-[12px] font-black uppercase tracking-[0.6em] text-primary flex items-center gap-6 opacity-60">
                                         <ShoppingCart className="w-6 h-6" /> TIMELINE OPERACIONAL
                                      </h5>
                                      {clientOrders.length === 0 ? (
                                        <div className="py-32 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.4em] italic">Database Empty: No records found</div>
                                      ) : (
                                        <div className="space-y-8 relative before:absolute before:inset-0 before:left-0 before:w-px before:bg-primary/10 before:ml-2">
                                          {clientOrders.map((p, idx) => (
                                            <div key={p.id} className="relative pl-12 group/item">
                                               <div className="absolute left-0 top-8 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-xl shadow-primary/20 transform -translate-x-2" />
                                               <div className="bg-muted/5 border border-primary/5 rounded-[2.5rem] p-10 hover:border-primary/40 transition-all shadow-xl hover:bg-muted/10">
                                                  <div className="flex justify-between items-start mb-8 border-b border-primary/5 pb-6">
                                                     <div>
                                                        <p className="text-[11px] font-black text-primary uppercase tracking-[0.4em]">REGISTRO #{idx + 1}</p>
                                                        <p className="text-xs font-black opacity-30 uppercase tracking-widest mt-1">{new Date(p.data_criacao).toLocaleDateString()}</p>
                                                     </div>
                                                     <Badge className="text-[9px] font-black uppercase px-4 py-1.5 rounded-full border border-primary/20 bg-background/50 shadow-inner">{p.status}</Badge>
                                                  </div>
                                                  <div className="space-y-4">
                                                     {Array.isArray(p.itens) && p.itens.map((item: any, i: number) => (
                                                       <div key={i} className="flex justify-between items-center group/prod">
                                                          <div className="flex items-center gap-4">
                                                             <Badge variant="outline" className="h-6 w-10 text-[8px] font-black rounded-lg border-primary/20 flex items-center justify-center">{item.tamanho || 'UNI'}</Badge>
                                                             <span className="text-[12px] font-black uppercase tracking-tight group-hover/prod:text-primary transition-colors">{item.quantidade}X {item.produto}</span>
                                                          </div>
                                                          <span className="font-mono text-[11px] font-black text-muted-foreground opacity-60">{formatBRL(item.preco_unitario * item.quantidade)}</span>
                                                       </div>
                                                     ))}
                                                  </div>
                                                  <div className="mt-8 pt-6 border-t border-primary/10 flex justify-between items-center">
                                                     <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-40">TOTAL LIQUIDADO</span>
                                                     <span className="text-xl font-black text-primary">{formatBRL(Number(p.valor_total))}</span>
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
                            
                            <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-14 w-14 rounded-2xl bg-primary/5 hover:bg-primary/20 hover:text-primary transition-all shadow-xl"
                                  onClick={() => { setEditingClienteId(c.id); setEditingClienteNome(c.nome); setEditingClienteTelefone(c.telefone); }}
                                >
                                  <Pencil className="w-5 h-5" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-destructive/5 hover:bg-destructive hover:text-white transition-all text-destructive shadow-xl">
                                      <Trash2 className="w-5 h-5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-card border-primary/40 rounded-[4rem] p-16 shadow-3xl text-center">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/10 blur-[80px] -z-10" />
                                    <AlertDialogHeader className="space-y-6">
                                      <div className="w-24 h-24 rounded-[3rem] bg-destructive/10 flex items-center justify-center text-destructive mx-auto shadow-2xl">
                                         <Trash2 className="w-10 h-10" />
                                      </div>
                                      <AlertDialogTitle className="text-4xl font-black uppercase text-destructive tracking-tighter">Deletar Registro?</AlertDialogTitle>
                                      <AlertDialogDescription className="text-lg font-medium opacity-60 leading-relaxed px-10">
                                        Confirmando a exclusão de <span className="text-foreground font-black">"{c.nome}"</span>, todos os dados históricos de fidelidade e score CRM serão permanentemente expurgados.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-12 gap-6 justify-center">
                                      <AlertDialogCancel className="rounded-[2rem] border-primary/10 px-12 h-16 uppercase font-black text-[12px] tracking-[0.3em] active:scale-95 transition-all">Abortar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleRemoveCliente(c.id)} className="bg-destructive hover:bg-destructive/90 rounded-[2rem] px-12 h-16 font-black uppercase text-[12px] tracking-[0.3em] text-white shadow-xl shadow-red-500/20 active:scale-95 transition-all">Sim, Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </div>
                          </div>

                          <Button 
                            variant="ghost" 
                            className="w-full h-16 rounded-[2rem] bg-green-500/5 hover:bg-green-500 text-green-500 hover:text-black font-black uppercase text-[11px] tracking-[0.3em] border border-green-500/10 hover:border-green-500/0 shadow-xl transition-all active:scale-95"
                            onClick={() => window.open(`https://wa.me/55${normalizePhone(c.telefone)}`, '_blank')}
                          >
                            <MessageCircle className="w-6 h-6 mr-3" /> Firing Remarketing
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {visibleClientes.length === 0 && (
                <div className="py-48 flex flex-col items-center justify-center text-center space-y-8 opacity-20">
                   <Users className="w-20 h-20 opacity-30 animate-pulse" />
                   <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-[0.6em]">Nenhum perfil detectado</p>
                      <p className="text-[10px] font-medium uppercase tracking-[0.4em]">Sincronize novos clientes para iniciar o CRM</p>
                   </div>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-6 pt-20">
                    <Button 
                      variant="outline" 
                      disabled={currentPage <= 1} 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                      className="rounded-2xl px-10 h-14 border-primary/10 font-black uppercase text-[11px] tracking-widest hover:bg-primary/20 hover:text-primary shadow-xl transition-all"
                    >
                      Anterior
                    </Button>
                    <div className="px-12 h-14 flex items-center justify-center bg-primary/10 rounded-2xl text-primary font-black text-sm shadow-inner border border-primary/5">
                        {currentPage} / {totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      disabled={currentPage >= totalPages} 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                      className="rounded-2xl px-10 h-14 border-primary/10 font-black uppercase text-[11px] tracking-widest hover:bg-primary/20 hover:text-primary shadow-xl transition-all"
                    >
                      Proxima
                    </Button>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="p-12 rounded-[3rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-12 text-primary shadow-3xl">
         <div className="hidden md:block">
            <TrendingUp className="w-14 h-14 opacity-30 animate-bounce-subtle" />
         </div>
         <div className="space-y-3 text-center md:text-left flex-1">
            <h5 className="text-[14px] font-black uppercase tracking-[0.4em] leading-relaxed">Ecossistema de Fidelização</h5>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] leading-relaxed opacity-60">
                O seu Mini CRM analisa automaticamente o comportamento de compra. Diamantes são seus melhores clientes (LTV alto), enquanto novos perfis precisam de cadências de remarketing agressivas. Utilize o botão de WhatsApp para disparar campanhas personalizadas baseadas no histórico de cada um.
            </p>
         </div>
      </div>
    </div>
  );
};

export default CustomersTab;
