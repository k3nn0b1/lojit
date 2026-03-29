import React from "react";
import { ShoppingBag, Trash2, Wallet, Truck, MapPin, Check, Search, Map, ChevronRight, ArrowLeft, ArrowRight, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatBRL, formatPhoneMask } from "@/lib/utils";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";
import { supabase } from "@/lib/supabase";
import { BairroFrete, FormaPagamento } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

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
  onCheckout: (clienteNome: string, clienteTelefone: string, deliveryMethod?: string, bairroEntrega?: string, freteValor?: number, formaPagamento?: string | { method: string; value: number }[], endereco?: string) => void;
}

const Cart = ({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) => {
  const [currentStep, setCurrentStep] = React.useState(1);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { settings } = useStoreSettings();
  const [deliveryMethod, setDeliveryMethod] = React.useState<string | undefined>(undefined);
  const [selectedBairro, setSelectedBairro] = React.useState<BairroFrete | null>(null);
  const [bairrosList, setBairrosList] = React.useState<BairroFrete[]>([]);
  const [bairroSearchQuery, setBairroSearchQuery] = React.useState("");
  const [formasPagamento, setFormasPagamento] = React.useState<FormaPagamento[]>([]);
  const [selectedMethods, setSelectedMethods] = React.useState<string[]>([]);
  const [paymentValues, setPaymentValues] = React.useState<Record<string, string>>({}); // usando string para lidar com inputs
  const [clienteNome, setClienteNome] = React.useState("");
  const [clienteTelefone, setClienteTelefone] = React.useState("");
  const [clienteEndereco, setClienteEndereco] = React.useState("");

  const shippingCost = deliveryMethod === "fixo" 
    ? (settings?.fixed_shipping_rate || 0) 
    : deliveryMethod === "bairro" 
      ? (selectedBairro?.valor || 0) 
      : 0;

  const total = subtotal + shippingCost;

  React.useEffect(() => {
    if (settings?.tenant_id) {
      const fetchData = async () => {
        if (settings.enable_neighborhood_shipping) {
          const { data: bData } = await supabase
            .from("bairros_frete")
            .select("*")
            .eq("tenant_id", settings.tenant_id)
            .order("nome", { ascending: true });
          if (bData) setBairrosList(bData);
        }

        const { data: pData } = await supabase
          .from("formas_pagamento")
          .select("*")
          .eq("tenant_id", settings.tenant_id)
          .order("name", { ascending: true });
        if (pData) setFormasPagamento(pData);
      };
      fetchData();
    }
  }, [settings]);

  React.useEffect(() => {
    if (!deliveryMethod && settings) {
      if (settings.enable_pickup) setDeliveryMethod("retirada");
      else if (settings.enable_fixed_shipping) setDeliveryMethod("fixo");
      else if (settings.enable_neighborhood_shipping) setDeliveryMethod("bairro");
    }
  }, [settings]);

  // Reseta para o passo 1 ao abrir/fechar se o carrinho mudar drasticamente
  React.useEffect(() => {
    if (!isOpen) {
       setTimeout(() => {
         setCurrentStep(1);
         setSelectedMethods([]);
         setPaymentValues({});
       }, 300);
    }
  }, [isOpen]);

  // Se o total mudar, e tiver só 1 método, atualiza o valor
  React.useEffect(() => {
    if (selectedMethods.length === 1) {
      setPaymentValues({ [selectedMethods[0]]: total.toFixed(2) });
    }
  }, [total, selectedMethods.length]);

  const togglePaymentMethod = (method: string) => {
    setSelectedMethods(prev => {
      const isSelected = prev.includes(method);
      if (isSelected) {
        const next = prev.filter(m => m !== method);
        const nextValues = { ...paymentValues };
        delete nextValues[method];
        setPaymentValues(nextValues);
        return next;
      }
      if (prev.length < 2) {
        const next = [...prev, method];
        if (next.length === 1) {
          setPaymentValues({ [method]: total.toFixed(2) });
        } else {
           // Se adicionou o segundo, divide ao meio pra facilitar
           const half = (total / 2).toFixed(2);
           setPaymentValues({ [prev[0]]: half, [method]: (total - parseFloat(half)).toFixed(2) });
        }
        return next;
      }
      toast.error("Você pode selecionar no máximo 2 formas de pagamento");
      return prev;
    });
  };

  const filteredBairros = bairrosList.filter(b => 
    b.nome.toLowerCase().includes(bairroSearchQuery.toLowerCase())
  );



  const nextStep = () => {
    if (currentStep === 1) {
      if (items.length === 0) {
        toast.error("Adicione itens ao carrinho");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!clienteNome.trim() || !clienteTelefone.trim()) {
        toast.error("Preencha seus dados de identificação");
        return;
      }
      if (!deliveryMethod) {
        toast.error("Selecione uma forma de entrega");
        return;
      }
      if (deliveryMethod === "bairro" && !selectedBairro) {
        toast.error("Selecione o bairro de entrega");
        return;
      }
      if ((deliveryMethod === "bairro" || deliveryMethod === "fixo") && !clienteEndereco.trim()) {
        toast.error("Preencha seu endereço (Rua e Número)");
        return;
      }
      setCurrentStep(3);
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(1, prev - 1));

  const steps = [
    { id: 1, label: "Carrinho", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 2, label: "Entrega", icon: <Truck className="w-4 h-4" /> },
    { id: 3, label: "Pagamento", icon: <CreditCard className="w-4 h-4" /> }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border/50 flex flex-col h-full ring-0 focus:ring-0 p-0 overflow-hidden">
        {/* Header Personalizado com Progresso */}
        <div className="p-6 border-b border-border/50 space-y-6 bg-muted/5">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-2xl flex items-center gap-2 m-0">
               {steps.find(s => s.id === currentStep)?.icon}
               <span className="uppercase font-black tracking-tighter">{steps.find(s => s.id === currentStep)?.label}</span>
            </SheetTitle>
          </div>

          <div className="flex items-center justify-between px-2 relative">
             <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-muted/20 -translate-y-1/2 -z-10" />
             <div 
               className="absolute top-1/2 left-4 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-500 ease-in-out" 
               style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 90}%` }}
             />
             
             {steps.map((s) => (
               <div key={s.id} className="flex flex-col items-center gap-2">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-black text-[10px] ${
                   currentStep >= s.id 
                    ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(var(--primary),0.3)]' 
                    : 'bg-background border-muted/50 text-muted-foreground'
                 }`}>
                   {currentStep > s.id ? <Check className="w-4 h-4" /> : s.id}
                 </div>
                 <span className={`text-[8px] font-black uppercase tracking-widest ${currentStep >= s.id ? 'text-primary' : 'text-muted-foreground/50'}`}>
                    {s.label}
                 </span>
               </div>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-4"
              >
                {items.length === 0 ? (
                  <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
                    <ShoppingBag className="w-20 h-20 mx-auto mb-6 text-muted-foreground opacity-20 italic" />
                    <p className="text-muted-foreground font-medium italic">Seu carrinho está vazio no momento.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={`${item.id}-${item.size}-${item.color || ""}`}
                      className="flex gap-4 p-4 rounded-2xl border border-border/50 bg-muted/5 relative group hover:border-primary/20 transition-all"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-xl shadow-lg"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                           <h4 className="text-[11px] font-black uppercase leading-tight line-clamp-2 pr-6">{item.name}</h4>
                           <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onRemoveItem(item.id, item.size, item.color)}
                              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-6 w-6 p-0 absolute top-3 right-3 rounded-full"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none">
                          {item.color ? `${item.color} • ` : ""}TAMANHO {item.size}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                           <p className="text-primary font-black text-sm">{formatBRL(item.price)}</p>
                           <div className="flex items-center gap-2 bg-background/50 rounded-lg p-1 border border-border/50">
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.size, Math.max(1, item.quantity - 1), item.color)}
                                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted font-black"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-[10px] font-black">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.size, item.quantity + 1, item.color)}
                                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted font-black"
                              >
                                +
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-8"
              >
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> SEUS DADOS
                  </Label>
                  <div className="space-y-3">
                    <Input
                      placeholder="Nome completo"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="bg-muted/10 border-border/50 h-12 text-xs font-bold rounded-xl focus:ring-primary/20"
                    />
                    <Input
                      placeholder="Telefone (WhatsApp)"
                      type="tel"
                      inputMode="numeric"
                      value={clienteTelefone}
                      onChange={(e) => {
                        const formatted = formatPhoneMask(e.target.value);
                        setClienteTelefone(formatted);
                        const digits = e.target.value.replace(/\D/g, "");
                        if (digits.length >= 11) {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="bg-muted/10 border-border/50 h-12 text-xs font-bold rounded-xl focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-1 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5" /> MÉTODO DE ENTREGA
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {settings?.enable_pickup && (
                      <button 
                        onClick={() => setDeliveryMethod("retirada")}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                          deliveryMethod === "retirada" 
                            ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)] text-primary' 
                            : 'bg-muted/10 border-border/30 hover:border-primary/30 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${deliveryMethod === "retirada" ? 'bg-primary text-black' : 'bg-muted/20'}`}>
                             <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Retirada na Loja</p>
                            <p className="text-[9px] text-muted-foreground font-black opacity-60">GRÁTIS</p>
                          </div>
                        </div>
                        {deliveryMethod === "retirada" && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    )}
                    
                    {settings?.enable_neighborhood_shipping && (
                      <div className="space-y-2">
                        <button 
                          onClick={() => setDeliveryMethod("bairro")}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            deliveryMethod === "bairro" 
                              ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)] text-primary' 
                              : 'bg-muted/10 border-border/30 hover:border-primary/30 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${deliveryMethod === "bairro" ? 'bg-primary text-black' : 'bg-muted/20'}`}>
                               <Map className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest">Entrega por Bairro</p>
                              <p className="text-[9px] text-muted-foreground font-black opacity-60 uppercase">
                                {selectedBairro ? `${selectedBairro.nome}: ${selectedBairro.valor === 0 ? "A combinar" : formatBRL(selectedBairro.valor)}` : "Selecione o bairro"}
                              </p>
                            </div>
                          </div>
                          {deliveryMethod === "bairro" && <Check className="w-5 h-5 text-primary" />}
                        </button>

                        {deliveryMethod === "bairro" && !selectedBairro && (
                          <div className="space-y-4 p-5 rounded-3xl bg-background/50 border border-primary/10 mt-2 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40" />
                              <input 
                                type="text"
                                placeholder="Buscar seu bairro..."
                                value={bairroSearchQuery}
                                onChange={(e) => setBairroSearchQuery(e.target.value)}
                                className="w-full h-10 bg-muted/10 border border-primary/5 rounded-xl pl-10 pr-4 text-[10px] font-black focus:outline-none focus:border-primary/30 transition-all uppercase tracking-widest"
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                               {filteredBairros.map(b => (
                                <button
                                  key={b.id}
                                  onClick={() => setSelectedBairro(b)}
                                  className={`flex items-center justify-between p-3 rounded-xl border text-[10px] font-black transition-all ${
                                    selectedBairro?.id === b.id 
                                      ? 'bg-primary/20 border-primary/40 text-primary' 
                                      : 'bg-muted/5 border-transparent hover:border-primary/20'
                                  }`}
                                >
                                  <span className="uppercase">{b.nome}</span>
                                  <span className="font-black text-xs">{formatBRL(b.valor)}</span>
                                </button>
                               ))}
                               
                               <button
                                 onClick={() => setSelectedBairro({ id: -1, nome: "Outros", valor: 0, tenant_id: settings?.tenant_id || "" })}
                                 className={`flex items-center justify-between p-3 rounded-xl border text-[10px] font-black transition-all ${
                                   selectedBairro?.nome === "Outros"
                                     ? 'bg-primary/20 border-primary/40 text-primary' 
                                      : 'bg-muted/5 border-transparent hover:border-primary/20'
                                 }`}
                               >
                                  <span className="uppercase italic opacity-60">Outros</span>
                                  <span className="font-black text-[9px] uppercase tracking-tighter">A Combinar</span>
                               </button>
                            </div>
                          </div>
                        )}

                        {deliveryMethod === "bairro" && selectedBairro && (
                          <div className="space-y-4 p-5 rounded-3xl bg-background/50 border border-primary/10 mt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                             <div className="flex items-center justify-between mb-2">
                               <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Detalhes da Entrega</p>
                               <button 
                                 onClick={() => {
                                   setSelectedBairro(null);
                                   setBairroSearchQuery("");
                                 }}
                                 className="text-[9px] font-black uppercase text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                               >
                                 Trocar Bairro
                               </button>
                             </div>
                             <Input 
                               placeholder="Rua, número e complemento"
                               value={clienteEndereco}
                               onChange={(e) => setClienteEndereco(e.target.value)}
                               className="bg-muted/10 border-border/50 h-12 text-xs font-bold rounded-xl focus:ring-primary/20"
                             />
                             <p className="text-[8px] text-muted-foreground italic px-1 opacity-60 uppercase font-black">Certifique-se de que alguém possa receber o pedido no local.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {settings?.enable_fixed_shipping && (
                      <div className="space-y-2">
                        <button 
                          onClick={() => setDeliveryMethod("fixo")}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            deliveryMethod === "fixo" 
                              ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)] text-primary' 
                              : 'bg-muted/10 border-border/30 hover:border-primary/30 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-4 text-left">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${deliveryMethod === "fixo" ? 'bg-primary text-black' : 'bg-muted/20'}`}>
                               <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest">Entrega Padrão</p>
                              <p className="text-[9px] text-muted-foreground font-black opacity-60">{formatBRL(settings?.fixed_shipping_rate || 0)}</p>
                            </div>
                          </div>
                          {deliveryMethod === "fixo" && <Check className="w-5 h-5 text-primary" />}
                        </button>

                        {deliveryMethod === "fixo" && (
                           <div className="p-5 rounded-3xl bg-background/50 border border-primary/10 mt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 block">Seu Endereço</Label>
                             <Input 
                               placeholder="Rua, número e complemento"
                               value={clienteEndereco}
                               onChange={(e) => setClienteEndereco(e.target.value)}
                               className="bg-muted/10 border-border/50 h-12 text-xs font-bold rounded-xl focus:ring-primary/20"
                             />
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-8"
              >
                {formasPagamento.length > 0 ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-1 flex items-center gap-2">
                         <Wallet className="w-3.5 h-3.5" /> FORMA DE PAGAMENTO (Até 2)
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                         {formasPagamento.map((p) => (
                           <button
                             key={p.id}
                             onClick={() => togglePaymentMethod(p.name)}
                             className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative ${
                                selectedMethods.includes(p.name)
                                  ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]' 
                                  : 'bg-muted/10 border-border/30 text-muted-foreground hover:border-primary/20'
                             }`}
                           >
                             {selectedMethods.includes(p.name) && (
                               <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-black flex items-center justify-center text-[8px] font-black">
                                 {selectedMethods.indexOf(p.name) + 1}
                               </div>
                             )}
                             <CreditCard className={`w-6 h-6 ${selectedMethods.includes(p.name) ? 'text-primary' : 'text-muted-foreground/30'}`} />
                             <span className="text-[9px] font-black uppercase tracking-widest text-center">{p.name}</span>
                           </button>
                         ))}
                      </div>
                    </div>

                    {selectedMethods.length === 2 && (
                      <div className="space-y-4 p-5 rounded-3xl bg-primary/5 border border-primary/20 animate-in zoom-in-95 duration-300">
                         <p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-2">Dividir Pagamento</p>
                         <div className="grid grid-cols-2 gap-4">
                            {selectedMethods.map((m) => (
                              <div key={m} className="space-y-2">
                                <Label className="text-[8px] font-black uppercase tracking-widest opacity-60">{m}</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">R$</span>
                                  <Input 
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    value={paymentValues[m] || ""}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      const otherMethod = selectedMethods.find(oth => oth !== m)!;
                                      const remaining = Math.max(0, total - (parseFloat(newVal) || 0)).toFixed(2);
                                      setPaymentValues({ [m]: newVal, [otherMethod]: remaining });
                                    }}
                                    className="bg-background/50 border-border/50 h-10 pl-8 text-xs font-black rounded-xl focus:ring-primary/20"
                                  />
                                </div>
                              </div>
                            ))}
                         </div>
                         <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                            <span className="text-[8px] font-black uppercase opacity-60">Soma: {formatBRL(Object.values(paymentValues).reduce((a, b) => a + (parseFloat(b) || 0), 0))}</span>
                            <span className="text-[8px] font-black uppercase text-primary">Total: {formatBRL(total)}</span>
                         </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-muted/10 border border-primary/10 text-center">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-40">O pagamento será combinado diretamente no WhatsApp.</p>
                  </div>
                )}

                <div className="space-y-4 p-6 rounded-3xl bg-muted/5 border border-border/50">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-4 border-b border-primary/5 pb-2">Resumo da Compra</h4>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>Produtos:</span>
                        <span>{formatBRL(subtotal)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>Entrega {deliveryMethod === "retirada" ? "(Retirada)" : ""}:</span>
                        <span>{shippingCost === 0 && deliveryMethod !== "retirada" ? "A Combinar" : formatBRL(shippingCost)}</span>
                     </div>
                     <Separator className="bg-primary/10 h-0.5" />
                     <div className="flex justify-between items-center pt-2">
                        <span className="text-xs font-black uppercase tracking-widest">Total Final:</span>
                        <div className="text-right">
                           <span className="text-primary text-3xl font-black block leading-none">{formatBRL(total)}</span>
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 bg-muted/10 border-t border-border/50 space-y-3">
           {items.length > 0 && (
             <>
               <div className="flex gap-3">
                 {currentStep > 1 && (
                   <Button 
                    variant="outline" 
                    onClick={prevStep}
                    className="flex-1 h-14 rounded-2xl border-primary/20 font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
                   >
                     <ArrowLeft className="w-4 h-4" /> Voltar
                   </Button>
                 )}
                 
                 <Button
                   autoFocus
                    onClick={currentStep === 3 ? () => {
                      // Validação final e checkout
                      if (formasPagamento.length > 0) {
                        if (selectedMethods.length === 0) {
                          toast.error("Selecione uma forma de pagamento");
                          return;
                        }
                        if (selectedMethods.length === 2) {
                          const v1 = parseFloat(paymentValues[selectedMethods[0]]) || 0;
                          const v2 = parseFloat(paymentValues[selectedMethods[1]]) || 0;
                          if (Math.abs((v1 + v2) - total) > 0.01) {
                             toast.error("A soma dos valores deve ser igual ao total");
                             return;
                          }
                        }
                      }
                      
                      const pagamentoFinal = selectedMethods.length === 2 
                        ? selectedMethods.map(m => ({ method: m, value: parseFloat(paymentValues[m]) || 0 }))
                        : (selectedMethods[0] || "");

                      onCheckout(clienteNome, clienteTelefone, deliveryMethod, selectedBairro?.nome || undefined, shippingCost, pagamentoFinal, clienteEndereco);
                    } : nextStep}
                   className={`${currentStep === 1 ? 'w-full' : 'flex-[2]'} h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl glow-soft flex items-center justify-center gap-2 group`}
                 >
                   {currentStep === 3 ? (
                     <>FINALIZAR PEDIDO <ShoppingBag className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" /></>
                   ) : (
                     <>CONTINUAR <ArrowRight className="w-4 h-4 mb-0.5 group-hover:translate-x-1 transition-transform" /></>
                   )}
                 </Button>
               </div>
               
             </>
           )}

           {items.length === 0 && (
              <Button 
                onClick={onClose}
                className="w-full h-14 bg-muted/10 border border-primary/10 hover:border-primary/30 rounded-2xl font-black uppercase tracking-widest text-[10px]"
              >
                Voltar para Loja
              </Button>
           )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Cart;
