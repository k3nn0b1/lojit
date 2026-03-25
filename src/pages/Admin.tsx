import { useState, useEffect } from "react";
import { supabase, IS_SUPABASE_READY } from "@/lib/supabase";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  parseSupabaseError,
  normalizeProductStock,
  sortSizes,
  sortPedidos
} from "@/lib/utils";
import { uploadToCloudinary, removeFromCloudinary } from "@/lib/cloudinary";
import { AdminProduct, Pedido, Color } from "@/lib/types";
import { useTenant } from "@/hooks/use-tenant";

// Tab Components
import OrdersTab from "@/components/admin/tabs/OrdersTab";
import ProductsTab from "@/components/admin/tabs/ProductsTab";
import StockTab from "@/components/admin/tabs/StockTab";
import SizesTab from "@/components/admin/tabs/SizesTab";
import CategoriesTab from "@/components/admin/tabs/CategoriesTab";
import ColorsTab from "@/components/admin/tabs/ColorsTab";
import ImagesTab from "@/components/admin/tabs/ImagesTab";
import CustomersTab from "@/components/admin/tabs/CustomersTab";
import SettingsTab from "@/components/admin/tabs/SettingsTab";

// Modals
import NewOrderModal from "@/components/admin/modals/NewOrderModal";

const Admin = () => {
  const { tenantId, isReady, loading: tenantLoading } = useTenant();
  const [activeTab, setActiveTab] = useState("pedidos");
  
  // Shared States
  const [storedProducts, setStoredProducts] = useState<AdminProduct[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [globalSizes, setGlobalSizes] = useState<string[]>([]);
  const [globalColors, setGlobalColors] = useState<Color[]>([]);
  
  // UI States
  const [newPedidoOpen, setNewPedidoOpen] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);

  // Cloudinary Config
  const MAX_FILE_SIZE_MB = 5;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const fetchPedidos = async () => {
    if (!IS_SUPABASE_READY) return;
    setRefreshingOrders(true);
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("data_criacao", { ascending: false });

      if (error) throw error;
      if (data) setPedidos(sortPedidos(data as Pedido[]));
    } catch (e: any) {
      toast.error("Erro ao carregar pedidos", { description: parseSupabaseError(e) });
    } finally {
      setRefreshingOrders(false);
    }
  };

  const fetchData = async () => {
    if (!IS_SUPABASE_READY) return;
    try {
      // Products
      const { data: prodData } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: false });
      if (prodData) setStoredProducts(prodData.map(normalizeProductStock));

      // Categories
      const { data: catData } = await supabase
        .from("categories")
        .select("name")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });
      if (catData) setCategories(catData.map((c: any) => c.name));

      // Sizes
      const { data: sizeData } = await supabase
        .from("sizes")
        .select("name")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });
      if (sizeData && sizeData.length > 0) {
        setGlobalSizes(sizeData.map((s: any) => s.name));
      }

      // Colors
      const { data: colorData } = await supabase
        .from("colors")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });
      if (colorData) setGlobalColors(colorData as Color[]);

      // Orders
      await fetchPedidos();
    } catch (e: any) {
      toast.error("Falha ao carregar dados", { description: parseSupabaseError(e) });
    }
  };

  useEffect(() => {
    if (isReady && tenantId) {
      fetchPedidos();
      fetchData();
    }
  }, [isReady, tenantId]);

  if (tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="font-bold text-primary animate-pulse tracking-widest uppercase">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md p-8 rounded-3xl border-2 border-dashed border-primary/20 bg-card">
          <div className="text-4xl text-primary font-black animate-bounce">!</div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-primary">Acesso Negado</h2>
          <p className="text-muted-foreground font-medium italic">Não foi possível identificar sua loja. Verifique o subdomínio e tente novamente.</p>
        </div>
      </div>
    );
  }

  // Realtime Subscriptions
  useEffect(() => {
    if (!IS_SUPABASE_READY || !tenantId) return;

    const productsChannel = supabase
      .channel('products-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenantId}` }, () => {
        void fetchData(); // Simplificado para recarregar tudo em caso de mudança real
      })
      .subscribe();

    const pedidosChannel = supabase
      .channel("pedidos-realtime-admin")
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `tenant_id=eq.${tenantId}` }, () => {
        void fetchPedidos();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(productsChannel);
      void supabase.removeChannel(pedidosChannel);
    };
  }, [tenantId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Saindo...");
    window.location.href = "/login";
  };

  return (
    <div className="flex-1 flex flex-col relative w-full min-h-screen bg-background">
      <Header
        showCart={false}
        rightAction={(
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={handleLogout}>Sair</Button>
        )}
      />
      
      <main className="flex-1 container mx-auto px-4 py-8 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Painel Administrativo</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-auto flex justify-start lg:justify-center overflow-x-auto lg:overflow-x-visible items-center flex-nowrap p-1 bg-muted border border-border shadow-md mb-2 relative">
            <TabsTrigger value="pedidos" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">PEDIDOS</TabsTrigger>
            <TabsTrigger value="products" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">PRODUTOS</TabsTrigger>
            <TabsTrigger value="stock" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">ESTOQUE</TabsTrigger>
            <TabsTrigger value="sizes" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">TAMANHOS</TabsTrigger>
            <TabsTrigger value="images" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">IMAGENS</TabsTrigger>
            <TabsTrigger value="clientes" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">CLIENTES</TabsTrigger>
            <TabsTrigger value="categories" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">CATEGORIAS</TabsTrigger>
            <TabsTrigger value="colors" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">CORES</TabsTrigger>
            <TabsTrigger value="config" className="flex-none py-2.5 px-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">CONFIGURAÇÕES</TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos" className="mt-6">
            <OrdersTab 
              tenantId={tenantId}
              pedidos={pedidos}
              setPedidos={setPedidos}
              storedProducts={storedProducts}
              setStoredProducts={setStoredProducts}
              refreshingOrders={refreshingOrders}
              fetchPedidos={fetchPedidos}
            />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ProductsTab 
              tenantId={tenantId}
              storedProducts={storedProducts}
              setStoredProducts={setStoredProducts}
              categories={categories}
              setCategories={setCategories}
              globalSizes={globalSizes}
              setGlobalSizes={setGlobalSizes}
              globalColors={globalColors}
              setGlobalColors={setGlobalColors}
              uploadToCloudinary={uploadToCloudinary}
              IS_SUPABASE_READY={IS_SUPABASE_READY}
              setActiveTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="stock" className="mt-6">
            <StockTab 
              tenantId={tenantId}
              storedProducts={storedProducts}
              setStoredProducts={setStoredProducts}
              globalSizes={globalSizes}
              globalColors={globalColors}
            />
          </TabsContent>

          <TabsContent value="sizes" className="mt-6">
            <SizesTab tenantId={tenantId} globalSizes={globalSizes} setGlobalSizes={setGlobalSizes} IS_SUPABASE_READY={IS_SUPABASE_READY} />
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <CategoriesTab tenantId={tenantId} categories={categories} setCategories={setCategories} IS_SUPABASE_READY={IS_SUPABASE_READY} />
          </TabsContent>

          <TabsContent value="colors" className="mt-6">
            <ColorsTab tenantId={tenantId} globalColors={globalColors} setGlobalColors={setGlobalColors} IS_SUPABASE_READY={IS_SUPABASE_READY} />
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            <ImagesTab 
              tenantId={tenantId}
              storedProducts={storedProducts} 
              setStoredProducts={setStoredProducts}
              uploadToCloudinary={uploadToCloudinary}
              removeFromCloudinary={removeFromCloudinary}
              IS_SUPABASE_READY={IS_SUPABASE_READY}
            />
          </TabsContent>

          <TabsContent value="clientes" className="mt-6">
            <CustomersTab tenantId={tenantId} IS_SUPABASE_READY={IS_SUPABASE_READY} />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <SettingsTab tenantId={tenantId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Action Button for New Order */}
      {activeTab !== 'config' && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="rounded-full shadow-2xl h-14 px-6 gap-2 font-black uppercase tracking-widest animate-in slide-in-from-bottom-4 duration-500"
            onClick={() => setNewPedidoOpen(true)}
          >
            Novo Pedido
          </Button>
        </div>
      )}

      <NewOrderModal 
        open={newPedidoOpen}
        onOpenChange={setNewPedidoOpen}
        tenantId={tenantId}
        storedProducts={storedProducts}
        setStoredProducts={setStoredProducts}
        setPedidos={setPedidos}
      />

      <div className={activeTab === 'config' ? 'hidden md:block' : ''}>
        <Footer />
      </div>
    </div>
  );
};

export default Admin;
