import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Settings, Globe, Shield, LogOut, Loader2, Link as LinkIcon, Pencil, Check, X, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  active: boolean;
  created_at: string;
}

export default function MasterPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create state
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSlug, setNewTenantSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editCustomDomain, setEditCustomDomain] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

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

      const newTenant = data as Tenant;

      // Criar configurações iniciais essenciais para evitar o carregamento infinito
      const { error: settingsError } = await supabase
        .from("store_settings")
        .insert([{
          tenant_id: newTenant.id,
          store_name: newTenantName,
          primary_color: "#7e3af2", // Roxo padrão ou cor de sua escolha
          footer_info: `© ${new Date().getFullYear()} ${newTenantName}. Todos os direitos reservados.`,
          address: "Endereço da Loja",
          whatsapp: "(75) 00000-0000",
          opening_hours: "Segunda a Sexta: 9h às 18h\nSábado: 9h às 14h"
        }]);

      if (settingsError) {
          console.error("Erro ao criar configurações iniciais:", settingsError);
          toast.warning("Lojista criado, mas as configurações iniciais falharam. Configure manualmente no Admin.");
      } else {
          toast.success("Lojista criado e configurado com sucesso!");
      }

      setTenants([newTenant, ...tenants]);
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

  const handleStartEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditSlug(tenant.slug);
    setEditCustomDomain(tenant.custom_domain || "");
  };

  const handleUpdateTenant = async () => {
    if (!editingTenant) return;
    if (!editName || !editSlug) {
      toast.error("Nome e Slug são obrigatórios");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          name: editName,
          slug: editSlug,
          custom_domain: editCustomDomain || null
        })
        .eq("id", editingTenant.id);

      if (error) throw error;

      toast.success("Lojista atualizado!");
      setTenants(prev => prev.map(t => t.id === editingTenant.id ? { ...t, name: editName, slug: editSlug, custom_domain: editCustomDomain || null } : t));
      setEditingTenant(null);
    } catch (error: any) {
      toast.error("Erro ao atualizar lojista");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm("AVISO CRÍTICO: Issole apagará o lojista permanentemente. Esta ação não pode ser desfeita. Deseja continuar?")) return;
    
    try {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lojista removido");
      setTenants(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      toast.error("Erro ao remover lojista");
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
              <Shield className="w-4 h-4" /> Gerenciamento Centralizado lojit
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
                        .lojit.com.br
                      </div>
                    </div>
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
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3 text-sm text-zinc-400 font-mono">
                          <span className="flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded text-xs">
                            <LinkIcon className="w-3 h-3" /> {tenant.slug}.lojit.com.br
                          </span>
                        </div>
                        {tenant.custom_domain && (
                          <div className="flex items-center gap-2 text-xs text-primary font-bold">
                            <Globe className="w-3 h-3" /> {tenant.custom_domain}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500">Criado em {new Date(tenant.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <Button variant="secondary" size="sm" onClick={() => handleStartEdit(tenant)} className="bg-zinc-800 hover:bg-zinc-700 text-white">
                        <Pencil className="w-3 h-3 mr-2" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700" asChild>
                        <a href={`https://${tenant.slug}.lojit.com.br/admin`} target="_blank" rel="noopener noreferrer">
                          <Settings className="w-3 h-3 mr-2" /> Admin
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700" asChild>
                         <a href={`https://${tenant.slug}.lojit.com.br`} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-3 h-3 mr-2" /> Loja
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTenant(tenant.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" />
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

      {/* Edit Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={(o) => !o && setEditingTenant(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Editar Lojista</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Altere as configurações de domínio e identificação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Loja</Label>
              <Input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="bg-black border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label>Subdomínio (Slug)</Label>
              <Input 
                value={editSlug} 
                onChange={e => setEditSlug(e.target.value.toLowerCase())} 
                className="bg-black border-zinc-800"
              />
              <p className="text-[10px] text-zinc-500">Atual: {editingTenant?.slug}.lojit.com.br</p>
            </div>
            <div className="space-y-2">
              <Label>Domínio Customizado (opcional)</Label>
              <Input 
                placeholder="ex: loja.com.br"
                value={editCustomDomain} 
                onChange={e => setEditCustomDomain(e.target.value.toLowerCase())} 
                className="bg-black border-zinc-800 border-primary/20 focus:border-primary"
              />
              <p className="text-[10px] text-zinc-500">Deixe em branco para usar apenas o subdomínio lojit.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingTenant(null)}>Cancelar</Button>
            <Button onClick={handleUpdateTenant} disabled={isUpdating} className="bg-primary text-black font-bold">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              SALVAR ALTERAÇÕES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
