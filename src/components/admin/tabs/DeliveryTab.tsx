import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";
import { toast } from "sonner";
import { Truck, MapPin, Save, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DeliveryTab = ({ tenantId }: { tenantId: string }) => {
  const { settings, updateSettings } = useStoreSettings();
  const [saving, setSaving] = useState(false);
  const [enablePickup, setEnablePickup] = useState(settings?.enable_pickup ?? false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ enable_pickup: enablePickup });
      toast.success("Configurações de entrega atualizadas!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Modalidade: Retirada */}
            <div 
              className={`relative p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer group ${
                enablePickup 
                  ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)] translate-y-[-4px]' 
                  : 'bg-muted/10 border-primary/5 hover:border-primary/20'
              }`}
              onClick={() => setEnablePickup(!enablePickup)}
            >
              <div className="absolute top-6 right-8">
                {enablePickup ? (
                  <CheckCircle2 className="w-8 h-8 text-primary animate-in zoom-in duration-300" />
                ) : (
                  <Circle className="w-8 h-8 text-muted-foreground opacity-20" />
                )}
              </div>

              <div className="space-y-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${enablePickup ? 'bg-primary text-black' : 'bg-muted text-muted-foreground'}`}>
                  <MapPin className="w-8 h-8" />
                </div>
                
                <div className="space-y-1">
                   <h3 className="text-lg font-black uppercase tracking-widest">Retirada na Loja</h3>
                   <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20">Grátis</Badge>
                      <span className="text-[10px] font-bold text-muted-foreground">O cliente retira o produto</span>
                   </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Permite que o cliente realize o pedido e opte por buscar pessoalmente no endereço físico cadastrado.
                </p>
              </div>
            </div>

            {/* Placeholder para futuras modalidades */}
            <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-primary/5 bg-transparent flex flex-col items-center justify-center text-center opacity-40 grayscale pointer-events-none">
                <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
                    <Truck className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[.2em] mb-1">Cálculo de Frete</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-primary">Em breve</p>
            </div>
          </div>

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
