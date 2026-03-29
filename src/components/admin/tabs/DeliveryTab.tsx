import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck, MapPin, CheckCircle2, Circle, Trash2, Plus, Search, Map, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { BairroFrete } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

interface DeliveryTabProps {
  tenantId: string;
  formData: any;
  setFormData: (data: any) => void;
}

const DeliveryTab = ({ tenantId, formData, setFormData }: DeliveryTabProps) => {
  const [bairros, setBairros] = useState<BairroFrete[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoBairroNome, setNovoBairroNome] = useState("");
  const [novoBairroValor, setNovoBairroValor] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBairroId, setEditingBairroId] = useState<number | null>(null);

  useEffect(() => {
    fetchBairros();
  }, [tenantId]);

  const fetchBairros = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bairros_frete")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("nome", { ascending: true });
    
    if (data) setBairros(data);
    setLoading(false);
  };

  const handleSaveBairro = async () => {
    if (!novoBairroNome.trim()) return;
    const valor = parseFloat(novoBairroValor) || 0;
    
    if (editingBairroId) {
      const { data, error } = await supabase
        .from("bairros_frete")
        .update({
          nome: novoBairroNome.trim(),
          valor
        })
        .eq("id", editingBairroId)
        .select()
        .single();

      if (error) {
        toast.error("Erro ao atualizar bairro");
      } else {
        setBairros(prev => prev.map(b => b.id === editingBairroId ? data : b));
        setEditingBairroId(null);
        setNovoBairroNome("");
        setNovoBairroValor("");
        toast.success("Bairro atualizado!");
      }
    } else {
      const { data, error } = await supabase
        .from("bairros_frete")
        .insert({
          nome: novoBairroNome.trim(),
          valor,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao adicionar bairro");
      } else {
        setBairros(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
        setNovoBairroNome("");
        setNovoBairroValor("");
        toast.success("Bairro adicionado!");
      }
    }
  };

  const startEditBairro = (b: BairroFrete) => {
    setEditingBairroId(b.id);
    setNovoBairroNome(b.nome);
    setNovoBairroValor(b.valor.toString());
    
    const formElement = document.getElementById("bairro-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const cancelEdit = () => {
    setEditingBairroId(null);
    setNovoBairroNome("");
    setNovoBairroValor("");
  };

  const handleDeleteBairro = async (id: number) => {
    const { error } = await supabase
      .from("bairros_frete")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Erro ao remover bairro");
    } else {
      setBairros(prev => prev.filter(b => b.id !== id));
      toast.success("Bairro removido");
    }
  };

  const filteredBairros = bairros.filter(b => 
    b.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!formData) return null;

  return (
    <div className="space-y-10 p-5 md:p-10 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 border-b border-primary/5 pb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-black text-lg uppercase tracking-widest text-primary">Gestão de Entregas</h3>
          <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60">Habilite e configure as modalidades de frete da sua loja</p>
        </div>
      </div>

      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Modalidade: Retirada */}
          <div 
            className={`relative p-6 rounded-[2rem] border-2 transition-all cursor-pointer group ${
              formData.enable_pickup 
                ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)] translate-y-[-4px]' 
                : 'bg-muted/10 border-primary/5 hover:border-primary/20'
            }`}
            onClick={() => setFormData({...formData, enable_pickup: !formData.enable_pickup})}
          >
            <div className="absolute top-4 right-6">
              {formData.enable_pickup ? (
                <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="space-y-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${formData.enable_pickup ? 'bg-primary text-black' : 'bg-muted text-muted-foreground'}`}>
                <MapPin className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                 <h3 className="text-sm font-black uppercase tracking-widest truncate">Retirada</h3>
                 <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20">Grátis</Badge>
              </div>
            </div>
          </div>

          {/* Modalidade: Taxa Fixa */}
          <div 
            className={`relative p-6 rounded-[2rem] border-2 transition-all cursor-pointer group flex flex-col justify-between ${
              formData.enable_fixed_shipping 
                ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)] translate-y-[-4px]' 
                : 'bg-muted/10 border-primary/5 hover:border-primary/20'
            }`}
            onClick={() => {
              const newValue = !formData.enable_fixed_shipping;
              setFormData({
                ...formData, 
                enable_fixed_shipping: newValue,
                enable_neighborhood_shipping: newValue ? false : formData.enable_neighborhood_shipping
              });
            }}
          >
            <div className="absolute top-4 right-6">
              {formData.enable_fixed_shipping ? (
                <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="space-y-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${formData.enable_fixed_shipping ? 'bg-primary text-black' : 'bg-muted text-muted-foreground'}`}>
                <Truck className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                 <h3 className="text-sm font-black uppercase tracking-widest truncate">Taxa Fixa</h3>
                 <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20">Unificada</Badge>
              </div>

              {formData.enable_fixed_shipping && (
                 <div className="animate-in slide-in-from-top-2 duration-300 pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[10px] opacity-50">R$</span>
                       <input
                         type="number"
                         step="0.01"
                         value={formData.fixed_shipping_rate}
                         onChange={(e) => setFormData({...formData, fixed_shipping_rate: parseFloat(e.target.value) || 0})}
                         className="w-full h-10 bg-background border border-primary/20 rounded-lg pl-8 pr-3 text-[11px] font-black focus:outline-none focus:border-primary transition-all"
                         placeholder="0,00"
                       />
                    </div>
                 </div>
              )}
            </div>
          </div>

          {/* Modalidade: Por Bairro */}
          <div 
            className={`relative p-6 rounded-[2rem] border-2 transition-all cursor-pointer group flex flex-col justify-between ${
              formData.enable_neighborhood_shipping 
                ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)] translate-y-[-4px]' 
                : 'bg-muted/10 border-primary/5 hover:border-primary/20'
            }`}
            onClick={() => {
              const newValue = !formData.enable_neighborhood_shipping;
              setFormData({
                ...formData, 
                enable_neighborhood_shipping: newValue,
                enable_fixed_shipping: newValue ? false : formData.enable_fixed_shipping
              });
            }}
          >
            <div className="absolute top-4 right-6">
              {formData.enable_neighborhood_shipping ? (
                <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="space-y-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${formData.enable_neighborhood_shipping ? 'bg-primary text-black' : 'bg-muted text-muted-foreground'}`}>
                <Map className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                 <h3 className="text-sm font-black uppercase tracking-widest truncate">Por Bairro</h3>
                 <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20">Regional</Badge>
              </div>
            </div>
          </div>
        </div>

        {formData.enable_neighborhood_shipping && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6 border-t border-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-widest text-primary">Gerenciar Bairros</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Cadastre os bairros atendidos e seus respectivos valores</p>
                </div>
                
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40" />
                  <input 
                    type="text" 
                    placeholder="Buscar bairro..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 bg-muted/20 border border-primary/10 rounded-xl pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-primary/40 transition-all"
                  />
                </div>
              </div>

              <div id="bairro-form" className={`grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 rounded-2xl border transition-all ${editingBairroId ? 'bg-primary/5 border-primary/30 shadow-lg shadow-primary/5' : 'bg-muted/10 border-primary/5'}`}>
                <div className="sm:col-span-7 space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Nome do Bairro</Label>
                  <input 
                    type="text" 
                    placeholder="Ex: Centro" 
                    value={novoBairroNome}
                    onChange={(e) => setNovoBairroNome(e.target.value)}
                    className="w-full h-11 bg-background border border-primary/20 rounded-xl px-4 text-xs font-black focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Valor Frete</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[10px] opacity-50">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0,00" 
                      value={novoBairroValor}
                      onChange={(e) => setNovoBairroValor(e.target.value)}
                      className="w-full h-11 bg-background border border-primary/20 rounded-xl pl-8 pr-4 text-xs font-black focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-end gap-2">
                  <Button 
                    onClick={handleSaveBairro}
                    disabled={!novoBairroNome.trim()}
                    className="flex-1 h-11 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20"
                  >
                    {editingBairroId ? 'Atualizar' : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
                  </Button>
                  {editingBairroId && (
                    <Button 
                      variant="ghost"
                      onClick={cancelEdit}
                      className="h-11 w-11 bg-muted/20 border border-primary/5 text-muted-foreground hover:text-primary rounded-xl p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredBairros.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/5 border border-primary/5 hover:border-primary/20 transition-all group">
                     <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                           <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                           <p className="text-xs font-black uppercase truncate max-w-[200px] sm:max-w-md">{b.nome}</p>
                           <p className="text-[10px] text-primary font-black uppercase tracking-widest">{formatBRL(b.valor)}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => startEditBairro(b)}
                         className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                       >
                         <Pencil className="w-4 h-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleDeleteBairro(b.id)}
                         className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                  </div>
                ))}
                {filteredBairros.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-30">
                     <Map className="w-12 h-12 mb-4" />
                     <p className="text-[10px] font-black uppercase tracking-widest">Nenhum bairro cadastrado</p>
                  </div>
                )}
              </div>
           </div>
        )}
      </div>
      
      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-6 text-primary">
         <div className="hidden sm:block">
            <CheckCircle2 className="w-6 h-6" />
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
            As modalidades habilitadas aqui aparecerão automaticamente no carrinho do cliente e no painel de novos pedidos. Todas as configurações acima são aplicadas ao clicar no botão "Aplicar Configurações" do painel.
         </p>
      </div>
    </div>
  );
};

export default DeliveryTab;
