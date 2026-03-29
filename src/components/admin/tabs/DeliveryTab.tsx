import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck, MapPin, CheckCircle2, Circle, Trash2, Plus, Search, Map, Pencil, X, Info } from "lucide-react";
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
    <div className="space-y-12 p-8 md:p-12 animate-in fade-in slide-in-from-top-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-primary/5">
         <div className="flex items-center gap-5">
           <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
             <Truck className="w-7 h-7" />
           </div>
           <div>
             <h3 className="font-black text-2xl uppercase tracking-[0.2em] text-primary leading-tight">Gestão de Logística</h3>
             <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">Modalidades de frete e roteirização regional</p>
           </div>
         </div>
      </div>

      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Modalidade: Retirada Elite */}
          <div 
            className={`relative p-8 rounded-[2.5rem] border transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 shadow-2xl ${
              formData.enable_pickup 
                ? 'bg-primary/10 border-primary shadow-[0_0_50px_rgba(var(--primary),0.1)]' 
                : 'bg-muted/10 border-primary/5 hover:border-primary/20'
            }`}
            onClick={() => setFormData({...formData, enable_pickup: !formData.enable_pickup})}
          >
            <div className="absolute top-6 right-8">
              {formData.enable_pickup ? (
                <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="space-y-6">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${formData.enable_pickup ? 'bg-primary text-black shadow-xl shadow-primary/20 scale-110' : 'bg-muted text-muted-foreground'}`}>
                <MapPin className="w-7 h-7" />
              </div>
              
              <div className="space-y-2">
                 <h3 className="text-sm font-black uppercase tracking-[0.2em]">{formData.enable_pickup ? 'RETIRADA ATIVA' : 'RETIRADA'}</h3>
                 <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 tracking-widest px-3 py-1">Gratuidade Total</Badge>
              </div>
            </div>
          </div>

          {/* Modalidade: Taxa Fixa Elite */}
          <div 
            className={`relative p-8 rounded-[2.5rem] border transition-all cursor-pointer group flex flex-col justify-between hover:scale-[1.02] active:scale-95 shadow-2xl ${
              formData.enable_fixed_shipping 
                ? 'bg-primary/10 border-primary shadow-[0_0_50px_rgba(var(--primary),0.1)]' 
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
            <div className="absolute top-6 right-8">
              {formData.enable_fixed_shipping ? (
                <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="space-y-6">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${formData.enable_fixed_shipping ? 'bg-primary text-black shadow-xl shadow-primary/20 scale-110' : 'bg-muted text-muted-foreground'}`}>
                <Truck className="w-7 h-7" />
              </div>
              
              <div className="space-y-2">
                 <h3 className="text-sm font-black uppercase tracking-[0.2em]">{formData.enable_fixed_shipping ? 'TAXA FIXA ATIVA' : 'TAXA FIXA'}</h3>
                 <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 tracking-widest px-3 py-1">Unificação Regional</Badge>
              </div>

              {formData.enable_fixed_shipping && (
                 <div className="animate-in slide-in-from-top-4 duration-500 pt-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                       <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-xs text-primary/60">R$</span>
                       <input
                         type="number"
                         step="0.01"
                         value={formData.fixed_shipping_rate}
                         onChange={(e) => setFormData({...formData, fixed_shipping_rate: parseFloat(e.target.value) || 0})}
                         className="w-full h-14 bg-background border border-primary/20 rounded-2xl pl-12 pr-6 text-base font-black text-primary focus:outline-none focus:border-primary transition-all shadow-xl"
                         placeholder="0,00"
                       />
                    </div>
                 </div>
              )}
            </div>
          </div>

          {/* Modalidade: Por Bairro Elite */}
          <div 
            className={`relative p-8 rounded-[2.5rem] border transition-all cursor-pointer group flex flex-col justify-between hover:scale-[1.02] active:scale-95 shadow-2xl ${
              formData.enable_neighborhood_shipping 
                ? 'bg-primary/10 border-primary shadow-[0_0_50px_rgba(var(--primary),0.1)]' 
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
            <div className="absolute top-6 right-8">
              {formData.enable_neighborhood_shipping ? (
                <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="space-y-6">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${formData.enable_neighborhood_shipping ? 'bg-primary text-black shadow-xl shadow-primary/20 scale-110' : 'bg-muted text-muted-foreground'}`}>
                <Map className="w-7 h-7" />
              </div>
              
              <div className="space-y-2">
                 <h3 className="text-sm font-black uppercase tracking-[0.2em]">{formData.enable_neighborhood_shipping ? 'ROTEIRO ATIVO' : 'POR BAIRRO'}</h3>
                 <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 tracking-widest px-3 py-1">Precisão Regional</Badge>
              </div>
            </div>
          </div>
        </div>

        {formData.enable_neighborhood_shipping && (
           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pt-10 border-t border-primary/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-primary leading-tight">Engenharia de Rota</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Cadastro de perímetros e suas respectivas taxas</p>
                </div>
                
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40" />
                  <input 
                    type="text" 
                    placeholder="BUSCAR BAIRRO..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-14 bg-muted/10 border border-primary/10 rounded-2xl pl-14 pr-6 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-primary/20 shadow-xl"
                  />
                </div>
              </div>

              <div id="bairro-form" className={`grid grid-cols-1 md:grid-cols-12 gap-6 p-8 rounded-[2.5rem] border transition-all shadow-2xl ${editingBairroId ? 'bg-primary/5 border-primary shadow-[0_0_50px_rgba(var(--primary),0.05)]' : 'bg-muted/5 border-primary/5'}`}>
                <div className="md:col-span-6 space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Identificador de Localidade</Label>
                  <input 
                    type="text" 
                    placeholder="EX: CENTRO, VILA NOVA..." 
                    value={novoBairroNome}
                    onChange={(e) => setNovoBairroNome(e.target.value.toUpperCase())}
                    className="w-full h-14 bg-background border border-primary/5 rounded-2xl px-6 text-sm font-black uppercase tracking-[0.1em] shadow-xl focus:ring-primary/20"
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Taxa de Frete (BRL)</Label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-xs text-primary/60">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0,00" 
                      value={novoBairroValor}
                      onChange={(e) => setNovoBairroValor(e.target.value)}
                      className="w-full h-14 bg-background border border-primary/5 rounded-2xl pl-12 pr-6 text-base font-black text-primary shadow-xl focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="md:col-span-3 flex items-end gap-3">
                  <Button 
                    onClick={handleSaveBairro}
                    disabled={!novoBairroNome.trim()}
                    className="flex-1 h-14 bg-primary text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all"
                  >
                    {editingBairroId ? 'ATUALIZAR' : <><Plus className="w-5 h-5 mr-2" /> ACOPLAR</>}
                  </Button>
                  {editingBairroId && (
                    <Button 
                      variant="ghost"
                      onClick={cancelEdit}
                      className="h-14 w-14 bg-muted/10 border border-primary/5 text-muted-foreground hover:text-primary rounded-2xl p-0 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {filteredBairros.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-muted/5 border border-primary/5 hover:border-primary/20 transition-all group hover:bg-muted/10 shadow-xl overflow-hidden relative">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10 group-hover:scale-150 transition-transform" />
                     <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                           <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs font-black uppercase truncate tracking-widest max-w-[150px]">{b.nome}</p>
                           <p className="text-[12px] text-primary font-black uppercase tracking-[0.1em]">{formatBRL(b.valor)}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => startEditBairro(b)}
                         className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                       >
                         <Pencil className="w-4 h-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => handleDeleteBairro(b.id)}
                         className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                  </div>
                ))}
                
                {filteredBairros.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-20">
                     <Map className="w-16 h-16 mb-6" />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum roteiro cadastrado</p>
                  </div>
                )}
              </div>
           </div>
        )}
      </div>
      
      <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-8 text-primary shadow-3xl animate-pulse-subtle">
         <div className="hidden md:block">
            <Info className="w-10 h-10 opacity-30" />
         </div>
         <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed text-center md:text-left">
            As modalidades habilitadas aqui aparecerão automaticamente no checkout do cliente. O sistema computará o frete com base na localização selecionada. Para efetivar qualquer mudança, utilize o protocolo master de sincronização no rodapé do painel.
         </p>
      </div>
    </div>
  );
};

export default DeliveryTab;
