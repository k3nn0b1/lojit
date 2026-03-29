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
import CustomersTab from "@/components/admin/tabs/CustomersTab";
import DashboardTab from "@/components/admin/tabs/DashboardTab";
import SettingsTab from "@/components/admin/tabs/SettingsTab";
import DeliveryTab from "@/components/admin/tabs/DeliveryTab";

// Modals
import NewOrderModal from "@/components/admin/modals/NewOrderModal";

const Admin = () => {
  const { tenant, tenantId, isReady, loading: tenantLoading } = useTenant();
  const [activeTab, setActiveTab] = useState("pedidos");
  const [activeCatalogTab, setActiveCatalogTab] = useState("products");
  
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
      fetchData(); // fetchData já chama fetchPedidos internamente
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
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 mb-16 md:mb-12 max-w-7xl">
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <h1 className="text-xl md:text-3xl font-black uppercase tracking-[0.2em] text-primary">Painel Elite</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-auto flex flex-wrap md:flex-nowrap justify-center items-center p-1.5 bg-muted/20 border border-primary/5 rounded-2xl shadow-2xl mb-12 relative max-w-4xl mx-auto gap-1">
            <TabsTrigger value="pedidos" className="flex-1 py-3 px-2 md:px-4 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-black">PEDIDOS</TabsTrigger>
            <TabsTrigger value="catalogo" className="flex-1 py-3 px-2 md:px-4 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-black">GESTÃO</TabsTrigger>
            <TabsTrigger value="clientes" className="flex-1 py-3 px-2 md:px-4 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-black">CRM</TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 py-3 px-2 md:px-4 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-black">RELATÓRIOS</TabsTrigger>
            <TabsTrigger value="config" className="flex-1 py-3 px-2 md:px-4 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-black">SETUP</TabsTrigger>
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

          <TabsContent value="catalogo" className="mt-0 space-y-6">
            <Tabs value={activeCatalogTab} onValueChange={setActiveCatalogTab} className="w-full">
              <div className="w-full relative mb-6">
                 <div className="w-full overflow-x-auto scrollbar-hide pb-2 flex lg:justify-center px-1">
                    <TabsList className="bg-muted/10 p-1.5 rounded-xl border border-primary/5 h-auto flex flex-nowrap !justify-start items-center py-1 px-2 gap-1 min-w-max">
                       <TabsTrigger value="products" className="py-2.5 px-4 whitespace-nowrap rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">Produtos</TabsTrigger>
                       <TabsTrigger value="stock" className="py-2.5 px-4 whitespace-nowrap rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">Estoque</TabsTrigger>
                       <TabsTrigger value="sizes" className="py-2.5 px-4 whitespace-nowrap rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">Grades</TabsTrigger>
                       <TabsTrigger value="categories" className="py-2.5 px-4 whitespace-nowrap rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">Categorias</TabsTrigger>
                       <TabsTrigger value="colors" className="py-2.5 px-4 whitespace-nowrap rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">Cores</TabsTrigger>
                    </TabsList>
                 </div>
              </div>

              <TabsContent value="products">
                <ProductsTab 
                  tenantId={tenantId}
                  storedProducts={storedProducts}
                  setStoredProducts={setStoredProducts}
                  tenant={tenant}
                  categories={categories}
                  setCategories={setCategories}
                  globalSizes={globalSizes}
                  setGlobalSizes={setGlobalSizes}
                  globalColors={globalColors}
                  setGlobalColors={setGlobalColors}
                  uploadToCloudinary={uploadToCloudinary}
                  IS_SUPABASE_READY={IS_SUPABASE_READY}
                  setActiveTab={(tab) => {
                    if (['products', 'stock', 'sizes', 'categories', 'colors'].includes(tab)) {
                      setActiveCatalogTab(tab);
                      setActiveTab('catalogo');
                    } else {
                      setActiveTab(tab);
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="stock">
                <StockTab 
                  tenantId={tenantId}
                  storedProducts={storedProducts}
                  setStoredProducts={setStoredProducts}
                  globalSizes={globalSizes}
                  setGlobalSizes={setGlobalSizes}
                  globalColors={globalColors}
                  setGlobalColors={setGlobalColors}
                  categories={categories}
                  setCategories={setCategories}
                  uploadToCloudinary={uploadToCloudinary}
                  removeFromCloudinary={removeFromCloudinary}
                />
              </TabsContent>

              <TabsContent value="sizes">
                <SizesTab tenantId={tenantId} globalSizes={globalSizes} setGlobalSizes={setGlobalSizes} IS_SUPABASE_READY={IS_SUPABASE_READY} />
              </TabsContent>

              <TabsContent value="categories">
                <CategoriesTab tenantId={tenantId} categories={categories} setCategories={setCategories} IS_SUPABASE_READY={IS_SUPABASE_READY} />
              </TabsContent>

              <TabsContent value="colors">
                <ColorsTab tenantId={tenantId} globalColors={globalColors} setGlobalColors={setGlobalColors} IS_SUPABASE_READY={IS_SUPABASE_READY} />
              </TabsContent>


            </Tabs>
          </TabsContent>

          <TabsContent value="clientes" className="mt-6">
            <CustomersTab 
              tenantId={tenantId} 
              IS_SUPABASE_READY={IS_SUPABASE_READY} 
              pedidos={pedidos}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardTab 
              tenantId={tenantId} 
              IS_SUPABASE_READY={IS_SUPABASE_READY}
              storedProducts={storedProducts}
            />
          </TabsContent>


          <TabsContent value="config" className="mt-6">
            <SettingsTab tenantId={tenantId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Action Button for New Order */}
      {activeTab !== 'config' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-50 w-[calc(100%-3rem)] md:w-auto">
          <Button
            size="lg"
            className="w-full md:w-auto rounded-2xl md:rounded-full shadow-[0_0_40px_rgba(var(--primary),0.3)] h-16 md:h-18 px-8 gap-3 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] active:scale-95 transition-all animate-in slide-in-from-bottom-8 duration-700 bg-primary text-black border-4 border-black/10"
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
