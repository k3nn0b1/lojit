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
import { formatBRL } from "@/lib/utils";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";


// Mock products data
const mockProducts: Product[] = [
  {
    id: 1,
    name: "Brasil - Seleção Brasileira Home 2024",
    category: "Seleções",
    price: 149.9,
    image: "https://i.postimg.cc/4dSLpb95/selecao-home.jpg",
    sizes: ["P", "M", "G", "GG"],
    stock: 5,
  },
  {
    id: 2,
    name: "Real Madrid Home 2024",
    category: "Clubes Europeus",
    price: 179.9,
    image: "https://i.postimg.cc/W3HW06kf/real-home.jpg",
    sizes: ["P", "M", "G", "GG"],
    stock: 0,
  },
  {
    id: 3,
    name: "Flamengo Home 2024",
    category: "Clubes Brasileiros",
    price: 139.9,
    image: "https://i.postimg.cc/j5FgyQ7W/flamengo-home.jpg",
    sizes: ["P", "M", "G"],
    stock: 12,
  },
  {
    id: 4,
    name: "Argentina Away 2024",
    category: "Seleções",
    price: 149.9,
    image: "https://i.postimg.cc/9MMg4Nry/argentina-away.jpg",
    sizes: ["P", "M", "G", "GG"],
    stock: 8,
  },
  {
    id: 5,
    name: "Manchester United Retrô 1999",
    category: "Retrô",
    price: 199.9,
    image: "https://i.postimg.cc/MTFP1bQR/man-retro.jpg",
    sizes: ["P", "M", "G", "GG"],
    stock: 2,
  },
  {
    id: 6,
    name: "Barcelona Home 2024",
    category: "Clubes Europeus",
    price: 179.9,
    image: "https://i.postimg.cc/HxhZb4y8/barca-home.jpg",
    sizes: ["GG"],
    stock: 1,
  },
  {
    id: 7,
    name: "Palmeiras Home 2024",
    category: "Clubes Brasileiros",
    price: 139.9,
    image: "https://i.postimg.cc/vBNq5LVV/palmeiras-home.jpg",
    sizes: ["P", "G", "GG"],
    stock: 0,
  },
  {
    id: 8,
    name: "PSG Away 2024",
    category: "Clubes Europeus",
    price: 179.9,
    image: "https://i.postimg.cc/Qty4ckTg/psg-away.jpg",
    sizes: ["P", "M", "G"],
    stock: 6,
  },
];

