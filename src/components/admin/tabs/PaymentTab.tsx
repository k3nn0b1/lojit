import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, Trash2, Plus, Search, Wallet, Info, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FormaPagamento } from "@/lib/types";
import { Input } from "@/components/ui/input";

const PaymentTab = ({ tenantId }: { tenantId: string }) => {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFormaName, setNewFormaName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [adding, setAdding] = useState(false);

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

  const handleAdd = async () => {
    const name = newFormaName.trim().toUpperCase();
    if (!name) return;
    setAdding(true);
    
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
    setAdding(false);
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
    <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700 max-w-4xl mx-auto pb-10">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-3xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <CreditCard className="w-8 h-8" /> Checkout de Receitas
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Protocolação de gateways e modalidades de liquidação</p>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl border border-primary/10">
               <ShieldCheck className="w-4 h-4 text-primary" />
               <span className="text-[8px] font-black uppercase tracking-widest text-primary">Sistema Seguro</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end p-8 rounded-[2rem] bg-muted/10 border border-primary/5 shadow-inner">
            <div className="lg:col-span-8 space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Identificador de Liquidação (Ex: PIX, CARTÃO, LINK...)</Label>
               <div className="relative group">
                  <Wallet className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                  <Input
                    placeholder="DIGITE A MODALIDADE..."
                    value={newFormaName}
                    onChange={(e) => setNewFormaName(e.target.value)}
                    className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black uppercase text-sm pl-16 shadow-2xl focus:ring-primary/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
               </div>
            </div>
            <div className="lg:col-span-4">
               <Button
                  onClick={handleAdd}
                  disabled={adding || !newFormaName.trim()}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-6 h-6" /> ACOPLAR</>}
                </Button>
            </div>
          </div>

          <div className="pt-10 border-t border-primary/5 space-y-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/40">Inventário de Gateways ({formas.length})</h4>
                <div className="relative w-full md:w-72">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40" />
                   <Input 
                      placeholder="PESQUISAR..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 bg-background/50 border-primary/5 pl-12 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner focus:ring-primary/20"
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  <div className="col-span-full py-20 text-center opacity-30 animate-pulse">
                     <p className="font-black uppercase tracking-widest text-[10px]">Sincronizando protocolos...</p>
                  </div>
                ) : filteredFormas.length > 0 ? (
                  filteredFormas.map((f) => (
                    <div key={f.id} className="group relative rounded-[2rem] border border-primary/5 p-6 bg-muted/5 hover:border-primary/40 hover:bg-muted/10 transition-all shadow-xl flex items-center justify-between overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10 group-hover:scale-150 transition-transform" />
                      <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:rotate-12 transition-all">
                              <Wallet className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground">{f.name}</p>
                             <p className="text-[8px] font-black text-primary uppercase opacity-60 tracking-widest mt-0.5">Ativo e Operacional</p>
                          </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(f.id)}
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-24 flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                     <CreditCard className="w-16 h-16 opacity-30 animate-pulse" />
                     <p className="text-[10px] font-black uppercase tracking-[0.4em]">Nenhum gateway protocolo detectado</p>
                  </div>
                )}
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-10 rounded-[2.5rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-10 text-primary shadow-3xl">
         <div className="hidden md:block">
            <Info className="w-12 h-12 opacity-30" />
         </div>
         <div className="space-y-2 text-center md:text-left flex-1">
            <h5 className="text-[12px] font-black uppercase tracking-[0.3em] leading-relaxed">Arquitetura de Transações</h5>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] leading-relaxed opacity-60">
                Estas modalidades são exibidas dinamicamente no estágio final de compra do seu e-commerce. Certifique-se de cadastrar apenas as opções que sua logística financeira está preparada para processar em tempo real.
            </p>
         </div>
      </div>
    </div>
  );
};

export default PaymentTab;
