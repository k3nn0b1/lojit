import React from "react";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatBRL } from "@/lib/utils";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";
import { Truck, MapPin, Check, Search, Map } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BairroFrete } from "@/lib/types";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  size: string;
  color?: string;
  image: string;
  quantity: number;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, size: string, quantity: number, color?: string) => void;
  onRemoveItem: (id: number, size: string, color?: string) => void;
  onCheckout: (clienteNome: string, clienteTelefone: string, deliveryMethod?: string, bairroEntrega?: string, freteValor?: number) => void;
}

const Cart = ({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { settings } = useStoreSettings();
  const [deliveryMethod, setDeliveryMethod] = React.useState<string | undefined>(undefined);
  const [selectedBairro, setSelectedBairro] = React.useState<BairroFrete | null>(null);
  const [bairrosList, setBairrosList] = React.useState<BairroFrete[]>([]);
  const [bairroSearchQuery, setBairroSearchQuery] = React.useState("");

  const shippingCost = deliveryMethod === "fixo" 
    ? (settings?.fixed_shipping_rate || 0) 
    : deliveryMethod === "bairro" 
      ? (selectedBairro?.valor || 0) 
      : 0;

  const total = subtotal + shippingCost;
  const [clienteNome, setClienteNome] = React.useState("");
  const [clienteTelefone, setClienteTelefone] = React.useState("");

  React.useEffect(() => {
    if (settings?.enable_neighborhood_shipping && settings?.tenant_id) {
      const fetchBairros = async () => {
        const { data } = await supabase
          .from("bairros_frete")
          .select("*")
          .eq("tenant_id", settings.tenant_id)
          .order("nome", { ascending: true });
        if (data) setBairrosList(data);
      };
      fetchBairros();
    }
  }, [settings]);

  // Sincroniza o método inicial quando as configurações carregam
  React.useEffect(() => {
    if (!deliveryMethod && settings) {
      if (settings.enable_pickup) setDeliveryMethod("retirada");
      else if (settings.enable_fixed_shipping) setDeliveryMethod("fixo");
      else if (settings.enable_neighborhood_shipping) setDeliveryMethod("bairro");
    }
  }, [settings]);

  const filteredBairros = bairrosList.filter(b => 
    b.nome.toLowerCase().includes(bairroSearchQuery.toLowerCase())
  );

  const formatPhoneMask = (value: string) => {
    const digits = value.replace(/\D+/g, "").slice(0, 11);
    const part1 = digits.slice(0, 2);
    const part2 = digits.slice(2, 7);
    const part3 = digits.slice(7, 11);
    if (digits.length <= 2) return part1 ? `(${part1}` : "";
    if (digits.length <= 7) return `(${part1}) ${part2}`;
    return `(${part1}) ${part2}-${part3}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border/50 flex flex-col h-full ring-0 focus:ring-0">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            SEU CARRINHO
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Seu carrinho está vazio</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.id}-${item.size}-${item.color || ""}`}
                className="flex gap-4 p-4 rounded-lg border border-border/50 bg-background/50 relative group"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-md"
                />
                <div className="flex-1 space-y-2">
                  <h4 className="text-xs font-black uppercase line-clamp-1">{item.name}</h4>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
                    {item.color ? `${item.color} • ` : ""}TAMANHO {item.size}
                  </p>
                  <p className="text-primary font-black">{formatBRL(item.price)}</p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.size, Math.max(1, item.quantity - 1), item.color)}
                      className="h-7 w-7 p-0 border-primary/20 bg-muted/20"
                    >
                      -
                    </Button>
                    <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.size, item.quantity + 1, item.color)}
                      className="h-7 w-7 p-0 border-primary/20 bg-muted/20"
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveItem(item.id, item.size, item.color)}
                  className="text-destructive hover:text-red-500 hover:bg-red-500/10 h-7 w-7 p-0 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
        <div className="flex flex-col gap-5 pt-4 border-t border-border/50 pb-2">
          <div className="space-y-2 w-full">
            <Input
              placeholder="Nome completo"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              className="bg-muted/10 border-border/50 h-11 text-xs font-bold"
            />
            <Input
              placeholder="Telefone (WhatsApp) — Ex.: (75) 98128-4738"
              value={clienteTelefone}
              onChange={(e) => setClienteTelefone(formatPhoneMask(e.target.value))}
              className="bg-muted/10 border-border/50 h-11 text-xs font-bold"
            />
          </div>

          {(settings?.enable_pickup || settings?.enable_fixed_shipping) && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Truck className="w-3 h-3" /> FORMA DE ENTREGA
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {settings?.enable_pickup && (
                  <button 
                    onClick={() => setDeliveryMethod("retirada")}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      deliveryMethod === "retirada" 
                        ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.05)]' 
                        : 'bg-muted/20 border-border/50 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <MapPin className={`w-5 h-5 ${deliveryMethod === "retirada" ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-[10px] font-black uppercase">Retirada na Loja</p>
                        <p className="text-[9px] text-muted-foreground font-bold">Grátis</p>
                      </div>
                    </div>
                    {deliveryMethod === "retirada" && <Check className="w-4 h-4 text-primary" />}
                  </button>
                )}
                
                {settings?.enable_fixed_shipping && (
                  <button 
                    onClick={() => setDeliveryMethod("fixo")}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      deliveryMethod === "fixo" 
                        ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.05)]' 
                        : 'bg-muted/20 border-border/50 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Truck className={`w-5 h-5 ${deliveryMethod === "fixo" ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-[10px] font-black uppercase">Entrega Padrão</p>
                        <p className="text-[9px] text-muted-foreground font-bold">{formatBRL(settings?.fixed_shipping_rate || 0)}</p>
                      </div>
                    </div>
                    {deliveryMethod === "fixo" && <Check className="w-4 h-4 text-primary" />}
                  </button>
                )}

                {settings?.enable_neighborhood_shipping && (
                  <div className="space-y-3">
                    <button 
                      onClick={() => setDeliveryMethod("bairro")}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        deliveryMethod === "bairro" 
                          ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.05)]' 
                          : 'bg-muted/20 border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <Map className={`w-5 h-5 ${deliveryMethod === "bairro" ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-[10px] font-black uppercase">Entrega por Bairro</p>
                          <p className="text-[9px] text-muted-foreground font-bold">
                            {selectedBairro ? `${selectedBairro.nome === "Outros" ? "A combinar" : formatBRL(selectedBairro.valor)}` : "Selecione o bairro"}
                          </p>
                        </div>
                      </div>
                      {deliveryMethod === "bairro" && <Check className="w-4 h-4 text-primary" />}
                    </button>

                    {deliveryMethod === "bairro" && (
                      <div className="space-y-3 p-4 rounded-xl bg-background/50 border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-50" />
                          <input 
                            type="text"
                            placeholder="Buscar seu bairro..."
                            value={bairroSearchQuery}
                            onChange={(e) => setBairroSearchQuery(e.target.value)}
                            className="w-full h-9 bg-muted/20 border border-primary/5 rounded-lg pl-9 pr-3 text-[10px] font-bold focus:outline-none focus:border-primary/30 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                           {filteredBairros.map(b => (
                            <button
                              key={b.id}
                              onClick={() => setSelectedBairro(b)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-[10px] font-bold transition-all ${
                                selectedBairro?.id === b.id 
                                  ? 'bg-primary/20 border-primary/40 text-primary' 
                                  : 'bg-muted/10 border-transparent hover:border-primary/10'
                              }`}
                            >
                              <span className="uppercase">{b.nome}</span>
                              <span className="font-black text-[9px]">{formatBRL(b.valor)}</span>
                            </button>
                           ))}
                           
                           <button
                             onClick={() => setSelectedBairro({ id: -1, nome: "Outros", valor: 0, tenant_id: settings?.tenant_id || "" })}
                             className={`flex items-center justify-between p-2.5 rounded-lg border text-[10px] font-bold transition-all ${
                               selectedBairro?.nome === "Outros"
                                 ? 'bg-primary/20 border-primary/40 text-primary' 
                                 : 'bg-muted/10 border-transparent hover:border-primary/10'
                             }`}
                           >
                              <span className="uppercase italic">Outros</span>
                              <span className="font-black text-[9px] uppercase tracking-tighter">A Combinar</span>
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-border/20">
             <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Subtotal:</span>
                <span>{formatBRL(subtotal)}</span>
             </div>
             {shippingCost > 0 && (
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Frete:</span>
                  <span>{formatBRL(shippingCost)}</span>
                </div>
             )}
             <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-black uppercase tracking-widest">Total:</span>
                <span className="text-primary text-2xl font-black">{formatBRL(total)}</span>
             </div>
          </div>

          <Button
            onClick={() => {
              const nome = clienteNome.trim();
              const tel = clienteTelefone.trim();
              if (!nome || !tel) {
                toast.error("Preencha nome e telefone para finalizar");
                return;
              }
              if ((settings?.enable_pickup || settings?.enable_fixed_shipping || settings?.enable_neighborhood_shipping) && !deliveryMethod) {
                toast.error("Selecione uma forma de entrega");
                return;
              }
              if (deliveryMethod === "bairro" && !selectedBairro) {
                toast.error("Selecione o bairro de entrega");
                return;
              }
              onCheckout(nome, tel, deliveryMethod, selectedBairro?.nome || undefined, shippingCost);
            }}
            size="lg"
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest glow-soft rounded-xl"
          >
            FINALIZAR NO WHATSAPP
          </Button>
        </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Cart;
