import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, Trash2, Plus, Search, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FormaPagamento } from "@/lib/types";

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
    if (!newFormaName.trim()) return;
    setAdding(true);
    
    const { data, error } = await supabase
      .from("formas_pagamento")
      .insert({
        name: newFormaName.trim(),
        tenant_id: tenantId
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar forma de pagamento");
    } else {
      setFormas(prev => [...prev, data as FormaPagamento].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFormaName("");
      toast.success("Forma de pagamento adicionada!");
    }
    setAdding(false);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("formas_pagamento")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Erro ao remover forma de pagamento");
    } else {
      setFormas(prev => prev.filter(f => f.id !== id));
      toast.success("Forma de pagamento removida");
    }
  };

  const filteredFormas = formas.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10 text-center sm:text-left">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black uppercase tracking-[.2em] text-primary flex items-center justify-center sm:justify-start gap-4">
              <CreditCard className="w-8 h-8" /> Formas de Pagamento
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Cadastre as opções de pagamento aceitas na sua loja</p>
          </div>
        </CardHeader>
        <CardContent className="p-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase tracking-widest text-primary">Gerenciar Opções</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Estas opções aparecerão no carrinho do cliente</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40" />
              <input 
                type="text" 
                placeholder="Buscar pagamento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-muted/20 border border-primary/10 rounded-xl pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-muted/10 p-4 rounded-2xl border border-primary/5">
            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Nome da Forma de Pagamento</Label>
              <input 
                type="text" 
                placeholder="Ex: Cartão de Crédito, Pix, Dinheiro..." 
                value={newFormaName}
                onChange={(e) => setNewFormaName(e.target.value)}
                className="w-full h-11 bg-background border border-primary/20 rounded-xl px-4 text-xs font-black focus:outline-none focus:border-primary transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <Button 
                onClick={handleAdd}
                disabled={adding || !newFormaName.trim()}
                className="w-full h-11 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20"
              >
                {adding ? "..." : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="py-10 text-center opacity-30">Carregando...</div>
            ) : filteredFormas.length > 0 ? (
              filteredFormas.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/5 border border-primary/5 hover:border-primary/20 transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                         <Wallet className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase">{f.name}</p>
                      </div>
                   </div>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     onClick={() => handleDelete(f.id)}
                     className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                 <CreditCard className="w-12 h-12 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma forma de pagamento cadastrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTab;
