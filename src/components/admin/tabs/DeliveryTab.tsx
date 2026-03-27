import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";
import { toast } from "sonner";
import { Truck, MapPin, Save, CheckCircle2, Circle, Trash2, Plus, Search, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { BairroFrete } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

const DeliveryTab = ({ tenantId }: { tenantId: string }) => {
  const { settings, updateSettings } = useStoreSettings();
  const [saving, setSaving] = useState(false);
  const [enablePickup, setEnablePickup] = useState(settings?.enable_pickup ?? false);
  const [enableFixedShipping, setEnableFixedShipping] = useState(settings?.enable_fixed_shipping ?? false);
  const [enableNeighborhoodShipping, setEnableNeighborhoodShipping] = useState(settings?.enable_neighborhood_shipping ?? false);
  const [fixedShippingRate, setFixedShippingRate] = useState(settings?.fixed_shipping_rate?.toString() ?? "0");

  const [bairros, setBairros] = useState<BairroFrete[]>([]);
  const [novoBairroNome, setNovoBairroNome] = useState("");
  const [novoBairroValor, setNovoBairroValor] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBairros();
  }, [tenantId]);

  const fetchBairros = async () => {
    const { data, error } = await supabase
      .from("bairros_frete")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("nome", { ascending: true });
    if (data) setBairros(data);
  };

  const handleAddBairro = async () => {
    if (!novoBairroNome.trim()) return;
    const valor = parseFloat(novoBairroValor) || 0;
    
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ 
        enable_pickup: enablePickup,
        enable_fixed_shipping: enableFixedShipping,
        enable_neighborhood_shipping: enableNeighborhoodShipping,
        fixed_shipping_rate: parseFloat(fixedShippingRate) || 0
      });
      toast.success("Configurações de entrega atualizadas!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const filteredBairros = bairros.filter(b => 
    b.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full mx-auto pb-10">
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10 text-center sm:text-left">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black uppercase tracking-[.2em] text-primary flex items-center justify-center sm:justify-start gap-4">
              <Truck className="w-8 h-8" /> Gestão de Entregas
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Habilite e configure as modalidades de frete da sua loja</p>
          </div>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Modalidade: Retirada */}
            <div 
              className={`relative p-6 rounded-[2rem] border-2 transition-all cursor-pointer group ${
                enablePickup 
                  ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)] translate-y-[-4px]' 
                  : 'bg-muted/10 border-primary/5 hover:border-primary/20'
              }`}
              onClick={() => setEnablePickup(!enablePickup)}
            >
              <div className="absolute top-4 right-6">
                {enablePickup ? (
                  <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
                )}
              </div>

              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${enablePickup ? 'bg-primary text-black' : 'bg-muted text-muted-foreground'}`}>
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
                enableFixedShipping 
                  ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)] translate-y-[-4px]' 
                  : 'bg-muted/10 border-primary/5 hover:border-primary/20'
              }`}
              onClick={() => {
                const newValue = !enableFixedShipping;
                setEnableFixedShipping(newValue);
                if (newValue) {
                  setEnableNeighborhoodShipping(false);
                }
              }}
            >
              <div className="absolute top-4 right-6">
                {enableFixedShipping ? (
                  <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
                )}
              </div>

              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${enableFixedShipping ? 'bg-primary text-black' : 'bg-muted text-muted-foreground'}`}>
                  <Truck className="w-6 h-6" />
                </div>
                
                <div className="space-y-1">
                   <h3 className="text-sm font-black uppercase tracking-widest truncate">Taxa Fixa</h3>
                   <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20">Unificada</Badge>
                </div>

                {enableFixedShipping && (
                   <div className="animate-in slide-in-from-top-2 duration-300 pt-1" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[10px] opacity-50">R$</span>
                         <input
                           type="number"
                           step="0.01"
                           value={fixedShippingRate}
                           onChange={(e) => setFixedShippingRate(e.target.value)}
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
                enableNeighborhoodShipping 
                  ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)] translate-y-[-4px]' 
                  : 'bg-muted/10 border-primary/5 hover:border-primary/20'
              }`}
              onClick={() => {
                const newValue = !enableNeighborhoodShipping;
                setEnableNeighborhoodShipping(newValue);
                if (newValue) {
                  setEnableFixedShipping(false);
                }
              }}
            >
              <div className="absolute top-4 right-6">
                {enableNeighborhoodShipping ? (
                  <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground opacity-20" />
                )}
              </div>

              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${enableNeighborhoodShipping ? 'bg-primary text-black' : 'bg-muted text-muted-foreground'}`}>
                  <Map className="w-6 h-6" />
                </div>
                
                <div className="space-y-1">
                   <h3 className="text-sm font-black uppercase tracking-widest truncate">Por Bairro</h3>
                   <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20">Regional</Badge>
                </div>
              </div>
            </div>
          </div>

          {enableNeighborhoodShipping && (
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

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-muted/10 p-4 rounded-2xl border border-primary/5">
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
                  <div className="sm:col-span-2 flex items-end">
                    <Button 
                      onClick={handleAddBairro}
                      disabled={!novoBairroNome.trim()}
                      className="w-full h-11 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
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
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleDeleteBairro(b.id)}
                         className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
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

          <div className="pt-6 border-t border-primary/10 flex justify-center sm:justify-end">
            <Button 
                onClick={handleSave} 
                disabled={saving}
                className="h-16 px-12 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 rounded-2xl animate-pulse-subtle w-full sm:w-auto"
            >
              <Save className="w-5 h-5 mr-3" /> {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-6 text-primary">
         <div className="hidden sm:block">
            <CheckCircle2 className="w-6 h-6" />
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
            As modalidades habilitadas aqui aparecerão automaticamente no carrinho do cliente e no painel de novos pedidos.
         </p>
      </div>
    </div>
  );
};

export default DeliveryTab;
