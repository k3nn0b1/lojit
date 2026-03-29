import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck, MapPin, CheckCircle2, Circle, Trash2, Plus, Search, Map, Pencil, X, Info, Loader2 } from "lucide-react";
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
    if (!confirm("Remover este bairro?")) return;
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
    <div className="space-y-8 md:space-y-12 p-4 md:p-12 animate-in fade-in slide-in-from-top-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pb-6 md:pb-8 border-b border-primary/5">
         <div className="flex items-center gap-4 md:gap-5">
           <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
             <Truck className="w-6 h-6 md:w-7 md:h-7" />
           </div>
           <div>
             <h3 className="font-black text-xl md:text-2xl uppercase tracking-[0.2em] text-primary leading-tight">Logística</h3>
             <p className="text-[9px] md:text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">Modalidades de frete e rotas</p>
           </div>
         </div>
      </div>

      <div className="space-y-6 md:space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {/* Modalidade: Retirada Elite */}
          <div 
            className={`relative p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 shadow-2xl ${
              formData.enable_pickup 
                ? 'bg-primary/10 border-primary shadow-[0_0_50px_rgba(var(--primary),0.1)]' 
                : 'bg-muted/10 border-primary/5 hover:border-primary/20'
            }`}
            onClick={() => setFormData({...formData, enable_pickup: !formData.enable_pickup})}
          >
            <div className="absolute top-4 md:top-6 right-4 md:right-8">
              {formData.enable_pickup ? (
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-6">
              <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center transition-all ${formData.enable_pickup ? 'bg-primary text-black shadow-xl shadow-primary/20 scale-110' : 'bg-muted text-muted-foreground'}`}>
                <MapPin className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              
              <div className="space-y-1 md:space-y-2">
                 <h3 className="text-[11px] md:text-sm font-black uppercase tracking-[0.2em]">{formData.enable_pickup ? 'RETIRADA ATIVA' : 'RETIRADA'}</h3>
                 <Badge variant="outline" className="text-[7px] md:text-[8px] font-black uppercase border-primary/20 tracking-widest px-2 md:px-3 py-0.5 md:py-1">Grátis</Badge>
              </div>
            </div>
          </div>

          {/* Modalidade: Taxa Fixa Elite */}
          <div 
            className={`relative p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border transition-all cursor-pointer group flex flex-col justify-between hover:scale-[1.02] active:scale-95 shadow-2xl ${
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
            <div className="absolute top-4 md:top-6 right-4 md:right-8">
              {formData.enable_fixed_shipping ? (
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-6">
                <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center transition-all ${formData.enable_fixed_shipping ? 'bg-primary text-black shadow-xl shadow-primary/20 scale-110' : 'bg-muted text-muted-foreground'}`}>
                  <Truck className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                
                <div className="space-y-1 md:space-y-2">
                   <h3 className="text-[11px] md:text-sm font-black uppercase tracking-[0.2em]">{formData.enable_fixed_shipping ? 'FIXA ATIVA' : 'TAXA FIXA'}</h3>
                   <Badge variant="outline" className="text-[7px] md:text-[8px] font-black uppercase border-primary/20 tracking-widest px-2 md:px-3 py-0.5 md:py-1">Regional</Badge>
                </div>
              </div>

              {formData.enable_fixed_shipping && (
                 <div className="animate-in slide-in-from-top-4 duration-500 pt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[10px] text-primary/60">R$</span>
                       <input
                         type="number"
                         step="0.01"
                         value={formData.fixed_shipping_rate}
                         onChange={(e) => setFormData({...formData, fixed_shipping_rate: parseFloat(e.target.value) || 0})}
                         className="w-full h-10 md:h-14 bg-background border border-primary/20 rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-4 md:pr-6 text-xs md:text-base font-black text-primary focus:outline-none focus:border-primary shadow-xl"
                         placeholder="0,00"
                       />
                    </div>
                 </div>
              )}
            </div>
          </div>

          {/* Modalidade: Por Bairro Elite */}
          <div 
            className={`relative p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border transition-all cursor-pointer group flex flex-col justify-between hover:scale-[1.02] active:scale-95 shadow-2xl ${
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
            <div className="absolute top-4 md:top-6 right-4 md:right-8">
              {formData.enable_neighborhood_shipping ? (
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary animate-in zoom-in duration-300" />
              ) : (
                <Circle className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground opacity-20" />
              )}
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-6">
              <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center transition-all ${formData.enable_neighborhood_shipping ? 'bg-primary text-black shadow-xl shadow-primary/20 scale-110' : 'bg-muted text-muted-foreground'}`}>
                <Map className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              
              <div className="space-y-1 md:space-y-2">
                 <h3 className="text-[11px] md:text-sm font-black uppercase tracking-[0.2em]">{formData.enable_neighborhood_shipping ? 'ROTA ATIVA' : 'POR BAIRRO'}</h3>
                 <Badge variant="outline" className="text-[7px] md:text-[8px] font-black uppercase border-primary/20 tracking-widest px-2 md:px-3 py-0.5 md:py-1">Precisão</Badge>
              </div>
            </div>
          </div>
        </div>

        {formData.enable_neighborhood_shipping && (
           <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pt-6 md:pt-10 border-t border-primary/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-primary leading-tight">Engenharia de Rota</h3>
                  <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Cadastro de perímetros e taxas</p>
                </div>
                
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-primary opacity-40" />
                  <input 
                    type="text" 
                    placeholder="BUSCAR BAIRRO..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 md:h-14 bg-muted/10 border border-primary/10 rounded-xl md:rounded-2xl pl-10 md:pl-14 pr-4 md:pr-6 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-primary/20 shadow-xl"
                  />
                </div>
              </div>

              <div id="bairro-form" className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border transition-all shadow-2xl ${editingBairroId ? 'bg-primary/5 border-primary shadow-[0_0_50px_rgba(var(--primary),0.05)]' : 'bg-muted/5 border-primary/5'}`}>
                <div className="md:col-span-6 space-y-1.5">
                  <Label className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-1">Bairro</Label>
                  <input 
                    type="text" 
                    placeholder="EX: CENTRO, VILA..." 
                    value={novoBairroNome}
                    onChange={(e) => setNovoBairroNome(e.target.value.toUpperCase())}
                    className="w-full h-10 md:h-14 bg-background border border-primary/5 rounded-xl md:rounded-2xl px-5 text-xs font-black uppercase shadow-xl focus:ring-primary/20"
                  />
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <Label className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-1">Taxa (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[10px] text-primary/60">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0,00" 
                      value={novoBairroValor}
                      onChange={(e) => setNovoBairroValor(e.target.value)}
                      className="w-full h-10 md:h-14 bg-background border border-primary/5 rounded-xl md:rounded-2xl pl-10 pr-4 text-xs font-black text-primary shadow-xl focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="md:col-span-3 flex items-end gap-2 md:gap-3">
                  <Button 
                    onClick={handleSaveBairro}
                    disabled={!novoBairroNome.trim()}
                    className="flex-1 h-10 md:h-14 bg-primary text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                  >
                    {editingBairroId ? 'SALVAR' : <><Plus className="w-4 h-4 mr-2" /> ACOPLAR</>}
                  </Button>
                  {editingBairroId && (
                    <Button 
                      variant="ghost"
                      onClick={cancelEdit}
                      className="h-10 md:h-14 w-10 md:w-14 bg-muted/10 border border-primary/5 text-muted-foreground hover:text-primary rounded-xl md:rounded-2xl p-0 transition-all flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredBairros.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-muted/5 border border-primary/5 hover:border-primary/20 transition-all group hover:bg-muted/10 shadow-xl overflow-hidden relative">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10 group-hover:scale-150 transition-transform" />
                     <div className="flex items-center gap-4 md:gap-6 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner shrink-0">
                           <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[10px] md:text-xs font-black uppercase truncate tracking-widest">{b.nome}</p>
                           <p className="text-[10px] md:text-[12px] text-primary font-black uppercase tracking-[0.1em]">{formatBRL(b.valor)}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all transform md:translate-x-4 group-hover:translate-x-0">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => startEditBairro(b)}
                         className="h-8 md:h-10 w-8 md:w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg md:rounded-xl transition-all"
                       >
                         <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => handleDeleteBairro(b.id)}
                         className="h-8 md:h-10 w-8 md:w-10 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg md:rounded-xl transition-all"
                       >
                         <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                       </Button>
                     </div>
                  </div>
                ))}
                
                {filteredBairros.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-20">
                     <Map className="w-12 h-12 mb-4" />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum roteiro</p>
                  </div>
                )}
              </div>
           </div>
        )}
      </div>
      
      <div className="p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-6 md:gap-8 text-primary shadow-3xl">
         <div className="hidden md:block">
            <Info className="w-10 h-10 opacity-30" />
         </div>
         <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed text-center md:text-left opacity-80">
            As modalidades habilitadas aparecerão no checkout. Use o protocolo master no rodapé para sincronizar permanentemente no servidor.
         </p>
      </div>
    </div>
  );
};

export default DeliveryTab;
