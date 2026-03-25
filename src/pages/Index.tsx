import { useState, useEffect } from "react";
import FootballBackground from "@/components/FootballBackground";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import Cart, { CartItem } from "@/components/Cart";
import Footer from "@/components/Footer";
import { Product } from "@/components/ProductCard";
import AOS from "aos";
import "aos/dist/aos.css";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatBRL, normalizePhone, generateUUID, normalizeProductStock } from "@/lib/utils";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";
import { useTenant } from "@/hooks/use-tenant";


// Mock products data
const mockProducts: Product[] = [
  {
    id: 1,
    name: "Produto Premium 01",
    category: "Novidades",
    price: 149.9,
    image: "/placeholder.png",
    sizes: ["P", "M", "G", "GG"],
    stock: 5,
  },
  {
    id: 2,
    name: "Produto Premium 02",
    category: "Mais Vendidos",
    price: 179.9,
    image: "/placeholder.png",
    sizes: ["P", "M", "G", "GG"],
    stock: 0,
  },
  {
    id: 3,
    name: "Produto Exclusivo 03",
    category: "Novidades",
    price: 139.9,
    image: "/placeholder.png",
    sizes: ["P", "M", "G"],
    stock: 12,
  },
  {
    id: 4,
    name: "Produto Exclusivo 04",
    category: "Mais Vendidos",
    price: 149.9,
    image: "/placeholder.png",
    sizes: ["P", "M", "G", "GG"],
    stock: 8,
  },
];

