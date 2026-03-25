import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatBRL, normalizePhone, formatPhoneMask, rankSize, generateUUID, sortPedidos } from "@/lib/utils";
import { AdminProduct, AdminCartItem, Pedido } from "@/lib/types";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";
import { Truck, MapPin, CheckCircle2 } from "lucide-react";

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storedProducts: AdminProduct[];
  setStoredProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>;
  tenantId: string;
  setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
}

const NewOrderModal = ({
  open,
  onOpenChange,
  storedProducts,
  setStoredProducts,
  tenantId,
  setPedidos,
}: NewOrderModalProps) => {
  const [productQuery, setProductQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [adminCart, setAdminCart] = useState<AdminCartItem[]>([]);
  const [informarCliente, setInformarCliente] = useState(true);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [confirmDebitarOpen, setConfirmDebitarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings } = useStoreSettings();
  const [deliveryMethod, setDeliveryMethod] = useState<string | undefined>(undefined);

  // Sincroniza o método inicial
  useMemo(() => {
    if (!deliveryMethod && settings) {
      if (settings.enable_pickup) setDeliveryMethod("retirada");
      else if (settings.enable_fixed_shipping) setDeliveryMethod("fixo");
    }
  }, [settings]);

  const shippingCost = deliveryMethod === "fixo" ? (settings?.fixed_shipping_rate || 0) : 0;
  const adminCartTotal = useMemo(() => adminCart.reduce((sum, it) => sum + it.price * it.quantity, 0) + shippingCost, [adminCart, shippingCost]);

  const addToAdminCart = () => {
    const qty = Math.max(1, parseInt(quantity || '1') || 1);
    if (!selectedProductId || !selectedSize || qty <= 0) return;
    const prod = storedProducts.find(p => p.id === selectedProductId);
    if (!prod) return;

    if (prod.colors && prod.colors.length > 0 && !selectedColor) {
      toast.error("Selecione uma cor");
      return;
    }
    const estoque = Math.max(0, Number((prod.stockBySize || {})[selectedSize] || 0));
    if (estoque === 0) {
      toast.error("Tamanho sem estoque");
      return;
    }
    const existingItem = adminCart.find(it => it.id === selectedProductId && it.size === selectedSize && it.color === selectedColor);
    const combined = (existingItem?.quantity || 0) + qty;
    if (combined > estoque) {
      toast.error(`Quantidade total (${combined}) excede estoque disponível (${estoque})`);
      return;
    }
    setAdminCart(prev => {
      const idx = prev.findIndex(it => it.id === selectedProductId && it.size === selectedSize && it.color === selectedColor);
      const next = [...prev];
      if (idx >= 0) {
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
      } else {
        next.push({ 
          id: selectedProductId, 
          name: prod.name, 
          size: selectedSize, 
          color: selectedColor || undefined, 
          quantity: qty, 
          price: Number(prod.price || 0) 
        });
      }
      return next;
    });
    setQuantity('1');
  };

  const removeFromAdminCart = (i: number) => {
    setAdminCart(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateAdminCartQuantity = (i: number, newQty: number) => {
    if (newQty < 1) return;
    const item = adminCart[i];
    const prod = storedProducts.find(p => p.id === item.id);
    const estoque = Math.max(0, Number((prod?.stockBySize || {})[item.size] || 0));
    if (newQty > estoque) {
      if (estoque >= 1) {
        toast.info(`Estoque disponível: ${estoque}.`);
        setAdminCart(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: estoque } : it));
      } else {
        toast.error("Sem estoque para este tamanho. Removi o item do carrinho.");
        removeFromAdminCart(i);
      }
      return;
    }
    setAdminCart(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: newQty } : it));
  };

  const handleCreateAdminOrder = async (debitarEstoque: boolean) => {
    if (adminCart.length === 0) {
      toast.error("Adicione itens ao pedido");
      return;
    }
    setIsSubmitting(true);
    const nome = informarCliente && clienteNome.trim() ? clienteNome.trim() : "LOJA";
    const telefone = informarCliente && clienteTelefone.trim() ? clienteTelefone.trim() : "(XX) XXXXXX-XXXX";

    const itens = adminCart.map(it => ({
      produto: it.name,
      tamanho: it.size,
      cor: it.color || null,
      quantidade: it.quantity,
      product_id: it.id,
      preco_unitario: it.price,
    }));

    try {
      if (debitarEstoque) {
        // Aplica baixa de estoque ATÔMICA
        for (const it of adminCart) {
          const { error: stockError } = await supabase.rpc('update_inventory', {
            p_product_id: it.id,
            p_tenant_id: tenantId,
            p_size: it.size,
            p_delta: -it.quantity
          });

          if (stockError) {
             console.error(`Erro ao debitar estoque [ID:${it.id}]:`, stockError);
          }
        }
      }

      const uuid = generateUUID();
      try {
        await supabase.from("clientes").insert({ nome, telefone: normalizePhone(telefone), tenant_id: tenantId });
      } catch {}

      const { error } = await supabase
        .from("pedidos")
        .insert({
          id: uuid,
          cliente_nome: nome,
          cliente_telefone: telefone,
          itens,
          valor_total: adminCartTotal,
          status: debitarEstoque ? "concluido" : "pendente",
          delivery_method: deliveryMethod,
          frete_valor: shippingCost,
          tenant_id: tenantId,
        });
      if (error) throw error;

      toast.success("Pedido criado com sucesso!");
      
      // Atualiza pedidos
      const { data: pedidosData } = await supabase
        .from("pedidos")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("data_criacao", { ascending: false });
      if (pedidosData) setPedidos(sortPedidos(pedidosData as Pedido[]));

      // Reseta tudo
      onOpenChange(false);
      setAdminCart([]);
      setClienteNome("");
      setClienteTelefone("");
      setSelectedProductId(null);
      setProductQuery("");
    } catch (e: any) {
      toast.error("Erro ao criar pedido", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card text-foreground border-primary/30 max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden border">
          <DialogClose className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/10 transition-colors z-[60]">
            <X className="h-5 w-5 text-muted-foreground/60" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">Novo Pedido Admin</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium italic">Selecione produtos, defina o cliente e conclua a venda interna.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Seleção de Produtos */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">1. Buscar Produto</Label>
                  </div>
                  <Input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Digite o nome do produto..."
                    className="bg-muted/10 border-primary/10 h-11"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-2 mt-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                    {storedProducts
                      .filter(p => (p.name || "").toLowerCase().includes(productQuery.toLowerCase()))
                      .slice(0, 20)
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { 
                            setSelectedProductId(p.id!); 
                            setSelectedSize(null); 
                            setSelectedColor(null); 
                          }}
                          className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left group ${selectedProductId === p.id ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10' : 'border-primary/5 hover:border-primary/20 hover:bg-muted/30'}`}
                        >
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-primary/10 text-white">
                             <img src={p.image || p.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black truncate">{p.name}</div>
                            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{p.category}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {selectedProductId && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-muted/10 border border-primary/10">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">2. Escolher Tamanho</Label>
                        <div className="flex flex-wrap gap-2">
                          {(storedProducts.find(p => p.id === selectedProductId)?.sizes || ["U"])
                            .sort((a,b) => rankSize(a) - rankSize(b))
                            .map(s => {
                              const prod = storedProducts.find(p => p.id === selectedProductId);
                              const stock = Math.max(0, Number((prod?.stockBySize || {})[s] || 0));
                              const isDisabled = stock === 0;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => setSelectedSize(s)}
                                  className={`h-10 px-4 rounded-xl border text-[10px] font-black transition-all relative ${
                                    selectedSize === s 
                                      ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' 
                                      : isDisabled 
                                        ? 'opacity-20 grayscale cursor-not-allowed'
                                        : 'border-primary/10 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                  }`}
                                >
                                  {s}
                                  <span className="absolute -top-1 -right-1 bg-background border border-primary/10 rounded px-1 text-[7px] font-black">{stock}</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      {(() => {
                        const prod = storedProducts.find(p => p.id === selectedProductId);
                        if (!prod?.colors || prod.colors.length === 0) return null;
                        return (
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">3. Escolher Cor</Label>
                            <div className="flex flex-wrap gap-2">
                              {prod.colors.map(c => (
                                <button
                                  key={c.name}
                                  type="button"
                                  onClick={() => setSelectedColor(c.name)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black transition-all ${
                                    selectedColor === c.name
                                      ? 'bg-primary/20 border-primary text-primary shadow-lg'
                                      : 'border-primary/10 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                  }`}
                                >
                                  <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-end gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">4. Quantidade</Label>
                        <Input 
                          type="number" 
                          min={1} 
                          value={quantity} 
                          onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))} 
                          className="h-12 bg-background border-primary/10 text-lg font-black text-center"
                        />
                      </div>
                      <Button 
                        onClick={addToAdminCart} 
                        className="h-12 px-8 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-xs"
                        disabled={!selectedSize}
                      >
                         Adicionar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lado Direito: Carrinho e Cliente */}
              <div className="lg:col-span-12 xl:col-span-5 flex flex-col h-full bg-muted/5 rounded-3xl border border-primary/10 p-6 space-y-6">
                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-widest text-primary">Itens Selecionados</h3>
                    <Badge variant="outline" className="border-primary/20 font-black text-[9px]">{adminCart.length} TIPOS</Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[200px]">
                    {adminCart.map((it, i) => (
                      <div key={i} className="group relative rounded-2xl border border-primary/5 p-4 bg-muted/20 hover:border-primary/20 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="text-[11px] font-black text-foreground truncate uppercase">{it.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="h-5 text-[9px] px-1.5 font-black border-primary/20">{it.size}</Badge>
                              {it.color && <span className="text-[9px] text-muted-foreground font-black uppercase">{it.color}</span>}
                              <span className="text-[9px] text-primary font-black ml-auto">{formatBRL(it.price)}/un</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFromAdminCart(i)}
                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-primary/5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateAdminCartQuantity(i, it.quantity - 1)} className="w-7 h-7 rounded-lg bg-muted text-foreground hover:bg-primary/20 font-black">-</button>
                            <span className="w-8 text-center text-xs font-black">{it.quantity}</span>
                            <button onClick={() => updateAdminCartQuantity(i, it.quantity + 1)} className="w-7 h-7 rounded-lg bg-muted text-foreground hover:bg-primary/20 font-black">+</button>
                          </div>
                          <div className="text-sm font-black text-primary">
                            {formatBRL(it.price * it.quantity)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {adminCart.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/30">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-3 italic font-serif text-xl">?</div>
                        <p className="text-[10px] uppercase font-black tracking-widest">Carrinho Vazio</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-primary/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total do Pedido</span>
                      <span className="text-2xl font-black text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.2)]">{formatBRL(adminCartTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-3 px-1">
                    <input 
                      type="checkbox" 
                      id="informar-cliente-modal"
                      className="w-4 h-4 rounded border-primary/20 text-primary focus:ring-primary bg-background"
                      checked={informarCliente} 
                      onChange={(e) => setInformarCliente(e.target.checked)} 
                    />
                    <Label htmlFor="informar-cliente-modal" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Identificar Cliente</Label>
                  </div>
                  
                  {informarCliente && (
                    <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-2">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
                        <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Ex: João Silva" className="h-10 text-xs bg-background border-primary/10 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
                        <Input value={clienteTelefone} onChange={(e) => setClienteTelefone(formatPhoneMask(e.target.value))} placeholder="(XX) XXXXX-XXXX" className="h-10 text-xs bg-background border-primary/10 rounded-xl" />
                      </div>
                    </div>
                  )}

                  {(settings?.enable_pickup || settings?.enable_fixed_shipping) && (
                    <div className="space-y-2 py-2">
                       <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                          <Truck className="w-3 h-3" /> Modalidade de Entrega
                       </Label>
                       <div className="grid grid-cols-1 gap-2">
                          {settings?.enable_pickup && (
                            <button
                              type="button"
                              onClick={() => setDeliveryMethod(deliveryMethod === "retirada" ? undefined : "retirada")}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                deliveryMethod === "retirada" 
                                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.05)] text-primary' 
                                  : 'bg-muted/20 border-primary/5 hover:border-primary/20 text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                 <MapPin className="w-4 h-4" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Retirada na Loja</span>
                              </div>
                              {deliveryMethod === "retirada" && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}

                          {settings?.enable_fixed_shipping && (
                            <button
                              type="button"
                              onClick={() => setDeliveryMethod(deliveryMethod === "fixo" ? undefined : "fixo")}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                deliveryMethod === "fixo" 
                                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.05)] text-primary' 
                                  : 'bg-muted/20 border-primary/5 hover:border-primary/20 text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                 <Truck className="w-4 h-4" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Entrega Padrão ({formatBRL(settings.fixed_shipping_rate || 0)})</span>
                              </div>
                              {deliveryMethod === "fixo" && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                       </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 h-12 font-black uppercase tracking-widest text-[10px] border-primary/10" onClick={() => onOpenChange(false)}>Descartar</Button>
                    <Button 
                      className="flex-[2] h-12 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                      onClick={() => setConfirmDebitarOpen(true)}
                      disabled={adminCart.length === 0 || isSubmitting}
                    >
                      {isSubmitting ? "Processando..." : "Concluir Venda"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de baixa de estoque */}
      <Dialog open={confirmDebitarOpen} onOpenChange={setConfirmDebitarOpen}>
        <DialogContent className="bg-card text-foreground border-primary/30 max-w-md border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-widest text-primary">Opção de Baixa</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium italic">Deseja debitar os itens do estoque agora?</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
             <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                <p className="text-sm font-bold">Sim, dar baixa:</p>
                <p className="text-xs text-muted-foreground">O pedido será registrado como <strong>CONCLUÍDO</strong> e o estoque será deduzido imediatamente.</p>
             </div>
             <div className="p-4 rounded-xl bg-muted/20 border border-primary/5 space-y-2 opacity-60">
                <p className="text-sm font-bold">Não, deixar pendente:</p>
                <p className="text-xs text-muted-foreground">O pedido será registrado como <strong>PENDENTE</strong>. Você deverá dar baixa manualmente depois.</p>
             </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
             <Button variant="ghost" onClick={() => { setConfirmDebitarOpen(false); handleCreateAdminOrder(false); }} className="font-bold">Sem Baixa</Button>
             <Button onClick={() => { setConfirmDebitarOpen(false); handleCreateAdminOrder(true); }} className="bg-primary text-black font-black uppercase tracking-widest">Dar Baixa Agora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewOrderModal;
