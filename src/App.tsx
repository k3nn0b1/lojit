import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
const TenantNotFound = lazy(() => import("./pages/TenantNotFound"));
const MasterPanel = lazy(() => import("./pages/MasterPanel"));
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { TenantProvider, useTenantContext } from "@/contexts/TenantContext";
import { StoreSettingsProvider, useStoreSettings } from "@/contexts/StoreSettingsContext";
import { checkTenantAdmin } from "@/lib/tenant-queries";
import BackgroundManager from "./components/BackgroundManager";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();


// Variável global que reseta em cada refresh da página (segurança solicitada)
let isSessionValid = false;

export const setAdminSessionValid = (valid: boolean) => {
  isSessionValid = valid;
};

// Variável global para sessão Master (resetada no F5)
let isMasterSessionValid = false;

export const setMasterSessionValid = (valid: boolean) => {
  isMasterSessionValid = valid;
};

const AdminGuard = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const { tenantId } = useTenantContext();

  const IS_SUPABASE_READY = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    const verify = async () => {
      try {
        // Se não houver a flag global, desloga (limpa inclusive o sessionStorage pra garantir)
        if (!isSessionValid) {
          sessionStorage.removeItem("admin_auth");
          if (IS_SUPABASE_READY) {
            await supabase.auth.signOut();
          }
          setIsAuth(false);
          navigate("/login", { replace: true });
          return;
        }

        const sessionFlag = sessionStorage.getItem("admin_auth") === "true";

        if (IS_SUPABASE_READY) {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error && (error as any)?.name !== "AuthSessionMissingError") {
            console.error("Erro ao obter usuário do Supabase:", error);
            toast.error("Falha ao verificar sessão");
            setIsAuth(false);
            navigate("/login", { replace: true });
            return;
          }

          // Verificar se é admin do tenant específico
          let isTenantAdmin = false;
          if (user && tenantId) {
            isTenantAdmin = await checkTenantAdmin(tenantId);
          }

          const ok = !!user && sessionFlag && (isTenantAdmin || isMasterSessionValid);
          setIsAuth(ok);
          if (!ok) navigate("/login", { replace: true });
        } else {
          const ok = sessionFlag;
          setIsAuth(ok);
          if (!ok) navigate("/login", { replace: true });
        }
      } catch (e) {
        console.error("Erro inesperado na verificação do AdminGuard:", e);
        toast.error("Erro ao validar acesso ao admin");
        setIsAuth(false);
        navigate("/login", { replace: true });
      } finally {
        setChecked(true);
      }
    };
    void verify();
  }, [navigate, IS_SUPABASE_READY, tenantId]);

  if (!checked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span style={{ opacity: 0.7, fontSize: '14px' }}>Verificando segurança...</span>
        </div>
      </div>
    );
  }
  return isAuth ? <Admin /> : null;
};

const MasterGuard = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const { isMaster } = useTenantContext();

  const IS_SUPABASE_READY = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    const verify = async () => {
      if (!isMaster) {
          navigate("/", { replace: true });
          return;
      }

      // Segurança: Se não for uma sessão válida (resetada no F5), desloga
      if (!isMasterSessionValid) {
        if (IS_SUPABASE_READY) {
          await supabase.auth.signOut();
        }
        setIsAuth(false);
        navigate("/login", { replace: true });
        return;
      }
      
      try {
        if (IS_SUPABASE_READY) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            navigate("/login", { replace: true });
            return;
          }

          const { data: masterData } = await supabase
            .from("master_admins")
            .select("user_id")
            .eq("user_id", user.id)
            .single();

          const ok = !!masterData;
          setIsAuth(ok);
          if (!ok) navigate("/login", { replace: true });
        } else {
          setIsAuth(true); // Dev mode sem supabase
        }
      } catch (e) {
        navigate("/login", { replace: true });
      } finally {
        setChecked(true);
      }
    };
    void verify();
  }, [navigate, IS_SUPABASE_READY, isMaster]);

  if (!checked) return <div className="min-h-screen bg-[#0a0a0a]" />;
  return isAuth ? <MasterPanel /> : null;
};

const AppContent = () => {
  const { settings, loading: settingsLoading } = useStoreSettings();
  const { isMaster, tenantId, loading: tenantLoading, error: tenantError } = useTenantContext();
  const loading = settingsLoading || tenantLoading;

  // 0. Se o lojista não for encontrado (URL inválida)
  if (tenantError && !isMaster) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
           <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8" />
           </div>
           <h1 className="text-2xl font-black text-white tracking-widest uppercase">PLATAFORMA NÃO REGISTRADA</h1>
           <p className="text-zinc-500 text-sm font-medium">{tenantError}</p>
           <div className="pt-4">
              <Button asChild className="bg-primary hover:bg-primary/90 text-black font-black w-full h-12">
                 <a href="https://lojit.com.br">VOLTAR PARA LOJIT</a>
              </Button>
           </div>
        </div>
      </div>
    );
  }

  // Ainda resolvendo o tenant (apenas para lojas, não para o master)
  if (tenantLoading && !isMaster) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin glow-soft" />
          <div className="flex flex-col items-center gap-2">
            <span className="text-primary font-bold text-xl tracking-[0.2em] animate-pulse">CARREGANDO</span>
            <div className="h-1 w-32 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-progress-loading" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se é o painel master, renderizar rotas do master
  if (isMaster) {
    return (
      <div className="relative min-h-screen flex flex-col">
        <BackgroundManager forceType="bg4" />
        <BrowserRouter>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          }>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<MasterGuard />} />
              <Route path="/" element={<MasterGuard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </div>
    );
  }

  // Tenant não encontrado
  if (tenantError || !tenantId) {
    return (
      <Suspense fallback={null}>
        <TenantNotFound />
      </Suspense>
    );
  }

  // Bloqueia a exibição da LOJA até que o carregamento termine. 
  // O Master Panel ignora essa trava.
  if (!isMaster && (loading || !settings?.store_name)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
           <p className="text-zinc-500 font-mono text-xs animate-pulse">CARREGANDO HUB LOJIT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <BackgroundManager />
      <BrowserRouter>
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin glow-soft" />
          </div>
        }>
          <div className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<AdminGuard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </BrowserRouter>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <StoreSettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </StoreSettingsProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
};


export default App;
