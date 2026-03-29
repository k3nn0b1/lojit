import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, Trash2, Plus, Search, Wallet, Info, Loader2, ShieldCheck, Pencil, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FormaPagamento } from "@/lib/types";
import { Input } from "@/components/ui/input";

const PaymentTab = ({ tenantId }: { tenantId: string }) => {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFormaName, setNewFormaName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFormas();
  }, [tenantId]);

  const fetchFormas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("formas_pagamento")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    
    if (data) setFormas(data);
    setLoading(false);
  };

  const handleSave = async () => {
    const name = newFormaName.trim().toUpperCase();
    if (!name) return;
    setAdding(true);
    
    if (editingId) {
      // Editar existente
      const { error } = await supabase
        .from("formas_pagamento")
        .update({ name })
        .eq("id", editingId);

      if (error) {
        toast.error("Erro ao atualizar modalidade");
      } else {
        setFormas(prev => prev.map(f => f.id === editingId ? { ...f, name } : f).sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Modalidade atualizada!");
        cancelEdit();
      }
    } else {
      // Adicionar novo
      const { data, error } = await supabase
        .from("formas_pagamento")
        .insert({
          name,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao adicionar forma de pagamento");
      } else {
        setFormas(prev => [...prev, data as FormaPagamento].sort((a, b) => a.name.localeCompare(b.name)));
        setNewFormaName("");
        toast.success("Forma de pagamento acoplada!");
      }
    }
    setAdding(false);
  };

  const startEdit = (forma: FormaPagamento) => {
    setEditingId(forma.id);
    setNewFormaName(forma.name);
    inputRef.current?.focus();
    // Scroll to top mobile smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewFormaName("");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja remover esta modalidade de pagamento?")) return;
    
    const { error } = await supabase
      .from("formas_pagamento")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Erro ao remover forma de pagamento");
    } else {
      setFormas(prev => prev.filter(f => f.id !== id));
      toast.success("Modalidade removida");
    }
  };

  const filteredFormas = formas.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-top-6 duration-700 max-w-4xl mx-auto pb-10 px-4 md:px-0">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-3xl rounded-[2rem] md:rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-6 md:py-8 border-b border-primary/10 px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3 md:gap-4">
                <CreditCard className="w-6 h-6 md:w-8 md:h-8" /> Pagamentos
              </CardTitle>
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Configuração de Gateways de Liquidação</p>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-primary/10">
               <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-primary" />
               <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-primary">Sistema Seguro</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-10 space-y-6 md:space-y-10">
          {/* Seção de Adição Slim Responsiva */}
          <div className="flex flex-col gap-4 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-muted/10 border border-primary/5 shadow-inner">
             <div className="space-y-2 md:space-y-3">
                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-1 md:ml-2">
                  {editingId ? 'Editando Modalidade' : 'Nova Modalidade (Ex: Cartão, PIX...)'}
                </Label>
                <div className="flex flex-col sm:flex-row gap-3">
                   <div className="relative group flex-1">
                      <Wallet className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                      <Input
                        ref={inputRef}
                        placeholder="NOME DO GATEWAY..."
                        value={newFormaName}
                        onChange={(e) => setNewFormaName(e.target.value)}
                        className="h-12 md:h-16 bg-background/50 border-primary/5 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm pl-12 md:pl-16 shadow-2xl focus:ring-primary/20"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      />
                   </div>
                   <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={adding || !newFormaName.trim()}
                        className={`flex-1 sm:flex-none h-12 md:h-16 px-6 md:px-10 font-black uppercase tracking-widest rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2 md:gap-3 ${
                          editingId ? 'bg-green-500 hover:bg-green-600 text-black' : 'bg-primary hover:bg-primary/90 text-black shadow-xl shadow-primary/20'
                        }`}
                      >
                        {adding ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : editingId ? <><Save className="w-4 h-4 md:w-5 md:h-5" /> SALVAR</> : <><Plus className="w-4 h-4 md:w-5 md:h-5" /> ACOPLAR</>}
                      </Button>
                      {editingId && (
                        <Button 
                          variant="outline" 
                          onClick={cancelEdit}
                          className="h-12 md:h-16 w-12 md:w-16 border-white/5 bg-background/50 rounded-xl md:rounded-2xl flex items-center justify-center"
                        >
                          <X className="w-5 h-5 opacity-40" />
                        </Button>
                      )}
                   </div>
                </div>
             </div>
          </div>

          <div className="pt-6 md:pt-10 border-t border-primary/5 space-y-6 md:space-y-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <h4 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-primary/40">Inventário de Gateways ({formas.length})</h4>
                <div className="relative w-full md:w-72">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-primary opacity-40" />
                   <Input 
                      placeholder="PESQUISAR..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 md:h-12 bg-background/50 border-primary/5 pl-10 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-inner"
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {loading ? (
                   <div className="col-span-full py-10 text-center opacity-30 animate-pulse">
                      <p className="font-black uppercase tracking-widest text-[9px]">Sincronizando...</p>
                   </div>
                ) : filteredFormas.length > 0 ? (
                   filteredFormas.map((f) => (
                    <div key={f.id} className="group relative rounded-2xl md:rounded-[2rem] border border-primary/5 p-4 md:p-6 bg-muted/5 hover:border-primary/40 hover:bg-muted/10 transition-all shadow-xl flex items-center justify-between overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10" />
                      <div className="flex items-center gap-4 md:gap-6">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                              <Wallet className="w-5 h-5 md:w-6 md:h-6" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-foreground truncate">{f.name}</p>
                             <p className="text-[7px] md:text-[8px] font-black text-primary uppercase opacity-60 tracking-widest mt-0.5">Operacional</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => startEdit(f)}
                          className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg md:rounded-xl"
                        >
                          <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(f.id)}
                          className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg md:rounded-xl"
                        >
                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                   <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                      <CreditCard className="w-12 h-12 md:w-16 md:h-16 opacity-30 animate-pulse" />
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">Vazio</p>
                   </div>
                )}
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-6 md:gap-10 text-primary shadow-3xl">
         <Info className="w-10 h-10 md:w-12 md:h-12 opacity-30 flex-shrink-0" />
         <div className="space-y-2 text-center md:text-left">
            <h5 className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.3em]">Arquitetura de Transações</h5>
            <p className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.15em] leading-relaxed opacity-60">
                Estas modalidades são exibidas no estágio final de compra do seu e-commerce. Certifique-se de cadastrar apenas as opções que sua logística financeira processa em tempo real.
            </p>
         </div>
      </div>
    </div>
  );
};

export default PaymentTab;
