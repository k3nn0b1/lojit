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
import { StoreSettingsProvider } from "@/contexts/StoreSettingsContext";

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

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<AdminGuard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StoreSettingsProvider>
    </QueryClientProvider>
  );
};


export default App;