const Index = () => {
  useEffect(() => {
    AOS.init({ duration: 800, once: true, offset: 40, easing: "ease-out-cubic" });
    AOS.refresh();
  }, []);

  const { settings, loading: settingsLoading } = useStoreSettings();
  const { tenantId } = useTenant();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(mockProducts);




  // Ordena produtos colocando esgotados (stock <= 0) por último e, dentro dos grupos, por id desc
  const sortProducts = (list: Product[]) => {
    return [...list].sort((a, b) => {
      const aOut = Number(a.stock ?? 0) <= 0;
      const bOut = Number(b.stock ?? 0) <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return (b.id ?? 0) - (a.id ?? 0);
    });
  };

  useEffect(() => {
    let channel: any;
    const load = async () => {
      const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (hasSupabase && tenantId) {
        try {
          const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("id", { ascending: false });
          if (!error && data) {
            const normalized = (data as any[]).map(p => normalizeProductStock(p) as Product);
            setProducts(sortProducts(normalized));
          } else {
            setProducts([]); // Nova loja = sem produtos
          }
        } catch {
            setProducts([]);
        }
        
        channel = supabase
          .channel("products-realtime-index")
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, (payload: any) => {
            const newRow = payload.new;
            if (!newRow) return;
            const norm = normalizeProductStock(newRow) as Product;
            setProducts(prev => sortProducts([norm, ...prev.filter(p => p.id !== norm.id)]));
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload: any) => {
            const newRow = payload.new;
            if (!newRow) return;
            const norm = normalizeProductStock(newRow) as Product;
            setProducts(prev => sortProducts(prev.map(p => p.id === norm.id ? norm : p)));
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'products' }, (payload: any) => {
            const oldRow = payload.old;
            if (!oldRow) return;
            setProducts(prev => sortProducts(prev.filter(p => p.id !== oldRow.id)));
          })
          .subscribe();
      } else {
        setProducts(sortProducts(mockProducts));
      }
    };
    load();
    return () => { 
      if (channel) supabase.removeChannel(channel); 
    };
  }, [tenantId]);

  useEffect(() => {
    if (!settingsLoading) {
      setTimeout(() => {
        AOS.refresh();
      }, 500); // 500ms para garantir que o DOM renderizou
    }
  }, [settingsLoading]);

  const getMaxStockFor = (product: Product, size: string) => {
    const bySize = product.stockBySize?.[size];
    if (typeof bySize === "number") return bySize;
    if (typeof product.stock === "number") return product.stock;
    return Number.POSITIVE_INFINITY;
  };

  const handleAddToCart = (product: Product, size: string, color?: string) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id && item.size === size && item.color === color);
      const currentQty = existingItem?.quantity ?? 0;
      const maxStock = getMaxStockFor(product, size);

      if (currentQty >= maxStock) {
        toast.error("Limite de estoque atingido", {
          description: `Máximo disponível para ${product.name} (tamanho ${size}): ${maxStock}`,
        });
        return prev; // não adiciona
      }

      if (existingItem) {
        return prev.map((item) =>
          item.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: Math.min(item.quantity + 1, maxStock) }
            : item
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          size,
          color,
          image: product.image,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (id: number, size: string, quantity: number, color?: string) => {
    if (quantity === 0) {
      handleRemoveItem(id, size, color);
      return;
    }

    const product = products.find((p) => p.id === id);
    const maxStock = product ? getMaxStockFor(product, size) : Number.POSITIVE_INFINITY;
    const nextQty = Math.min(quantity, maxStock);
    if (nextQty < quantity) {
      toast.error("Limite de estoque atingido", {
        description: `Máximo disponível: ${maxStock}`,
      });
    }

    setCartItems((prev) =>
      prev.map((item) => (item.id === id && item.size === size && item.color === color ? { ...item, quantity: nextQty } : item))
    );
  };

  const handleRemoveItem = (id: number, size: string, color?: string) => {
    setCartItems((prev) => prev.filter((item) => !(item.id === id && item.size === size && item.color === color)));
  };

  const handleCheckout = async (clienteNome: string, clienteTelefone: string, deliveryMethod?: string, bairroEntrega?: string, freteValor?: number, formaPagamento?: string | { method: string; value: number }[], endereco?: string) => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + (freteValor || 0);

    // Montar payload de pedido
    const itens = cartItems.map((item) => ({
      produto: item.name,
      tamanho: item.size,
      cor: item.color || null,
      quantidade: item.quantity,
      product_id: item.id,
      preco_unitario: item.price,
    }));

    const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    let pedidoId: string | null = null;

    if (hasSupabase) {
      try {
        const uuid = typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
          ? (crypto as any).randomUUID()
          : generateUUID();
        // Inserir cliente apenas se telefone ainda não existir (ignorar conflito)
        try {
          // Note: sem ignoreDuplicates, apenas capturamos o erro
          await supabase.from("clientes").insert({ nome: clienteNome, telefone: normalizePhone(clienteTelefone), tenant_id: tenantId });
        } catch {}

        const mappedFormaPgto = Array.isArray(formaPagamento) 
          ? formaPagamento.map(p => `${p.method}: ${formatBRL(p.value)}`).join(' + ')
          : formaPagamento;

        const { error } = await supabase
          .from("pedidos")
          .insert({
            id: uuid,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            itens,
            valor_total: total,
            status: "pendente",
            delivery_method: deliveryMethod,
            frete_valor: freteValor || 0,
            bairro_entrega: bairroEntrega,
            forma_pagamento: mappedFormaPgto,
            endereco: endereco,
            tenant_id: tenantId,
          });
        if (error) throw error;
        pedidoId = uuid;
      } catch (e: any) {
        toast.error("Falha ao registrar pedido", { description: e?.message });
      }
    }

    const deliveryText = deliveryMethod === "retirada" 
      ? "\n*Entrega: Retirada (Grátis)*" 
      : deliveryMethod === "fixo"
        ? `\n*Entrega: Padrão (${formatBRL(settings?.fixed_shipping_rate || 0)})*\nEndereço: ${endereco}`
        : deliveryMethod === "bairro"
          ? `\n*Entrega: ${bairroEntrega}${freteValor === 0 && bairroEntrega === "Outros" ? " (A combinar)" : ` (${formatBRL(freteValor || 0)})` }*\nEndereço: ${endereco}`
          : "";

    let pagamentoText = "";
    if (formaPagamento) {
      if (Array.isArray(formaPagamento)) {
        pagamentoText = "\n*Pagamento Composto:*";
        formaPagamento.forEach(p => {
          pagamentoText += `\n- ${p.method}: ${formatBRL(p.value)}`;
        });
      } else {
        pagamentoText = `\n*Pagamento: ${formaPagamento}*`;
      }
    }

    const message = `*Novo Pedido - ${settings?.store_name || "Loja"}*\n\nCliente: ${clienteNome}\nTelefone: ${clienteTelefone}${deliveryText}${pagamentoText}\n\n${cartItems
      .map(
        (item) =>
          `• ${item.name}\n  Tamanho: ${item.size}${item.color ? `\n  Cor: ${item.color}` : ""}\n  Qtd: ${item.quantity}\n  Subtotal: ${formatBRL(item.price * item.quantity)}`
      )
      .join("\n\n")}\n\n *TOTAL: ${formatBRL(total)}*`;

    const cleanPhone = (settings?.whatsapp || "5575999999999").replace(/\D/g, "");
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;


    // Esvaziar o carrinho e fechar o modal antes de redirecionar para o WhatsApp
    setCartItems([]);
    setIsCartOpen(false);

    window.location.href = whatsappUrl;
  };

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (settingsLoading && !settings?.store_name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground font-medium animate-pulse text-sm tracking-widest uppercase">Carregando</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full relative bg-transparent flex flex-col">
      <div className="relative z-10 flex flex-col flex-grow">
        <Header cartItemCount={cartItemCount} onCartClick={() => setIsCartOpen(true)} />
        <div className="flex-grow">
        <Hero />
        <header className="text-center space-y-4 mb-8 md:mb-10 relative pt-10 md:pt-20">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/10 blur-[100px] rounded-full" />
          <h2 className="text-5xl md:text-8xl font-black uppercase leading-[0.85] flex flex-col items-center justify-center">
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{settings?.collection_title_l1 || "NOSSA"}</span>
            <span className="text-primary glow-text drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)] tracking-tighter">{settings?.collection_title_l2 || "COLEÇÃO"}</span>
          </h2>
          <p className="text-zinc-500 font-medium tracking-[0.3em] uppercase text-[10px] md:text-sm max-w-sm mx-auto mt-6">
            {settings?.collection_subtitle || "Confira nossa seleção de produtos exclusivos"}
          </p>
        </header>
        <ProductGrid products={products} onAddToCart={handleAddToCart} />

        {/* Sobre Nós */}
        <section
          id="about"
          className="container mx-auto px-4 py-12 md:py-16 scroll-mt-24 md:scroll-mt-32"
          data-aos="fade-up"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Sobre nós</h2>
          <div className="max-w-3xl mx-auto text-muted-foreground text-center leading-relaxed space-y-4">
            {(settings?.about_us || "Seja bem-vindo à nossa loja! Estamos preparando o melhor conteúdo para você. Em breve, mais informações sobre nossa história e valores.").split('\n').filter(Boolean).map((text, i) => (
              <p key={i}>{text}</p>
            ))}
          </div>
        </section>


        <section className="container mx-auto px-4 py-16 md:py-24" data-aos="fade-up">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-white leading-none">
              LOCALIZAÇÃO
            </h2>
            <div className="h-1 w-20 bg-primary mx-auto mt-4 rounded-full" />
          </div>
          <div className="relative w-full h-[400px] md:h-[600px] rounded-3xl shadow-2xl overflow-hidden border-2 border-primary/20 group">
            {/* Efeito de overlay para deixar o mapa com aspecto dark de verdade */}
            <div className="absolute inset-0 bg-background/20 pointer-events-none z-10 transition-opacity group-hover:bg-transparent" />
            <iframe
              title="Mapa - Localização"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(settings?.address || "Feira de Santana, Bahia")}&t=&z=16&ie=UTF8&iwloc=B&output=embed`}
              className="w-full h-full border-0 grayscale-[0.8] contrast-[1.1] brightness-[0.9]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-primary/30 rounded-3xl" />
          </div>
        </section>
        </div>
        <Footer />
      </div>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default Index;
