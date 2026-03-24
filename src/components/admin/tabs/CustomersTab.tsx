import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, Check, X, MessageCircle, UserPlus, Users, Search, Trash2 } from "lucide-react";
import { normalizePhone, formatPhoneMask, parseSupabaseError } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";

interface CustomersTabProps {
  tenantId: string;
  IS_SUPABASE_READY: boolean;
}

const CustomersTab = ({ tenantId, IS_SUPABASE_READY }: CustomersTabProps) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientesQuery, setClientesQuery] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [editingClienteId, setEditingClienteId] = useState<number | null>(null);
  const [editingClienteNome, setEditingClienteNome] = useState("");
  const [editingClienteTelefone, setEditingClienteTelefone] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
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

    const channel = supabase
      .channel("clientes-realtime")
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setClientes(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setClientes(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
          } else if (payload.eventType === 'DELETE') {
            setClientes(prev => prev.filter(c => c.id !== payload.old.id));
          }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [IS_SUPABASE_READY, tenantId]);

  const clientesFiltered = clientes.filter((c) => {
    const term = clientesQuery.toLowerCase().trim();
    return term === "" || c.nome?.toLowerCase().includes(term) || String(c.telefone || "").toLowerCase().includes(term);
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
      setEditingClienteId(null);
    } catch (e: any) {
      toast.error("Erro ao atualizar");
    }
  };

  const handleRemoveCliente = async (id: number) => {
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      toast.success("Cliente removido");
    } catch (e: any) {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 py-6 border-b border-primary/10 px-8">
          <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
            <Users className="w-6 h-6" /> Gestão de Clientes
          </CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Base de dados e contatos da loja</p>
        </CardHeader>
        <CardContent className="p-4 md:p-8 space-y-10">
          {/* Form: Novo Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 bg-muted/10 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-primary/10 shadow-inner">
            <div className="md:col-span-5 space-y-1.5">
               <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nome Completo</Label>
               <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Ex: João Silva" className="h-12 bg-background border-primary/10" />
            </div>
            <div className="md:col-span-4 space-y-1.5">
               <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">WhatsApp / Celular</Label>
               <Input value={clienteTelefone} onChange={(e) => setClienteTelefone(formatPhoneMask(e.target.value))} placeholder="(00) 00000-0000" className="h-12 bg-background border-primary/10" />
            </div>
            <div className="md:col-span-3 flex items-end">
               <Button onClick={handleAddCliente} className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
                 <UserPlus className="w-4 h-4 mr-2" /> Cadastrar
               </Button>
            </div>
          </div>

          {/* Listagem e Busca */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={clientesQuery}
                        onChange={(e) => { setClientesQuery(e.target.value); setCurrentPage(1); }}
                        placeholder="Pesquisar cliente..."
                        className="h-10 bg-muted/20 border-primary/10 rounded-full pl-11 text-xs"
                    />
                </div>
                <Badge variant="outline" className="h-10 px-6 rounded-full border-primary/10 text-[10px] font-black uppercase text-muted-foreground">Total: {clientes.length} Clientes</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleClientes.map((c) => (
                <div key={c.id} className="group relative rounded-[2rem] border border-primary/10 bg-muted/10 p-6 hover:border-primary/40 transition-all hover:bg-muted/20 hover:shadow-2xl shadow-primary/5">
                  {editingClienteId === c.id ? (
                    <div className="space-y-4">
                         <div className="space-y-2">
                             <Input value={editingClienteNome} onChange={(e) => setEditingClienteNome(e.target.value)} className="h-10 text-xs font-black uppercase" />
                             <Input value={editingClienteTelefone} onChange={(e) => setEditingClienteTelefone(formatPhoneMask(e.target.value))} className="h-10 text-xs font-mono" />
                         </div>
                         <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleSaveEdit(c.id)} className="flex-1 h-9 rounded-xl hover:bg-green-500/10 hover:text-green-500">
                                <Check className="w-4 h-4 mr-2" /> Salvar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingClienteId(null)} className="flex-1 h-9 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                                <X className="w-4 h-4 mr-2" /> Cancelar
                            </Button>
                         </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5 group-hover:bg-primary group-hover:text-black transition-all">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm uppercase truncate tracking-tight">{c.nome}</h4>
                            <p className="text-[10px] font-mono text-muted-foreground tracking-widest">{formatPhoneMask(c.telefone)}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4 border-t border-primary/5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-9 rounded-xl border-primary/10 hover:bg-primary/10 hover:text-primary font-black uppercase text-[9px] tracking-widest"
                          onClick={() => window.open(`https://wa.me/55${normalizePhone(c.telefone)}`, '_blank')}
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-2" /> WhatsApp
                        </Button>
                        
                        <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary"
                              onClick={() => { setEditingClienteId(c.id); setEditingClienteNome(c.nome); setEditingClienteTelefone(c.telefone); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-primary/20 rounded-[2rem] p-8">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-xl font-black uppercase text-destructive">Remover Cliente?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm font-medium">
                                    Esta ação removerá "{c.nome}" e seu histórico de contatos permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-6 gap-3">
                                  <AlertDialogCancel className="rounded-xl border-primary/10">Voltar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveCliente(c.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px]">Confirmar Exclusão</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {visibleClientes.length === 0 && (
                <div className="py-20 text-center opacity-40 italic text-sm font-medium">Nenhum cliente cadastrado com este filtro.</div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-10">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="rounded-xl px-5 h-10 border-primary/10 font-black uppercase text-[10px]">Anterior</Button>
                    <div className="px-5 h-10 flex items-center justify-center bg-primary/10 rounded-xl text-primary font-black text-xs">
                        {currentPage} / {totalPages}
                    </div>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="rounded-xl px-5 h-10 border-primary/10 font-black uppercase text-[10px]">Próxima</Button>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersTab;
