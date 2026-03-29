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
import { Pedido, Cliente } from "@/lib/types";

interface CustomersTabProps {
  tenantId: string;
  IS_SUPABASE_READY: boolean;
  pedidos: Pedido[];
}

const CustomersTab = ({ tenantId, IS_SUPABASE_READY, pedidos }: CustomersTabProps) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesQuery, setClientesQuery] = useState("");
  const [filterProfile, setFilterProfile] = useState("todos");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [editingClienteId, setEditingClienteId] = useState<number | null>(null);
  const [editingClienteNome, setEditingClienteNome] = useState("");
  const [editingClienteTelefone, setEditingClienteTelefone] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
      if (!error && data) setClientes(data as Cliente[]);
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
    return { label: "Novo Cliente", color: "bg-muted/10 text-muted-foreground border-muted-foreground/20", icon: <UserPlus className="w-4 h-4" /> };
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
    <div className="space-y-6 animate-in fade-in slide-in-from-top-6 duration-700">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 shadow-2xl rounded-[1.5rem] md:rounded-[2rem] overflow-hidden">
        <CardContent className="p-4 md:p-8 space-y-8">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg md:text-xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">
                  <Users className="w-5 h-5 md:w-6 md:h-6" /> CRM de Clientes
                </CardTitle>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Histórico de compras e fidelização</p>
              </div>
              <Button 
                onClick={() => setAdding(true)}
                className="w-full md:w-auto h-12 px-6 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-primary/20 shadow-xl transition-all hover:scale-105"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Novo Cliente
              </Button>
           </div>

           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total', val: clientes.length, color: 'text-primary', icon: <Users className="w-3.5 h-3.5" /> },
              { label: 'Ativos', val: Object.keys(customerStats).length, color: 'text-green-500', icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { label: 'Elite', val: Object.values(customerStats).filter(s => s.count >= 10).length, color: 'text-[#00f2ff]', icon: <Gem className="w-3.5 h-3.5" /> },
              { label: 'Fiel', val: `${Math.round((Object.values(customerStats).filter(s => s.count > 1).length / (Object.keys(customerStats).length || 1)) * 100)}%`, color: 'text-amber-500', icon: <Star className="w-3.5 h-3.5" /> }
            ].map((stat) => (
               <div key={stat.label} className="bg-muted/5 p-4 rounded-2xl border border-primary/5 flex flex-col items-center justify-center text-center">
                  <div className="p-1.5 rounded-lg bg-primary/5 text-primary mb-1">{stat.icon}</div>
                  <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{stat.label}</span>
                  <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
               </div>
            ))}
           </div>

           {adding && (
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 animate-in zoom-in-95 duration-300 space-y-4">
                <div className="flex items-center justify-between mb-2">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-primary">Cadastrar Novo Perfil</h5>
                   <Button variant="ghost" size="sm" onClick={() => setAdding(false)} className="h-6 w-6 p-0 rounded-full"><X className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-40">Nome</Label>
                    <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="NOME DO CLIENTE" className="h-12 bg-background/50 border-primary/10 uppercase font-black text-[11px] rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-40">WhatsApp</Label>
                    <Input value={clienteTelefone} onChange={(e) => setClienteTelefone(formatPhoneMask(e.target.value))} placeholder="(00) 00000-0000" className="h-12 bg-background/50 border-primary/10 font-black text-[11px] rounded-xl" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddCliente} disabled={adding} className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl">
                      {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sincronizar"}
                    </Button>
                  </div>
                </div>
              </div>
           )}

           <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
              <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40" />
                  <Input
                      value={clientesQuery}
                      onChange={(e) => { setClientesQuery(e.target.value); setCurrentPage(1); }}
                      placeholder="BUSCAR POR NOME OU TELEFONE..."
                      className="h-12 bg-muted/10 border-primary/5 rounded-xl pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:ring-primary/20"
                  />
              </div>
              <Select value={filterProfile} onValueChange={(val) => { setFilterProfile(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-12 rounded-xl border-primary/5 bg-muted/10 w-full md:w-56 font-black uppercase text-[10px] tracking-widest text-primary">
                   <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 opacity-50" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/20 rounded-xl overflow-hidden p-1">
                  <SelectItem value="todos" className="text-[9px] font-black uppercase py-3">Todos</SelectItem>
                  <SelectItem value="diamante" className="text-[9px] font-black uppercase py-3">💎 Diamante (10+)</SelectItem>
                  <SelectItem value="ouro" className="text-[9px] font-black uppercase py-3">🥇 Ouro (5-9)</SelectItem>
                  <SelectItem value="prata" className="text-[9px] font-black uppercase py-3">🥈 Prata (2-4)</SelectItem>
                  <SelectItem value="bronze" className="text-[9px] font-black uppercase py-3">🥉 Bronze (1)</SelectItem>
                  <SelectItem value="novo" className="text-[9px] font-black uppercase py-3">❄️ Novo (0)</SelectItem>
                </SelectContent>
              </Select>
           </div>

            <div className="space-y-3">
              {visibleClientes.map((c: Cliente) => {
                const tel = normalizePhone(c.telefone);
                const stats = customerStats[tel] || { count: 0, spent: 0, lastOrder: null };
                const rank = getClientRank(stats.count);
                const clientOrders = pedidos.filter(p => normalizePhone(p.cliente_telefone) === tel);

                if (editingClienteId === c.id) {
                    return (
                        <div key={c.id} className="p-4 rounded-2xl bg-primary/5 border border-primary/20 animate-in slide-in-from-left-4 duration-300">
                             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                <div className="md:col-span-5">
                                   <Label className="text-[8px] font-black uppercase tracking-widest ml-1 opacity-40">NOME DO CLIENTE</Label>
                                   <Input value={editingClienteNome} onChange={(e) => setEditingClienteNome(e.target.value.toUpperCase())} className="h-10 text-[10px] font-black rounded-lg bg-background/50 border-primary/10" />
                                </div>
                                <div className="md:col-span-4">
                                   <Label className="text-[8px] font-black uppercase tracking-widest ml-1 opacity-40">TELEFONE</Label>
                                   <Input value={editingClienteTelefone} onChange={(e) => setEditingClienteTelefone(formatPhoneMask(e.target.value))} className="h-10 text-[10px] font-black rounded-lg bg-background/50 border-primary/10" />
                                </div>
                                <div className="md:col-span-3 flex gap-2 pt-4">
                                   <Button size="sm" onClick={() => c.id !== undefined && handleSaveEdit(c.id)} className="flex-1 bg-primary text-black font-black uppercase text-[8px] h-10 rounded-lg"><Check className="w-3.5 h-3.5 mr-1" /> Salvar</Button>
                                   <Button size="sm" variant="ghost" onClick={() => setEditingClienteId(null)} className="flex-1 bg-destructive/10 text-destructive font-black uppercase text-[8px] h-10 rounded-lg hover:bg-destructive hover:text-white"><X className="w-3.5 h-3.5" /></Button>
                                </div>
                             </div>
                        </div>
                    );
                }

                return (
                  <div key={c.id} className="group relative p-3 md:p-4 rounded-2xl bg-muted/5 border border-primary/5 hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center gap-4 md:gap-6 shadow-sm">
                    {/* Rank e Info Principal */}
                    <div className="flex items-center gap-4 min-w-[240px]">
                       <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center ${rank.color} border border-white/5 shadow-inner transition-transform group-hover:scale-105`}>
                          {rank.icon}
                       </div>
                       <div className="flex flex-col min-w-0">
                          <span className="font-black text-sm md:text-base uppercase tracking-tight truncate group-hover:text-primary transition-colors">{c.nome}</span>
                          <span className="text-[9px] md:text-[10px] font-black text-muted-foreground opacity-60 tracking-widest">{formatPhoneMask(c.telefone)}</span>
                       </div>
                    </div>

                    {/* Stats na Linha */}
                    <div className="flex items-center gap-6 md:gap-10 flex-1 md:justify-center border-y md:border-y-0 border-primary/5 py-3 md:py-0">
                       <div className="flex flex-col items-center">
                          <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 tracking-widest mb-1">Compras</span>
                          <div className="flex items-center gap-2">
                             <ShoppingCart className="w-3.5 h-3.5 text-primary opacity-60" />
                             <span className="text-xs font-black">{stats.count}</span>
                          </div>
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 tracking-widest mb-1">Total Gasto</span>
                          <div className="flex items-center gap-2">
                             <TrendingUp className="w-3.5 h-3.5 text-green-500 opacity-60" />
                             <span className="text-xs font-black text-green-500">{formatBRL(stats.spent)}</span>
                          </div>
                       </div>
                       <div className="hidden lg:flex flex-col items-center">
                          <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 tracking-widest mb-1">Patente</span>
                          <Badge className={`${rank.color} px-3 py-1 rounded-full text-[8px] font-black uppercase border-0 shadow-lg`}>
                            {rank.label}
                          </Badge>
                       </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-between md:justify-end gap-2 mt-1 md:mt-0">
                       <div className="flex items-center gap-1">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-muted/10 hover:bg-primary hover:text-black transition-all">
                                <History className="w-4 h-4" />
                              </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="bg-card w-full sm:max-w-xl border-l border-primary/20 p-0 overflow-hidden rounded-l-[2rem] md:rounded-l-[3rem] shadow-3xl">
                                <div className="bg-primary/5 p-8 md:p-12 border-b border-primary/10">
                                   <div className="flex items-center gap-6">
                                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center ${rank.color} shadow-xl border border-white/5`}>
                                         {rank.icon}
                                      </div>
                                      <div className="space-y-1">
                                         <SheetTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">{c.nome}</SheetTitle>
                                         <div className="flex items-center gap-2">
                                            <Badge className={`${rank.color} py-1 px-3 rounded-full text-[9px] font-black uppercase`}>{rank.label}</Badge>
                                            <span className="text-[10px] font-black text-muted-foreground tracking-widest">{formatPhoneMask(c.telefone)}</span>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                                <div className="p-8 md:p-12 space-y-8 overflow-y-auto h-[calc(100vh-160px)] custom-scrollbar">
                                   <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-muted/5 p-6 rounded-2xl border border-primary/5 text-center">
                                         <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-40">Pedidos Concluídos</p>
                                         <p className="text-2xl font-black">{stats.count}</p>
                                      </div>
                                      <div className="bg-muted/5 p-6 rounded-2xl border border-primary/5 text-center">
                                         <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-40">LTV Acumulado</p>
                                         <p className="text-2xl font-black text-green-500">{formatBRL(stats.spent)}</p>
                                      </div>
                                   </div>

                                   <div className="space-y-6">
                                      <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-3 opacity-60">
                                         <ShoppingCart className="w-4 h-4" /> Linha do Tempo
                                      </h5>
                                      {clientOrders.length === 0 ? (
                                        <div className="py-20 text-center opacity-20 text-[9px] font-black uppercase tracking-widest italic">Nenhum pedido finalizado</div>
                                      ) : (
                                        <div className="space-y-4">
                                          {clientOrders.map((p, idx) => (
                                            <div key={p.id} className="bg-muted/5 border border-primary/5 rounded-2xl p-6 hover:border-primary/20 transition-all">
                                               <div className="flex justify-between items-center mb-4 border-b border-primary/5 pb-3">
                                                  <div>
                                                     <p className="text-[9px] font-black text-primary uppercase tracking-widest">Pedido #{idx + 1}</p>
                                                     <p className="text-[8px] font-black opacity-30 uppercase tracking-widest">{new Date(p.data_criacao).toLocaleDateString()}</p>
                                                  </div>
                                                  <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-primary/20">{p.status}</Badge>
                                               </div>
                                               <div className="space-y-2">
                                                  {Array.isArray(p.itens) && p.itens.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center">
                                                       <span className="text-[10px] font-black uppercase opacity-80">{item.quantidade}x {item.produto} ({item.tamanho})</span>
                                                       <span className="text-[10px] font-black opacity-40">{formatBRL(item.preco_unitario * item.quantidade)}</span>
                                                    </div>
                                                  ))}
                                               </div>
                                               <div className="mt-4 pt-3 border-t border-primary/10 flex justify-between items-center">
                                                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-40">Subtotal</span>
                                                  <span className="text-base font-black text-primary">{formatBRL(Number(p.valor_total))}</span>
                                               </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                   </div>
                                </div>
                            </SheetContent>
                          </Sheet>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/5 hover:bg-primary/20 transition-all"
                            onClick={() => { if (c.id !== undefined) setEditingClienteId(c.id); setEditingClienteNome(c.nome); setEditingClienteTelefone(c.telefone); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-destructive/5 hover:bg-destructive hover:text-white transition-all text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-primary/40 rounded-[2rem] p-8 md:p-12 shadow-3xl text-center">
                              <AlertDialogHeader className="space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
                                   <Trash2 className="w-8 h-8" />
                                </div>
                                <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Excluir Registro?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium opacity-60">
                                  Isso removerá <span className="text-foreground font-black">"{c.nome}"</span> permanentemente da base de dados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-8 gap-3 justify-center">
                                <AlertDialogCancel className="rounded-xl border-primary/10 px-6 h-12 uppercase font-black text-[10px] tracking-widest flex-1">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => c.id !== undefined && handleRemoveCliente(c.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl px-6 h-12 font-black uppercase text-[10px] tracking-widest text-white flex-1">Confirmar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                       </div>

                       <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-10 md:h-12 px-4 rounded-xl bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-black font-black uppercase text-[9px] tracking-widest border border-green-500/20 transition-all flex items-center gap-2"
                          onClick={() => window.open(`https://wa.me/55${normalizePhone(c.telefone)}`, '_blank')}
                        >
                          <MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">WhatsApp</span>
                        </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {visibleClientes.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                   <Users className="w-12 h-12 opacity-30" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Nenhum cliente encontrado</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-8">
                    <Button 
                      variant="outline" 
                      disabled={currentPage <= 1} 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                      className="rounded-xl px-6 h-10 border-primary/10 font-black uppercase text-[9px] tracking-widest"
                    >
                      Anterior
                    </Button>
                    <div className="px-6 h-10 flex items-center justify-center bg-primary/10 rounded-xl text-primary font-black text-[10px] border border-primary/5">
                        {currentPage} / {totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      disabled={currentPage >= totalPages} 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                      className="rounded-xl px-6 h-10 border-primary/10 font-black uppercase text-[9px] tracking-widest"
                    >
                      Próxima
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
      
      <div className="p-8 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-6 text-primary shadow-lg">
         <Info className="w-5 h-5 mt-1 opacity-40 shrink-0" />
         <div className="space-y-2">
            <h5 className="text-[10px] font-black uppercase tracking-widest opacity-80">Sobre a Segmentação</h5>
            <p className="text-[9px] font-medium uppercase tracking-tight leading-relaxed opacity-60">
                Diamante (10+ pedidos), Ouro (5-9), Prata (2-4), Bronze (1). Clientes novos são aqueles sincronizados sem histórico de compra concluída. Use os filtros para identificar seus melhores clientes.
            </p>
         </div>
      </div>
    </div>
  );
};

export default CustomersTab;
