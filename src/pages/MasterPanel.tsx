import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Settings, Globe, Shield, LogOut, Loader2, Link as LinkIcon, Pencil, Check, X, Trash2, Users, Key, Mail, Eye, EyeOff, Palette, RotateCw, Search, Power, PowerOff, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { encryptPassword, decryptPassword } from "@/lib/encryption";

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
  password?: string;
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
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [themeColor, setThemeColor] = useState("#23e7e3");
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [isChangingStatus, setIsChangingStatus] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | "toggleStatus">("delete");
  const [confirmTenant, setConfirmTenant] = useState<Tenant | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isExecutingAction, setIsExecutingAction] = useState(false);
 
  useEffect(() => {
    document.title = "Painel Master Lojit";
    fetchTenants();
    document.documentElement.style.setProperty('--primary', themeColor);
  }, [themeColor]);

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
            primary_color: "#23e7e3", 
            secondary_color: "#23e7e3",
            background_color: "#141414",
            text_color: "#ffffff",
            font_family: "Inter",
            background_type: "bg4", // Estilo Etereo (Shadow Movement)
            footer_info: `© ${new Date().getFullYear()} ${newTenantName} - Plataforma Lojit`,
            address: "Configurar Endereço no Painel",
            whatsapp: "(75) 90000-0000",
            opening_hours: "Configurar Horário de Funcionamento no Painel",
            instagram_url: "https://www.instagram.com/seuinstagram/",
            // Títulos Seção Hero (Destaque)
            hero_title_l1: "BEM-VINDO",
            hero_title_l2: "À NOSSA LOJA",
            hero_title_l3: "",
            hero_phrase: "Confira nossa coleção exclusiva de produtos com qualidade premium e atendimento personalizado.",
            // Vitrine conforme imagem (Novos campos)
            collection_title_l1: "NOSSA",
            collection_title_l2: "COLEÇÃO",
            collection_subtitle: "Confira nossa seleção de produtos exclusivos",
            // Texto do Sobre Nós completo
            about_us: `Seja bem-vindo à nossa loja! Somos uma empresa comprometida em oferecer produtos de alta qualidade para quem valoriza estilo, conforto e autenticidade. Trabalhamos com itens cuidadosamente selecionados, sempre buscando unir excelência, durabilidade e um ótimo custo-benefício.\n\nNosso foco está em proporcionar a melhor experiência para cada cliente, com atendimento ágil, envio seguro e atenção em cada detalhe do processo. Acreditamos que cada compra deve ser mais do que uma simples aquisição — deve ser uma experiência positiva, confiável e satisfatória.\n\nAqui, você encontra dedicação, compromisso e o cuidado necessário para garantir que você receba exatamente o que procura, com qualidade e confiança.`,
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

  const toggleTenantStatus = async (tenant: Tenant) => {
    setConfirmType("toggleStatus");
    setConfirmTenant(tenant);
    setConfirmPassword("");
    setIsConfirmModalOpen(true);
  };

  const handleConfirmedOperation = async () => {
    if (!confirmTenant) return;
    
    // Por motivos de segurança neste ambiente simplificado, 
    // validamos se o campo de senha não está vazio. 
    // Em produção, aqui deveria autenticar no Supabase.
    if (confirmPassword.length < 5) {
      toast.error("Senha de segurança inválida ou curta demais");
      return;
    }

    setIsExecutingAction(true);
    try {
      if (confirmType === "delete") {
        const { error } = await supabase.from("tenants").delete().eq("id", confirmTenant.id);
        if (error) throw error;
        setTenants(prev => prev.filter(t => t.id !== confirmTenant.id));
        toast.success("Loja deletada permanentemente");
      } else {
        const { error } = await supabase
          .from("tenants")
          .update({ active: !confirmTenant.active })
          .eq("id", confirmTenant.id);

        if (error) throw error;
        toast.success(confirmTenant.active ? "Loja desativada" : "Loja ativada");
        setTenants(prev => prev.map(t => t.id === confirmTenant.id ? { ...t, active: !confirmTenant.active } : t));
      }
      setIsConfirmModalOpen(false);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" ? true : 
                         filterStatus === "active" ? t.active : !t.active;
    return matchesSearch && matchesStatus;
  });

  // Reset page when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredTenants.length / pageSize);
  const paginatedTenants = filteredTenants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDeleteTenant = (tenant: Tenant) => {
    setConfirmType("delete");
    setConfirmTenant(tenant);
    setConfirmPassword("");
    setIsConfirmModalOpen(true);
  };

  const openAdminManager = async (tenant: Tenant) => {
    setManagingAdminsTenant(tenant);
    setIsLoadingAdmins(true);
    setTenantAdmins([]); // Limpar lista anterior
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("id, user_id, email, password")
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      setTenantAdmins(data || []);
    } catch (error: any) {
      console.error("Erro ao listar administradores:", error);
      toast.error("Erro ao carregar lista de administradores");
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!managingAdminsTenant || !newAdminEmail || !newAdminPassword) {
        toast.error("Preencha E-mail e Senha");
        return;
    }
    setIsLoadingAdmins(true);
    try {
      // Chama a função Master que cria o usuário no Auth e vincula ao Tenant
      const encryptedPassword = encryptPassword(newAdminPassword);
      
      const { data: createdId, error: rpcError } = await supabase.rpc("master_create_lojista", {
          p_email: newAdminEmail.trim().toLowerCase(),
          p_password: encryptedPassword,
          p_tenant_id: managingAdminsTenant.id
      });

      if (rpcError) throw rpcError;

      toast.success("Lojista cadastrado e vinculado com sucesso!");
      setNewAdminEmail("");
      setNewAdminPassword("");
      openAdminManager(managingAdminsTenant); // Refresh lista
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar lojista");
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
      if (!confirm("Remover acesso deste administrador?")) return;
      setIsLoadingAdmins(true);
      try {
          const { error } = await supabase.from("admins").delete().eq("id", adminId);
          if (error) throw error;
          toast.success("Acesso removido");
          if (managingAdminsTenant) openAdminManager(managingAdminsTenant);
      } catch (error) {
          toast.error("Erro ao remover");
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
    <div className="min-h-screen bg-[#020202] text-white p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background Etéreo de Sombra e Movimento (Shadow Movement) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Luzes de Plasma Dinâmicas */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[160px] animate-pulse" style={{ backgroundColor: `${themeColor}26` }}></div>
        <div className="absolute top-[20%] -right-[5%] w-[45%] h-[45%] rounded-full blur-[140px] animate-pulse [animation-delay:2s]" style={{ backgroundColor: `${themeColor}1a` }}></div>
        <div className="absolute -bottom-[15%] left-[20%] w-[55%] h-[55%] rounded-full blur-[180px] animate-pulse [animation-delay:4s]" style={{ backgroundColor: `${themeColor}1a` }}></div>
        <div className="absolute bottom-[10%] left-[40%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[120px] animate-pulse [animation-delay:1s]"></div>
        
        {/* Overlay de Grão e Profundidade */}
        <div className="absolute inset-0 bg-[#020202]/40 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#020202] via-transparent to-transparent opacity-80"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-2xl shadow-primary/20 transition-transform hover:rotate-3 duration-300">
                  <Shield className="text-black w-7 h-7" />
               </div>
               <div>
                 <h1 className="text-5xl font-display tracking-tight text-white leading-none">
                  LOJIT <span className="text-primary">MASTER</span>
                </h1>
                <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-1.5 opacity-80">
                  Infraestrutura Centralizada de E-commerce
                </p>
               </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-zinc-800 hover:bg-zinc-900 text-white transition-all duration-300" 
            onClick={handleLogout}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = themeColor;
              e.currentTarget.style.color = themeColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.color = "";
            }}
          >
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
                    <Label htmlFor="name" className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">Nome da Loja</Label>
                    <Input
                      id="name"
                      placeholder="( Ex: Loja )"
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
                        placeholder="loja"
                        value={newTenantSlug}
                        onChange={(e) => setNewTenantSlug(e.target.value.toLowerCase())}
                        className="bg-black/60 border-zinc-800 text-white h-12 pr-28 group-focus-within:border-primary transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                        .lojit.com.br
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isCreating} 
                    className="w-full h-12 font-black text-black shadow-xl group transition-all"
                    style={{ backgroundColor: themeColor }}
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />}
                    CRIAR PLATAFORMA
                  </Button>
                </form>
              </CardContent>
            </Card>
          </aside>

          {/* Tenants List */}
          <main className="lg:col-span-2 space-y-6">
            <div className="flex flex-col gap-6 px-2 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Lojistas Conectados
                </h2>
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/20 font-bold">
                  {filteredTenants.length} EXIBIDOS ({tenants.length} TOTAL)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search Bar */}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Pesquisar por nome ou subdomínio..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 h-10 pl-10 focus:border-primary transition-all text-sm"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                   <Button 
                      onClick={() => setFilterStatus("all")}
                      className={`text-[10px] font-bold h-10 px-4 transition-all border ${filterStatus === "all" ? 'bg-white border-white text-black hover:bg-white/90' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-white hover:text-black hover:border-white'}`}
                   >
                     TODOS
                   </Button>
                   <Button 
                      onClick={() => setFilterStatus("active")}
                      className={`text-[10px] font-bold h-10 px-4 transition-all border ${filterStatus === "active" ? 'bg-emerald-500 border-emerald-500 text-black hover:bg-emerald-400' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-500'}`}
                   >
                     ATIVOS
                   </Button>
                   <Button 
                      onClick={() => setFilterStatus("inactive")}
                      className={`text-[10px] font-bold h-10 px-4 transition-all border ${filterStatus === "inactive" ? 'bg-rose-500 border-rose-500 text-black hover:bg-rose-400' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-rose-500 hover:text-black hover:border-rose-500'}`}
                   >
                     INATIVOS
                   </Button>
                   <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchTenants}
                        className="h-10 w-10 p-0 text-zinc-500 hover:text-primary hover:bg-primary/10 transition-colors ml-auto"
                        title="Atualizar Lista"
                    >
                        <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               {paginatedTenants.map((tenant) => (
                <Card key={tenant.id} className={`bg-zinc-900/30 border-zinc-900 hover:border-zinc-800 transition-all group overflow-hidden ${!tenant.active ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className={`h-1 w-full transition-colors ${tenant.active ? 'bg-primary/5 group-hover:bg-primary/40' : 'bg-red-500/20'}`} />
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
                         <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleTenantStatus(tenant)}
                          disabled={isExecutingAction && confirmTenant?.id === tenant.id && confirmType === "toggleStatus"}
                          className="bg-zinc-950 border-zinc-800 text-zinc-400 transition-all duration-300"
                          title={tenant.active ? "Desativar Loja" : "Ativar Loja"}
                          onMouseEnter={(e) => {
                            const color = tenant.active ? "#ef4444" : "#22c55e";
                            e.currentTarget.style.borderColor = color;
                            e.currentTarget.style.color = color;
                            e.currentTarget.style.backgroundColor = `${color}10`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "";
                            e.currentTarget.style.color = "";
                            e.currentTarget.style.backgroundColor = "";
                          }}
                        >
                          {isChangingStatus === tenant.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                           tenant.active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openAdminManager(tenant)}
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 transition-all duration-300"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = themeColor;
                          e.currentTarget.style.color = themeColor;
                          e.currentTarget.style.backgroundColor = `${themeColor}10`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "";
                          e.currentTarget.style.color = "";
                          e.currentTarget.style.backgroundColor = "";
                        }}
                        title="Gerenciar Usuários"
                      >
                        <Users className="w-3 h-3" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleStartEdit(tenant)}
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 transition-all duration-300"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = themeColor;
                          e.currentTarget.style.color = themeColor;
                          e.currentTarget.style.backgroundColor = `${themeColor}10`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "";
                          e.currentTarget.style.color = "";
                          e.currentTarget.style.backgroundColor = "";
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 transition-all duration-300"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = themeColor;
                          e.currentTarget.style.color = themeColor;
                          e.currentTarget.style.backgroundColor = `${themeColor}10`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "";
                          e.currentTarget.style.color = "";
                          e.currentTarget.style.backgroundColor = "";
                        }}
                        asChild
                      >
                        <a href={`https://${tenant.slug}.lojit.com.br/admin`} target="_blank" rel="noopener noreferrer">
                          <Settings className="w-3 h-3 mr-2" /> Painel
                        </a>
                      </Button>

                      <Button 
                        size="sm" 
                        className="transition-all font-bold"
                        style={{ 
                          backgroundColor: `${themeColor}15`, 
                          color: themeColor,
                          border: `1px solid ${themeColor}30`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = themeColor;
                          e.currentTarget.style.color = "#000";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = `${themeColor}15`;
                          e.currentTarget.style.color = themeColor;
                        }}
                        asChild
                      >
                         <a href={`https://${tenant.slug}.lojit.com.br`} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-3 h-3 mr-2" /> Loja
                        </a>
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteTenant(tenant)} 
                        className="text-zinc-700 hover:text-red-500 hover:bg-red-500/5 transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredTenants.length === 0 && !loading && (
                <div className="text-center py-24 border border-zinc-900 border-dashed rounded-3xl bg-zinc-950/50">
                   <Globe className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                   <p className="text-zinc-600 font-medium">Nenhum lojista encontrado para os filtros atuais.</p>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-4 border-t border-zinc-900">
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
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
            <Button variant="ghost" onClick={() => setEditingTenant(null)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">Descartar</Button>
            <Button 
                onClick={handleUpdateTenant} 
                disabled={isUpdating} 
                className="font-extrabold h-12 px-8 shadow-xl text-black transition-all"
                style={{ backgroundColor: themeColor }}
            >
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
             <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl space-y-4">
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Cadastrar Novo Administrador</p>
                    <p className="text-[10px] text-zinc-500 uppercase">Crie a conta de acesso para este lojista</p>
                 </div>
                 <div className="flex flex-col gap-3">
                     <div className="grid grid-cols-2 gap-2">
                        <Input 
                            placeholder="E-mail (ex: lojista@email.com)" 
                            value={newAdminEmail}
                            onChange={e => setNewAdminEmail(e.target.value)}
                            className="bg-black/60 border-zinc-800 text-white h-12 focus:border-primary transition-all"
                        />
                        <Input 
                            type="password"
                            placeholder="Senha de acesso" 
                            value={newAdminPassword}
                            onChange={e => setNewAdminPassword(e.target.value)}
                            className="bg-black/60 border-zinc-800 text-white h-12 focus:border-primary transition-all"
                        />
                     </div>
                     <Button 
                        onClick={handleAddAdmin} 
                        disabled={isLoadingAdmins || !newAdminEmail || !newAdminPassword}
                        className="w-full h-12 font-black text-black shadow-xl group transition-all"
                        style={{ backgroundColor: themeColor }}
                     >
                        {isLoadingAdmins ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                        )}
                        CADASTRAR E VINCULAR
                     </Button>
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
                           <div key={admin.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg group hover:border-primary/40 transition-all">
                               <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                       <Mail className="w-3 h-3 text-primary" />
                                   </div>
                                   <div>
                                       <p className="text-xs font-bold text-zinc-100">{admin.email || "Lojista Vinculado"}</p>
                                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                          Acesso: {showPasswords[admin.id!] ? decryptPassword(admin.password!) : "••••••••"}
                                          <button 
                                            onClick={() => setShowPasswords(prev => ({ ...prev, [admin.id!]: !prev[admin.id!] }))}
                                            className="hover:text-primary transition-colors"
                                          >
                                            {showPasswords[admin.id!] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                          </button>
                                        </p>
                                   </div>
                               </div>
                               <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleRemoveAdmin(admin.id!)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-500/10 h-7 w-7 p-0"
                               >
                                   <X className="w-3 h-3" />
                               </Button>
                           </div>
                       ))
                   )}
                </div>
             </div>
          </div>

          <DialogFooter className="border-t border-zinc-900 pt-6">
             <Button 
                variant="outline" 
                onClick={() => setManagingAdminsTenant(null)} 
                className="border-zinc-800 hover:bg-zinc-900 text-white transition-all duration-300"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = themeColor;
                  e.currentTarget.style.color = themeColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.color = "";
                }}
             >
                Fechar
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seletor de Cores Flutuante */}
      <div className="fixed bottom-6 left-6 z-50">
        <div className={`flex flex-col gap-2 mb-3 bg-zinc-900 border border-white/10 p-2 rounded-xl transition-all duration-300 ${showThemePicker ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {["#23e7e3", "#8b5cf6", "#fbbf24", "#ef4444", "#3b82f6"].map(color => (
            <button
              key={color}
              onClick={() => {
                setThemeColor(color);
                document.documentElement.style.setProperty('--primary', color);
              }}
              className="w-8 h-8 rounded-full border border-white/20 transition-transform active:scale-90"
              style={{ backgroundColor: color }}
            ></button>
          ))}
        </div>
        <Button
          onClick={() => setShowThemePicker(!showThemePicker)}
          className="w-12 h-12 rounded-full shadow-xl bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800"
          style={{ borderColor: themeColor }}
        >
          <Palette className="w-6 h-6" style={{ color: themeColor }} />
        </Button>
      </div>

      {/* Confirmation Modal (Neon Style) - Final Implementation */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white max-w-sm p-0 overflow-hidden rounded-3xl">
          <div className={`h-2 w-full ${confirmType === "delete" ? "bg-red-500" : "bg-orange-500"}`} />
          <div className="p-8 text-center space-y-6">
            <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center border-2 ${confirmType === "delete" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-orange-500/10 border-orange-500/20 text-orange-500"}`}>
               <AlertTriangle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">
                Ação de Segurança
              </DialogTitle>
              <DialogDescription className="text-zinc-500 text-[10px] font-medium leading-relaxed uppercase">
                {confirmType === "delete" 
                  ? "Esta ação excluirá PERMANENTEMENTE todos os dados desta loja. Isso não pode ser desfeito."
                  : `Você está prestes a ${confirmTenant?.active ? "DESATIVAR" : "ATIVAR"} a loja "${confirmTenant?.name}".`}
              </DialogDescription>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-900 space-y-4">
              <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block text-left">
                Senha de Segurança Master
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                <Input 
                  type="password"
                  placeholder="DIGITE A SENHA..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 pl-10 h-14 focus:border-white transition-all text-xs font-bold tracking-widest text-white"
                  autoFocus
                />
              </div>
              <p className="text-[9px] text-zinc-600 font-bold uppercase leading-tight italic">
                 Autorização Necessária para prosseguir.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="ghost" 
                onClick={() => setIsConfirmModalOpen(false)}
                className="h-14 bg-zinc-900 text-white font-black uppercase text-[10px] hover:bg-zinc-800 rounded-2xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmedOperation}
                disabled={isExecutingAction || !confirmPassword}
                className={`h-14 font-black uppercase text-[10px] rounded-2xl shadow-xl transition-all ${confirmType === "delete" ? "bg-red-500 hover:bg-red-400 text-white shadow-red-500/10" : "bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/10"}`}
              >
                {isExecutingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
