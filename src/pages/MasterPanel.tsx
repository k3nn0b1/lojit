import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Settings, Globe, Shield, LogOut, Loader2, Link as LinkIcon, Pencil, Check, X, Trash2, Users, Key } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  active: boolean;
  created_at: string;
}

interface AdminUser {
  id?: string;
  user_id: string;
  email?: string;
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

  // Admin Management state
  const [managingAdminsTenant, setManagingAdminsTenant] = useState<Tenant | null>(null);
  const [tenantAdmins, setTenantAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  useEffect(() => {
    // Segurança: Logout no F5 (limpa o estado temporário se desejar ser agressivo)
    // Para implementar o logout no F5, verificamos se é o primeiro carregamento
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
      // 1. Criar o Tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .insert([{ name: newTenantName, slug: newTenantSlug }])
        .select()
        .single();

      if (tenantError) throw tenantError;

      const newTenant = tenantData as Tenant;

      try {
        // 2. Criar BLUEPRINT COMPLETO lojit (Configurações Padrão Conforme Imagens)
        const { error: settingsError } = await supabase
          .from("store_settings")
          .insert([{
            tenant_id: newTenant.id,
            store_name: newTenantName,
            primary_color: "#08c0d9", 
            secondary_color: "#08c0d9",
            background_color: "#000000",
            text_color: "#ffffff",
            font_family: "Inter",
            background_type: "bg3", // Corresponde ao estilo Etereo/Shadow
            footer_info: `© ${new Date().getFullYear()} ${newTenantName} - Plataforma Lojit`,
            address: "Configurar Endereço no Painel",
            whatsapp: "(75) 90000-0000",
            opening_hours: "Configurar Horário de Funcionamento no Painel",
            instagram_url: "https://www.instagram.com/seuinstagram/",
            // Títulos conforme imagem
            hero_title_l1: "TITULO",
            hero_title_l2: "SUBTITULO",
            hero_title_l3: "COMPLEMENTO",
            hero_phrase: "Subtítulo da página principal",
            // Texto do Sobre Nós completo
            about_us: `Somos uma empresa comprometida em oferecer produtos de alta qualidade para quem valoriza estilo, conforto e autenticidade. Trabalhamos com itens cuidadosamente selecionados, sempre buscando unir excelência, durabilidade e um ótimo custo-benefício.\n\nNosso foco está em proporcionar a melhor experiência para cada cliente, com atendimento ágil, envio seguro e atenção em cada detalhe do processo. Acreditamos que cada compra deve ser mais do que uma simples aquisição — deve ser uma experiência positiva, confiável e satisfatória.\n\nAqui, você encontra dedicação, compromisso e o cuidado necessário para garantir que você receba exatamente o que procura, com qualidade e confiança.`,
            // Flags de visibilidade
            show_whatsapp: true,
            show_instagram: true,
            show_youtube: false,
            cta_text: "VER PRODUTOS"
          }]);

        if (settingsError) throw settingsError;

        // 3. Vincular o MASTER ADMIN atual
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from("admins").insert([{
                user_id: user.id,
                tenant_id: newTenant.id
            }]);
        }

        toast.success("Plataforma criada com sucesso!");
        setTenants([newTenant, ...tenants]);
        setNewTenantName("");
        setNewTenantSlug("");
      } catch (innerError: any) {
        // Erro críco ao criar blueprint: deletar o tenant para não deixar lixo e liberar o slug
        await supabase.from("tenants").delete().eq("id", newTenant.id);
        throw innerError;
      }
    } catch (error: any) {
      if (error.code === "23505") {
          toast.error("Este subdomínio (slug) já está sendo usado por outra loja. Escolha um nome diferente.");
      } else {
          toast.error("Erro ao criar lojista e blueprint. Verifique os dados.");
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
      fetchTenants(); // Recarregar lista
      setEditingTenant(null);
    } catch (error) {
      toast.error("Erro ao atualizar");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm("AVISO: Isso deletará permanentemente a loja e seus dados. Continuar?")) return;
    try {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
      toast.success("Loja removida");
      setTenants(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  // Admin Management Functions
  const openAdminManager = async (tenant: Tenant) => {
    setManagingAdminsTenant(tenant);
    setIsLoadingAdmins(true);
    try {
      const { data, error } = await supabase
        .from("admins")
        .select(`
            id,
            user_id
        `)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      setTenantAdmins(data || []);
    } catch (error) {
      toast.error("Erro ao listar administradores");
    } finally {
      setIsLoadingAdmins(false);
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
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                  <Shield className="text-black w-6 h-6" />
               </div>
               <h1 className="text-4xl font-display font-black tracking-tighter text-white">
                lojit<span className="text-primary italic">.master</span>
              </h1>
            </div>
            <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase">
              Infraestrutura Centralizada de E-commerce
            </p>
          </div>
          <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900 text-zinc-400" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Tenant Form */}
          <aside className="lg:col-span-1">
            <Card className="bg-zinc-900/50 border-zinc-800/50 shadow-2xl backdrop-blur-xl border-t-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Plus className="w-5 h-5 text-primary" /> Novo Lojista
                </CardTitle>
                <CardDescription className="text-zinc-500 text-xs">
                  A nova loja virá com o Blueprint visual da lojit por padrão.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTenant} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">Nome da Operação</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Suzarte Cell"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      className="bg-black/60 border-zinc-800 text-white h-12 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">Subdomínio (Slug)</Label>
                    <div className="relative group">
                      <Input
                        id="slug"
                        placeholder="suzartecell"
                        value={newTenantSlug}
                        onChange={(e) => setNewTenantSlug(e.target.value.toLowerCase())}
                        className="bg-black/60 border-zinc-800 text-white h-12 pr-28 group-focus-within:border-primary transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                        .lojit.com.br
                      </div>
                    </div>
                  </div>
                  <Button type="submit" disabled={isCreating} className="w-full h-12 font-black bg-primary hover:bg-primary/90 text-black shadow-xl shadow-primary/20 group">
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />}
                    CRIAR PLATAFORMA
                  </Button>
                </form>
              </CardContent>
            </Card>
          </aside>

          {/* Tenants List */}
          <main className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-4 h-4" /> Lojistas Conectados
              </h2>
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/20 font-bold">
                {tenants.length} TOTAL
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tenants.map((tenant) => (
                <Card key={tenant.id} className="bg-zinc-900/30 border-zinc-900 hover:border-zinc-800 transition-all group overflow-hidden">
                  <div className="h-1 w-full bg-primary/5 group-hover:bg-primary/40 transition-colors" />
                  <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                         <h3 className="text-xl font-black text-white">{tenant.name}</h3>
                         {!tenant.active && <span className="text-[8px] bg-red-500/20 text-red-500 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Inativo</span>}
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-primary font-bold">
                           <LinkIcon className="w-3 h-3" />
                           {tenant.slug}.lojit.com.br
                        </div>
                        {tenant.custom_domain && (
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                            <Globe className="w-3 h-3 text-zinc-600" /> {tenant.custom_domain}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <Button variant="outline" size="sm" onClick={() => handleStartEdit(tenant)} className="bg-zinc-950 border-zinc-800 hover:border-primary/50 text-zinc-400 hover:text-primary">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="bg-zinc-950 border-zinc-800 hover:border-primary/50 text-zinc-400 hover:text-primary" asChild>
                        <a href={`https://${tenant.slug}.lojit.com.br/admin`} target="_blank" rel="noopener noreferrer">
                          <Settings className="w-3 h-3 mr-2" /> Painel
                        </a>
                      </Button>
                      <Button size="sm" className="bg-primary/10 hover:bg-primary hover:text-black text-primary border border-primary/20 transition-all font-bold" asChild>
                         <a href={`https://${tenant.slug}.lojit.com.br`} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-3 h-3 mr-2" /> Loja
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTenant(tenant.id)} className="text-zinc-600 hover:text-red-500 hover:bg-red-500/5">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {tenants.length === 0 && !loading && (
                <div className="text-center py-24 border border-zinc-900 border-dashed rounded-3xl bg-zinc-950/50">
                   <Globe className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                   <p className="text-zinc-600 font-medium">Inicie sua rede criando o primeiro lojista.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={(o) => !o && setEditingTenant(null)}>
        <DialogContent className="bg-[#0a0a0a] border-zinc-800 text-white shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Editar Extensões</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-1">
              Gerencie a identidade e o roteamento da plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Apelido da Loja</Label>
              <Input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="bg-black border-zinc-800 h-12 focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Subdomínio (Slug)</Label>
                <Input 
                  value={editSlug} 
                  onChange={e => setEditSlug(e.target.value.toLowerCase())} 
                  className="bg-black border-zinc-800 h-12 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Domínio Próprio</Label>
                <Input 
                  placeholder="ex: loja.com.br"
                  value={editCustomDomain} 
                  onChange={e => setEditCustomDomain(e.target.value.toLowerCase())} 
                  className="bg-black border-zinc-700 h-12 focus:border-primary"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-zinc-900 pt-6">
            <Button variant="ghost" onClick={() => setEditingTenant(null)} className="text-zinc-500">Descartar</Button>
            <Button onClick={handleUpdateTenant} disabled={isUpdating} className="bg-primary text-black font-extrabold h-12 px-8 shadow-lg shadow-primary/20">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              ATUALIZAR PLATAFORMA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Management Dialog */}
      <Dialog open={!!managingAdminsTenant} onOpenChange={(o) => !o && setManagingAdminsTenant(null)}>
        <DialogContent className="bg-[#0a0a0a] border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Administradores - {managingAdminsTenant?.name}</DialogTitle>
            <DialogDescription className="text-zinc-500">
               Controle quem pode acessar o painel administrativo deste lojista.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
             <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl space-y-3">
                 <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Vincular Novo Administrador</p>
                 <div className="flex gap-2 text-xs">
                     <p className="text-zinc-500">Atualmente, apenas administradores já existentes no Supabase podem ser vinculados. Para novas senhas, use o painel de autenticação do Supabase.</p>
                 </div>
             </div>

             <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase">Usuários com Acesso</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                   {isLoadingAdmins ? (
                       <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-zinc-700" /></div>
                   ) : tenantAdmins.length === 0 ? (
                       <div className="text-center py-10 text-zinc-600 text-sm border border-zinc-900 border-dashed rounded-xl">Nenhum admin vinculado.</div>
                   ) : (
                       tenantAdmins.map(admin => (
                           <div key={admin.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg group">
                               <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                       <Key className="w-3 h-3 text-primary" />
                                   </div>
                                   <div>
                                       <p className="text-xs font-mono text-zinc-400">{admin.user_id}</p>
                                   </div>
                               </div>
                               <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-500/10 h-7 w-7 p-0">
                                   <X className="w-3 h-3" />
                               </Button>
                           </div>
                       ))
                   )}
                </div>
             </div>
          </div>

          <DialogFooter className="border-t border-zinc-900 pt-6">
             <Button variant="outline" onClick={() => setManagingAdminsTenant(null)} className="border-zinc-800 hover:bg-zinc-900">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
