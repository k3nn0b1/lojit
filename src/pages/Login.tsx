import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { setAdminSessionValid, setMasterSessionValid } from "@/App";
import { useTenant } from "@/hooks/use-tenant";

const IS_SUPABASE_READY = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const Login = () => {
  const navigate = useNavigate();
  const { tenantId, isMaster } = useTenant();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (IS_SUPABASE_READY) {
        // 1. Tentar Login oficial do Supabase (Para Master Admins)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: user, password: pass });
        
        if (!authError && authData?.user) {
          const uid = authData.user.id;
          
          // Verificar se é Master Admin (Permissão Global)
          const { data: masterAdmins, error: masterErr } = await supabase
            .from("master_admins")
            .select("user_id")
            .eq("user_id", uid)
            .single();

          if (!masterErr && !!masterAdmins) {
            sessionStorage.setItem("admin_auth", "true");
            setMasterSessionValid(true);
            setAdminSessionValid(true);
            toast.success("Autenticado como Master");
            navigate("/admin");
            return;
          }
        }

        // 2. Se falhar ou não for Master, tentar o Login Simplificado (Tabela public.admins)
        const { data: localAdmin, error: localErr } = await supabase
          .from("admins")
          .select("id")
          .eq("email", user.toLowerCase().trim())
          .eq("password", pass)
          .eq("tenant_id", tenantId)
          .single();

        if (localAdmin) {
          sessionStorage.setItem("admin_auth", "true");
          setAdminSessionValid(true);
          toast.success("Autenticado");
          navigate("/admin");
        } else {
          toast.error("Credenciais inválidas");
        }
      } else {
        if (user === "admin" && pass === "nimda") {
          sessionStorage.setItem("admin_auth", "true");
          setAdminSessionValid(true);
          toast.success("Autenticado");
          navigate("/admin");
        } else {
          toast.error("Credenciais inválidas");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative w-full">
      <Header cartItemCount={0} onCartClick={() => {}} showCart={!isMaster} />
      <div className="flex-grow container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{isMaster ? "Login Master Admin" : "Login do Admin"}</CardTitle>
          </CardHeader>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Usuário</Label>
                <Input value={user} onChange={(e) => setUser(e.target.value)} />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
              </div>
              <div className="flex flex-col items-center gap-4 pt-2">
                <p className="text-xs text-muted-foreground text-center">Sessão expira ao fechar/atualizar a página</p>
                <Button type="submit" disabled={loading} className="w-full md:w-[200px]">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
      <Footer minimal={isMaster} />
    </div>
  );
};

export default Login;