import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { StoreSettingsProvider, useStoreSettings } from "@/contexts/StoreSettingsContext";
import BackgroundManager from "./components/BackgroundManager";

const queryClient = new QueryClient();


// Variável global que reseta em cada refresh da página (segurança solicitada)
let isSessionValid = false;

export const setAdminSessionValid = (valid: boolean) => {
  isSessionValid = valid;
};

const AdminGuard = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

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
          const ok = !!user && sessionFlag; // Exige os dois agora
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
  }, [navigate, IS_SUPABASE_READY]);

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

const AppContent = () => {
  const { settings, loading } = useStoreSettings();

  // Bloqueia a exibição até que o carregamento termine E tenhamos o nome da loja real.
  // Isso evita o flash verde (cores padrão do CSS) e flashes de conteúdo vazio.
  if (loading || !settings?.store_name) {
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

  return (
    <div className="relative min-h-screen">
      <BackgroundManager />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminGuard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </StoreSettingsProvider>
    </QueryClientProvider>
  );
};


export default App;