const Index = () => {
  useEffect(() => {
    AOS.init({ duration: 800, once: true, offset: 40, easing: "ease-out-cubic" });
    AOS.refresh();
  }, []);

  const { settings, loading: settingsLoading } = useStoreSettings();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(mockProducts);

  if (settingsLoading && !settings) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-primary/70 font-display tracking-widest text-sm animate-pulse">CARREGANDO...</span>
      </div>
    );
  }


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
    const load = async () => {
      const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (hasSupabase) {
        try {
          const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("id", { ascending: false });
          if (!error && data) {
            // Normaliza stockBySize (cast para number) e recalcula stock quando necessário
            const normalized = (data as any[]).map((p) => {
              const stockBySizeObj = p.stockBySize && typeof p.stockBySize === "object"
                ? Object.fromEntries(
                    Object.entries(p.stockBySize).map(([k, v]) => [k, Number((v as any) ?? 0)])
                  )
                : undefined;
              const totalFromSizes = stockBySizeObj
                ? Object.values(stockBySizeObj).reduce((sum, n) => sum + Number(n ?? 0), 0)
                : undefined;
              return {
                ...p,
                stockBySize: stockBySizeObj,
                stock:
                  totalFromSizes !== undefined && totalFromSizes > 0
                    ? totalFromSizes
                    : (typeof p.stock === "number" ? p.stock : 0),
              } as Product;
            });
            setProducts(sortProducts(normalized));
          }
        } catch {}
        // Subscrição realtime de produtos
        const channel = supabase
          .channel("products-realtime-index")
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, (payload: any) => {
            const newRow = payload.new;
            if (!newRow) return;
            const stockBySizeObj = newRow.stockBySize && typeof newRow.stockBySize === "object"
              ? Object.fromEntries(Object.entries(newRow.stockBySize).map(([k, v]) => [k, Number((v as any) ?? 0)]))
              : undefined;
            const totalFromSizes = stockBySizeObj
              ? Object.values(stockBySizeObj).reduce((sum, n) => sum + Number(n ?? 0), 0)
              : undefined;
            const norm = {
              ...newRow,
              stockBySize: stockBySizeObj,
              stock: totalFromSizes !== undefined && totalFromSizes > 0 ? totalFromSizes : (typeof newRow.stock === 'number' ? newRow.stock : 0),
            } as Product;
            setProducts(prev => sortProducts([norm, ...prev.filter(p => p.id !== norm.id)]));
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload: any) => {
            const newRow = payload.new;
            if (!newRow) return;
            const stockBySizeObj = newRow.stockBySize && typeof newRow.stockBySize === "object"
              ? Object.fromEntries(Object.entries(newRow.stockBySize).map(([k, v]) => [k, Number((v as any) ?? 0)]))
              : undefined;
            const totalFromSizes = stockBySizeObj
              ? Object.values(stockBySizeObj).reduce((sum, n) => sum + Number(n ?? 0), 0)
              : undefined;
            const norm = {
              ...newRow,
              stockBySize: stockBySizeObj,
              stock: totalFromSizes !== undefined && totalFromSizes > 0 ? totalFromSizes : (typeof newRow.stock === 'number' ? newRow.stock : 0),
            } as Product;
            setProducts(prev => sortProducts(prev.map(p => p.id === norm.id ? norm : p)));
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'products' }, (payload: any) => {
            const oldRow = payload.old;
            if (!oldRow) return;
            setProducts(prev => sortProducts(prev.filter(p => p.id !== oldRow.id)));
          })
          .subscribe();
        return () => { try { supabase.removeChannel(channel); } catch {} };
      }
      // Sem Supabase: usar apenas produtos mockados
      setProducts(sortProducts(mockProducts));
    };
    const unsub = load();
    return () => { /* caso load tenha retornado uma cleanup de canal */ };
  }, []);

  const getMaxStockFor = (product: Product, size: string) => {
    const bySize = product.stockBySize?.[size];
    if (typeof bySize === "number") return bySize;
    if (typeof product.stock === "number") return product.stock;
    return Number.POSITIVE_INFINITY;
  };

  const handleAddToCart = (product: Product, size: string) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id && item.size === size);
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
          item.id === product.id && item.size === size
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
          image: product.image,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (id: number, size: string, quantity: number) => {
    if (quantity === 0) {
      handleRemoveItem(id, size);
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
      prev.map((item) => (item.id === id && item.size === size ? { ...item, quantity: nextQty } : item))
    );
  };

  const handleRemoveItem = (id: number, size: string) => {
    setCartItems((prev) => prev.filter((item) => !(item.id === id && item.size === size)));
  };

  const normalizePhone = (raw: string) => raw.replace(/\D+/g, "");

  // Polyfill simples de UUID v4 para ambientes sem crypto.randomUUID
  const generateUUID = () => {
  // Retorna string no formato xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  let dt = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  const r = (dt + Math.random() * 16) % 16 | 0;
  dt = Math.floor(dt / 16);
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
  };

  const handleCheckout = async (clienteNome: string, clienteTelefone: string) => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Montar payload de pedido
    const itens = cartItems.map((item) => ({
      produto: item.name,
      tamanho: item.size,
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
          await supabase.from("clientes").insert({ nome: clienteNome, telefone: normalizePhone(clienteTelefone) });
        } catch {}


        const { error } = await supabase
          .from("pedidos")
          .insert({
            id: uuid,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            itens,
            valor_total: total,
            status: "pendente",
          });
        if (error) throw error;
        pedidoId = uuid;
      } catch (e: any) {
        toast.error("Falha ao registrar pedido", { description: e?.message });
      }
    }

    const message = `🛍️ *Novo Pedido - FUT75 Store*\n\nCliente: ${clienteNome}\nTelefone: ${clienteTelefone}\n\n${cartItems
      .map(
        (item) =>
          `• ${item.name}\n  Tamanho: ${item.size}\n  Qtd: ${item.quantity}\n  Subtotal: ${formatBRL(item.price * item.quantity)}`
      )
      .join("\n\n")}\n\n💰 *TOTAL: ${formatBRL(total)}*\n\nPedido ID: ${pedidoId ?? "—"}`;

    const cleanPhone = (settings?.whatsapp || "5575981284738").replace(/\D/g, "");
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;


    // Esvaziar o carrinho e fechar o modal antes de redirecionar para o WhatsApp
    setCartItems([]);
    setIsCartOpen(false);

    window.location.href = whatsappUrl;
  };

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen relative">
      <FootballBackground />

      <div className="relative z-10">
        <Header cartItemCount={cartItemCount} onCartClick={() => setIsCartOpen(true)} />
        <Hero />
        <ProductGrid products={products} onAddToCart={handleAddToCart} />

        {/* Sobre Nós */}
        <section
          id="about"
          className="container mx-auto px-4 py-12 md:py-16 scroll-mt-24 md:scroll-mt-32"
          data-aos="fade-up"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Sobre nós</h2>
          <div className="max-w-3xl mx-auto text-muted-foreground text-center leading-relaxed space-y-4">
            {(settings?.about_us || "").split('\n').map((text, i) => (
              <p key={i}>{text}</p>
            ))}
          </div>
        </section>


        {/* Localização / Mapa */}
        <section className="container mx-auto px-4 py-8 md:py-12" data-aos="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Localização</h2>
          <div className="relative w-full h-[420px] md:h-[700px] rounded-xl shadow-lg overflow-hidden ring-1 ring-white/10" style={{ filter: "invert(100%) hue-rotate(180deg)" }}>
            <iframe
              title="Mapa - Localização"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(settings?.address || "Adenil Falcão, 1887 Feira de Santana")}&t=&z=17&ie=UTF8&iwloc=B&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </section>
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
