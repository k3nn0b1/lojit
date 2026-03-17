import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Settings, Globe, Shield, LogOut, Loader2, Link as LinkIcon } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default function MasterPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSlug, setNewTenantSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar lojistas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Slug validation (only letter, numbers and hiphen)
    if (!/^[a-z0-9-]+$/.test(newTenantSlug)) {
        toast.error("Slug inválido. Use apenas letras minúsculas, números e hífens.");
        return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .insert([{ name: newTenantName, slug: newTenantSlug }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Lojista criado com sucesso!");
      setTenants([data, ...tenants]);
      setNewTenantName("");
      setNewTenantSlug("");
    } catch (error: any) {
      if (error.code === "23505") {
          toast.error("Este slug já está em uso.");
      } else {
          toast.error("Erro ao criar lojista");
      }
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-inter">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              PAINEL MASTER
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" /> Gerenciamento Centralizado FUT75
            </p>
          </div>
          <Button variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair do Painel
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Tenant Form */}
          <aside className="lg:col-span-1">
            <Card className="bg-zinc-900/50 border-zinc-800 shadow-2xl backdrop-blur-sm sticky top-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Plus className="w-5 h-5 text-primary" /> Novo Lojista
                </CardTitle>
                <CardDescription className="text-zinc-400 text-sm">
                  Crie uma nova instância da loja.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTenant} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-300">Nome da Loja</Label>
                    <Input
                      id="name"
                      placeholder="Ex: My Store"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      className="bg-black/40 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-zinc-300">Subdomínio (Slug)</Label>
                    <div className="relative">
                      <Input
                        id="slug"
                        placeholder="mystore"
                        value={newTenantSlug}
                        onChange={(e) => setNewTenantSlug(e.target.value.toLowerCase())}
                        className="bg-black/40 border-zinc-700 text-white pl-3 pr-24"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                        .fut75.com.br
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      * O slug será usado na URL. Ex: mystore.fut75.com.br
                    </p>
                  </div>
                  <Button type="submit" disabled={isCreating} className="w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    CRIAR LOJISTA
                  </Button>
                </form>
              </CardContent>
            </Card>
          </aside>

          {/* Tenants List */}
          <main className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> Lojistas Ativos ({tenants.length})
              </h2>
              <Button variant="ghost" size="sm" onClick={fetchTenants} className="text-zinc-400 hover:text-white">
                Atualizar
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tenants.map((tenant) => (
                <Card key={tenant.id} className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all hover:bg-zinc-900/60 group">
                  <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{tenant.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-zinc-400">
                        <span className="flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded text-xs font-mono">
                          <LinkIcon className="w-3 h-3" /> {tenant.slug}.fut75.com.br
                        </span>
                        <span className="text-[10px]">Criado em {new Date(tenant.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Button variant="outline" size="sm" className="flex-1 md:flex-none bg-zinc-800 border-zinc-700 hover:bg-zinc-700" asChild>
                        <a href={`https://${tenant.slug}.fut75.com.br/admin`} target="_blank" rel="noopener noreferrer">
                          <Settings className="w-3 h-3 mr-2" /> Acessar Admin
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 md:flex-none bg-zinc-800 border-zinc-700 hover:bg-zinc-700" asChild>
                         <a href={`https://${tenant.slug}.fut75.com.br`} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-3 h-3 mr-2" /> Ver Loja
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {tenants.length === 0 && !loading && (
                <div className="text-center py-20 border border-zinc-800 border-dashed rounded-xl">
                  <p className="text-zinc-500">Nenhum lojista cadastrado ainda.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
