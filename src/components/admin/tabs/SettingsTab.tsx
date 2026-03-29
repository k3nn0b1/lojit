import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";
import { hexToHSL, hslStringToHex } from "@/lib/colors";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { formatPhoneMask } from "@/lib/utils";
import { Loader2, Upload, Instagram, Settings, Layout, Palette, Phone, Globe, Save, CreditCard, Trash2, Plus, Search, Wallet, MapPin, Truck, ExternalLink, TrendingUp, X, Pencil } from "lucide-react";
import { WhatsappIcon } from "../../icons/WhatsappIcon";
import { YoutubeIcon } from "../../icons/YoutubeIcon";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { FormaPagamento } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DeliveryTab from "./DeliveryTab";

interface SettingsTabProps {
  tenantId: string;
}

const PaymentManagement = ({ tenantId }: { tenantId: string }) => {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFormaName, setNewFormaName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchFormas();
  }, [tenantId]);

  const fetchFormas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("formas_pagamento")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    
    if (data) setFormas(data);
    setLoading(false);
  };

  const handleSave = async () => {
    const name = newFormaName.trim().toUpperCase();
    if (!name) return;
    setAdding(true);
    
    if (editingId) {
      const { error } = await supabase
        .from("formas_pagamento")
        .update({ name })
        .eq("id", editingId);

      if (error) {
        toast.error("Erro ao atualizar modalidade");
      } else {
        setFormas(prev => prev.map(f => f.id === editingId ? { ...f, name } : f).sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Modalidade atualizada!");
        setEditingId(null);
        setNewFormaName("");
      }
    } else {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .insert({
          name,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao adicionar forma de pagamento");
      } else {
        setFormas(prev => [...prev, data as FormaPagamento].sort((a, b) => a.name.localeCompare(b.name)));
        setNewFormaName("");
        toast.success("Forma de pagamento adicionada!");
      }
    }
    setAdding(false);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("formas_pagamento")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Erro ao remover forma de pagamento");
    } else {
      setFormas(prev => prev.filter(f => f.id !== id));
      toast.success("Forma de pagamento removida");
    }
  };

  const filteredFormas = formas.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-primary/5">
           <div className="space-y-1">
             <h3 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-primary leading-tight">Meios de Pagamento</h3>
             <p className="text-[9px] md:text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">Configure as opções disponíveis no checkout</p>
           </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40" />
            <Input 
              placeholder="PESQUISAR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 bg-background/50 border-primary/10 rounded-2xl pl-14 font-black uppercase text-xs focus:ring-primary/20 shadow-xl"
            />
          </div>
       </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] bg-muted/10 border border-primary/5 shadow-2xl">
          <div className="space-y-1.5 flex-1">
            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2">
              {editingId ? "Editando Nome" : "Label de Identificação (Ex: PIX, CARTÃO...)"}
            </Label>
            <Input 
              placeholder="Digite aqui..." 
              value={newFormaName}
              onChange={(e) => setNewFormaName(e.target.value)}
              className="h-12 md:h-14 bg-background border-primary/10 rounded-xl md:rounded-2xl px-6 text-xs md:text-sm font-black focus:ring-primary/20 shadow-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
                 onKeyDown={(e) => e.key === 'Enter' && handleSave()}
               />
             </div>
             <div className="flex gap-2 min-w-fit">
               <Button 
                 onClick={handleSave}
                 disabled={adding || !newFormaName.trim()}
                 className={`flex-1 md:flex-none h-12 md:h-14 px-8 font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2 ${
                    editingId ? "bg-green-500 hover:bg-green-600 text-black" : "bg-primary text-black shadow-xl shadow-primary/20"
                 }`}
               >
                 {adding ? "..." : editingId ? <><Save className="w-4 h-4" /> Salvar</> : <><Plus className="w-4 h-4" /> Adicionar</>}
               </Button>
               {editingId && (
                 <Button variant="ghost" onClick={() => { setEditingId(null); setNewFormaName(""); }} className="h-12 md:h-14 w-12 md:w-14 rounded-xl md:rounded-2xl opacity-40 text-foreground border border-white/10">
                    <X className="w-5 h-5" />
                 </Button>
               )}
             </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
          {loading ? (
             Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-[2rem] bg-muted/5 animate-pulse" />)
          ) : filteredFormas.length > 0 ? (
            filteredFormas.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-muted/5 border border-primary/5 hover:border-primary/20 transition-all group hover:translate-y-[-4px] shadow-xl">
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                       <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                       <p className="text-sm font-black uppercase tracking-widest">{f.name}</p>
                       <span className="text-[9px] font-black text-muted-foreground opacity-40 uppercase">Ativo no Sistema</span>
                    </div>
                 </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setEditingId(f.id); setNewFormaName(f.name); }}
                      className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(f.id)}
                      className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-20 italic">
               <CreditCard className="w-16 h-16 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma modalidade configurada</p>
            </div>
          )}
       </div>
    </div>
  );
};

export default function SettingsTab({ tenantId }: SettingsTabProps) {
  const { settings, loading, updateSettings } = useStoreSettings();
  const [formData, setFormData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);

  useEffect(() => {
    if (formData?.logo_url) {
      extractColors(formData.logo_url);
    }
  }, [formData?.logo_url]);

  const extractColors = (url: string) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      const imageData = ctx.getImageData(0, 0, 50, 50).data;
      const colorCounts: Record<string, number> = {};

      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];

        if (a < 128) continue;
        const roundedR = Math.round(r / 15) * 15;
        const roundedG = Math.round(g / 15) * 15;
        const roundedB = Math.round(b / 15) * 15;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (luminance < 0.1 || luminance > 0.9) continue;

        const hex = `#${((1 << 24) + (roundedR << 16) + (roundedG << 8) + roundedB).toString(16).slice(1)}`;
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }
      const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(entry => entry[0]);
      setSuggestedColors(sorted);
    };
  };

  useEffect(() => {
    if (!settings) return;
    const getHex = (colorStr: string | undefined) => {
      if (!colorStr) return "#000000";
      if (colorStr.startsWith('#')) return colorStr;
      try { return hslStringToHex(colorStr); } catch (e) { return "#000000"; }
    };
    setFormData({
      ...settings,
      primary_hex: getHex(settings.primary_color),
      secondary_hex: getHex(settings.secondary_color),
      background_hex: getHex(settings.background_color),
      background_type: settings.background_type || "solid",
      background_config: settings.background_config || {}
    });
  }, [settings]);

  if (loading || !formData) return (
    <div className="flex items-center justify-center py-40">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-30" />
    </div>
  );

  const handleSave = async () => {
    try {
      const payload = {
          ...formData,
          primary_color: hexToHSL(formData.primary_hex),
          secondary_color: hexToHSL(formData.secondary_hex),
          background_color: hexToHSL(formData.background_hex),
      };
      if (payload.instagram_url && !payload.instagram_url.startsWith('http')) {
        const handle = payload.instagram_url.startsWith('@') ? payload.instagram_url.substring(1) : payload.instagram_url;
        payload.instagram_url = `https://www.instagram.com/${handle}/`;
      }
      const { primary_hex, secondary_hex, background_hex, ...finalPayload } = payload;
      await updateSettings(finalPayload);
      toast.success("Configurações aplicadas com sucesso!");
    } catch (error) {
      toast.error("Erro ao sincronizar dados");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, path: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
        const { secure_url } = await uploadToCloudinary(file, path);
        setFormData({...formData, [field]: secure_url});
        toast.success("Mídia atualizada no servidor!");
    } catch {
        toast.error("Erro no upload da mídia");
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="space-y-10 pb-32">
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="bg-muted/10 p-2 rounded-[2.5rem] border border-primary/10 mb-10 h-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 w-full lg:w-fit lg:mx-auto gap-2 shadow-2xl backdrop-blur-md">
          {[
            { id: "geral", label: "Geral", icon: Globe },
            { id: "contato", label: "Contatos", icon: Phone },
            { id: "identidade", label: "Branding", icon: Palette },
            { id: "secoes", label: "Layout", icon: Layout },
            { id: "pagamento", label: "Pagamento", icon: CreditCard },
            { id: "entrega", label: "Entrega", icon: Truck },
            { id: "outros", label: "Avançado", icon: Settings }
          ].map(t => (
            <TabsTrigger key={t.id} value={t.id} className="rounded-2xl px-4 md:px-8 h-12 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all flex items-center gap-2">
              <t.icon className="w-3.5 h-3.5 hidden sm:block" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <Card className="bg-card/20 backdrop-blur-md border-primary/10 shadow-3xl overflow-hidden rounded-[3rem]">
          <CardContent className="p-0">
            {/* Aba Geral Elite */}
            <TabsContent value="geral" className="p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-6 duration-700">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-primary/5">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <Globe className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl uppercase tracking-[0.2em] text-primary leading-tight">Geral & Localização</h3>
                      <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">Base de dados institucionais do empreendimento</p>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Título Comercial da Loja</Label>
                        <Input value={formData.store_name} onChange={e => setFormData({...formData, store_name: e.target.value})} className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black text-xl px-8 shadow-2xl focus:ring-primary/20" />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Logotipo Master</Label>
                        <div className="p-8 rounded-[3rem] border border-primary/5 bg-background/40 flex flex-col items-center gap-8 group hover:bg-background/60 transition-all shadow-3xl">
                             {formData.logo_url ? (
                                <div className="relative group p-6 bg-white/5 rounded-3xl shadow-inner border border-white/5">
                                     <img src={formData.logo_url} className="h-28 w-auto object-contain drop-shadow-[0_0_20px_rgba(var(--primary),0.3)] group-hover:scale-105 transition-transform duration-500" />
                                </div>
                             ) : (
                                <div className="h-28 w-28 rounded-3xl border-2 border-dashed border-primary/20 flex items-center justify-center text-primary/20 italic font-black">NO_LOGO</div>
                             )}
                             <Label htmlFor="logo-up" className="w-full flex items-center justify-center h-14 rounded-2xl bg-primary text-black hover:bg-primary/90 cursor-pointer transition-all gap-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95">
                                <Upload className="w-5 h-5" /> {uploading ? "SINCRONIZANDO..." : "ATUALIZAR MARCA"}
                                <input id="logo-up" type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'logo_url', 'store/logo')} />
                             </Label>
                        </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Endereço de Operação</Label>
                        <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black text-sm px-8 shadow-2xl" placeholder="EX: RUA DAS PALMEIRAS, 150 - CENTRO" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Horários de Atendimento Comercial</Label>
                        <Textarea value={formData.opening_hours} onChange={e => setFormData({...formData, opening_hours: e.target.value})} className="min-h-[200px] bg-background/50 border-primary/5 rounded-[2.5rem] p-8 text-sm font-medium resize-none shadow-2xl leading-relaxed focus:ring-primary/20" />
                    </div>
                  </div>
               </div>
            </TabsContent>

            {/* Aba Contato Elite */}
            <TabsContent value="contato" className="p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-6 duration-700">
               <div className="flex items-center gap-5 pb-8 border-b border-primary/5">
                  <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Phone className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl uppercase tracking-[0.2em] text-primary leading-tight">Canais de Contato</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">Configuração de presença digital e suporte</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { icon: <WhatsappIcon className="w-6 h-6" />, label: "WhatsApp", field: 'whatsapp', showField: 'show_whatsapp', placeholder: "EX: 5511999999999" },
                    { icon: <Instagram className="w-6 h-6" />, label: "Instagram", field: 'instagram_url', showField: 'show_instagram', placeholder: "@SUALOJA" },
                    { icon: <YoutubeIcon className="w-6 h-6" />, label: "YouTube", field: 'youtube_url', showField: 'show_youtube', placeholder: "CANAL OFICIAL" }
                  ].map(item => (
                    <div key={item.field} className="p-10 rounded-[3rem] bg-muted/10 border border-primary/5 space-y-8 hover:shadow-[0_0_40px_rgba(var(--primary),0.05)] transition-all shadow-xl group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-primary group-hover:scale-110 transition-transform">
                                <div className="p-3 rounded-2xl bg-primary/10">{item.icon}</div>
                                <span className="text-sm font-black uppercase tracking-[0.2em]">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-background/50 border border-primary/5 shadow-inner">
                                <span className="text-[8px] font-black uppercase text-muted-foreground">ATIVO</span>
                                <Switch checked={formData[item.showField]} onCheckedChange={v => setFormData({...formData, [item.showField]: v})} className="scale-90" />
                            </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest ml-1">Protocolo de Link</Label>
                           {item.field === 'whatsapp' ? (
                             <Input 
                                  value={formatPhoneMask(formData[item.field] || "")} 
                                  onChange={e => setFormData({...formData, [item.field]: e.target.value.replace(/\D/g, "")})} 
                                  placeholder="(00) 00000-0000"
                                  className="h-14 bg-background border-none rounded-2xl font-black text-xs px-6 shadow-2xl focus:ring-primary/20"
                              />
                           ) : (
                             <Input 
                                  value={formData[item.field]} 
                                  onChange={e => setFormData({...formData, [item.field]: e.target.value})} 
                                  placeholder={item.placeholder}
                                  className="h-14 bg-background border-none rounded-2xl font-black text-xs px-6 shadow-2xl focus:ring-primary/20"
                              />
                           )}
                        </div>
                    </div>
                  ))}
               </div>
            </TabsContent>

            {/* Aba Identidade Visual Elite */}
            <TabsContent value="identidade" className="p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-6 duration-700">
               <div className="flex items-center gap-5 pb-8 border-b border-primary/5">
                  <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Palette className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl uppercase tracking-[0.2em] text-primary leading-tight">Branding & Estética</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">Cromatismo e algoritmos visuais do painel</p>
                  </div>
               </div>

               <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: "Cor Primária", field: 'primary_hex', desc: "Botões e Destaques" },
                        { label: "Cor Secundária", field: 'secondary_hex', desc: "Suporte e Hover" },
                        { label: "Fundo Base", field: 'background_hex', desc: "Estrutura do Site" }
                    ].map(c => (
                        <div key={c.field} className="p-8 rounded-[2.5rem] bg-muted/10 border border-primary/5 flex items-center gap-8 group hover:bg-muted/20 transition-all shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10 group-hover:scale-150 transition-transform" />
                            <div className="relative shrink-0">
                                <div className="w-16 h-16 rounded-2xl border-4 border-white/5 shadow-2xl transition-transform group-hover:rotate-12 group-hover:scale-110" style={{ backgroundColor: formData[c.field] }} />
                                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={formData[c.field]} onChange={e => setFormData({...formData, [c.field]: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">{c.label}</h4>
                                <code className="text-xl font-black text-foreground uppercase block italic">{formData[c.field]}</code>
                                <span className="text-[8px] font-black text-muted-foreground opacity-40 uppercase tracking-widest">{c.desc}</span>
                            </div>
                        </div>
                    ))}
                  </div>

                  {suggestedColors.length > 0 && (
                    <div className="flex items-center gap-8 p-8 rounded-[2rem] bg-primary/5 border border-primary/10 max-w-fit mx-auto shadow-3xl animate-pulse-subtle">
                        <div className="flex items-center gap-3">
                           <TrendingUp className="w-5 h-5 text-primary" />
                           <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">SUGESTÃO DA IA (BASEADO NO LOGO):</span>
                        </div>
                        <div className="flex gap-4">
                            {suggestedColors.map(color => (
                                <button key={color} onClick={() => setFormData({...formData, primary_hex: color})} className="w-10 h-10 rounded-2xl border-2 border-white/10 hover:scale-125 transition-all shadow-2xl hover:rotate-12" style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Algoritmo de Fundo (Background FX)</Label>
                        <Select value={formData.background_type || "solid"} onValueChange={v => setFormData({...formData, background_type: v})}>
                          <SelectTrigger className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black text-xs px-8 uppercase tracking-[0.3em] shadow-2xl focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-primary/20 rounded-[2rem] p-4 shadow-3xl">
                             <SelectItem value="solid" className="rounded-xl py-4 font-black text-[10px] uppercase tracking-widest mb-1">Clássico Sólido</SelectItem>
                             <SelectItem value="bg1" className="rounded-xl py-4 font-black text-[10px] uppercase tracking-widest mb-1">Mesh Gradient Profissional</SelectItem>
                             <SelectItem value="bg2" className="rounded-xl py-4 font-black text-[10px] uppercase tracking-widest mb-1">Topographic Map Elite</SelectItem>
                             <SelectItem value="bg4" className="rounded-xl py-4 font-black text-[10px] uppercase tracking-widest mb-1">Efeitos Etéreos</SelectItem>
                             <SelectItem value="bg5" className="rounded-xl py-4 font-black text-[10px] uppercase tracking-widest mb-1">Movimento de Fumaça</SelectItem>
                             <SelectItem value="bg7" className="rounded-xl py-4 font-black text-[10px] uppercase tracking-widest">Ambiente Neon</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Background Personalizado (Wallpaper)</Label>
                        <div className="flex gap-6">
                             {formData.background_url && (
                                <div className="h-16 w-16 rounded-2xl border-2 border-primary/10 overflow-hidden shrink-0 shadow-2xl group relative">
                                    <img src={formData.background_url} className="w-full h-full object-cover group-hover:scale-125 transition-transform" />
                                </div>
                             )}
                             <Label htmlFor="bg-up" className="flex-1 flex items-center justify-center h-16 rounded-2xl border-2 border-dashed border-primary/10 hover:border-primary/40 cursor-pointer transition-all text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 bg-background/30 shadow-xl group">
                                <Upload className="w-5 h-5 mr-3 group-hover:text-primary transition-colors" /> {formData.background_url ? "TROCAR WALLPAPER" : "SUBIR PAPEL DE PAREDE"}
                             </Label>
                             <input id="bg-up" type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'background_url', 'store/background')} />
                        </div>
                    </div>
                  </div>
               </div>
            </TabsContent>

            {/* Aba Layout Elite */}
            <TabsContent value="secoes" className="p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-6 duration-700">
               <div className="flex items-center gap-5 pb-8 border-b border-primary/5">
                  <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Layout className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl uppercase tracking-[0.2em] text-primary leading-tight">Layout & Copys</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">Textos de impacto e organização de vitrines</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8 p-10 rounded-[3rem] bg-muted/10 border border-primary/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
                    <h4 className="text-[12px] font-black uppercase text-primary tracking-[0.4em] mb-6 flex items-center gap-3">Seção de Destaque <ExternalLink className="w-3.5 h-3.5 opacity-30" /></h4>
                    <div className="space-y-4">
                        <Input value={formData.hero_title_l1} onChange={e => setFormData({...formData, hero_title_l1: e.target.value})} placeholder="ENTRADA..." className="h-14 bg-background border-none rounded-2xl font-black px-6 shadow-xl" />
                        <Input value={formData.hero_title_l2} onChange={e => setFormData({...formData, hero_title_l2: e.target.value})} placeholder="FOCO PRINCIPAL..." className="h-16 bg-background border-none rounded-2xl font-black text-primary text-xl px-8 shadow-2xl" />
                        <Input value={formData.hero_title_l3} onChange={e => setFormData({...formData, hero_title_l3: e.target.value})} placeholder="COMPLEMENTO..." className="h-14 bg-background border-none rounded-2xl font-black px-6 shadow-xl" />
                        <div className="pt-6">
                             <Label className="text-[9px] font-black uppercase text-muted-foreground opacity-40 ml-2 tracking-widest">Slogan de Assinatura</Label>
                             <Input value={formData.hero_phrase} onChange={e => setFormData({...formData, hero_phrase: e.target.value})} placeholder="SEU SLOGAN..." className="h-14 bg-background/50 border-primary/5 rounded-2xl px-6 text-sm italic font-medium shadow-inner" />
                        </div>
                    </div>
                  </div>

                  <div className="space-y-8 p-10 rounded-[3rem] bg-muted/10 border border-primary/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 blur-3xl -z-10" />
                    <h4 className="text-[12px] font-black uppercase text-primary tracking-[0.4em] mb-6 flex items-center gap-3">Vitrine de Coleção <ExternalLink className="w-3.5 h-3.5 opacity-30" /></h4>
                    <div className="space-y-4">
                        <Input value={formData.collection_title_l1} onChange={e => setFormData({...formData, collection_title_l1: e.target.value})} placeholder="CHAMADA (EX: EXPLORE)..." className="h-14 bg-background border-none rounded-2xl font-black px-6 shadow-xl" />
                        <Input value={formData.collection_title_l2} onChange={e => setFormData({...formData, collection_title_l2: e.target.value})} placeholder="TÍTULO (EX: ACERVO)..." className="h-16 bg-background border-none rounded-2xl font-black text-primary text-xl px-8 shadow-2xl" />
                        <div className="pt-6">
                             <Label className="text-[9px] font-black uppercase text-muted-foreground opacity-40 ml-2 tracking-widest">Sub-chamada de Vitrine</Label>
                             <Input value={formData.collection_subtitle} onChange={e => setFormData({...formData, collection_subtitle: e.target.value})} className="h-14 bg-background/50 border-primary/5 rounded-2xl px-6 text-sm shadow-inner" />
                        </div>
                    </div>
                  </div>
               </div>
            </TabsContent>

            {/* Aba Pagamentos Elite */}
            <TabsContent value="pagamento" className="p-10 m-0 space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
               <PaymentManagement tenantId={tenantId} />
            </TabsContent>

            {/* Aba Entrega Elite */}
            <TabsContent value="entrega" className="p-0 m-0 animate-in fade-in slide-in-from-top-6 duration-700">
               <DeliveryTab 
                 tenantId={tenantId} 
                 formData={formData}
                 setFormData={setFormData}
               />
            </TabsContent>

            {/* Aba Avançado Elite */}
            <TabsContent value="outros" className="p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-6 duration-700">
               <div className="flex items-center gap-5 pb-8 border-b border-primary/5">
                  <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Settings className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl uppercase tracking-[0.2em] text-primary leading-tight">Configurações Avançadas</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">Institucional, Legendas e SEO Profundo</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">História da Marca (Manifesto)</Label>
                    <Textarea value={formData.about_us} onChange={e => setFormData({...formData, about_us: e.target.value})} className="min-h-[300px] bg-background/50 border-primary/5 rounded-[3rem] p-10 text-base leading-relaxed shadow-3xl focus:ring-primary/20" placeholder="A jornada épica da sua loja começa aqui..." />
                  </div>
                  <div className="space-y-10">
                    <div className="space-y-4 p-10 rounded-[3rem] bg-muted/10 border border-primary/5 shadow-2xl group hover:border-primary/20 transition-all">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Copyright & Rodapé Master</Label>
                        <Input value={formData.footer_info} onChange={e => setFormData({...formData, footer_info: e.target.value})} className="h-14 bg-background border-none rounded-2xl font-black text-xs px-6 shadow-inner focus:ring-primary/20" />
                    </div>
                    <div className="space-y-4 p-10 rounded-[3rem] bg-muted/10 border border-primary/5 shadow-2xl group hover:border-primary/20 transition-all">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Legenda Visual de Grade (Tamanhos)</Label>
                        <Input value={formData.product_size_label} onChange={e => setFormData({...formData, product_size_label: e.target.value})} className="h-14 bg-background border-none rounded-2xl font-black text-xs px-6 shadow-inner focus:ring-primary/20" />
                    </div>
                  </div>
               </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Floating Save Button Bar Premium */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] p-6 bg-gradient-to-t from-black/95 to-transparent backdrop-blur-md pointer-events-none pb-8">
          <div className="container mx-auto max-w-7xl flex justify-center md:justify-end pointer-events-auto">
              <Button 
                onClick={handleSave} 
                className="h-16 md:h-20 px-10 md:px-20 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.3em] md:tracking-[0.4em] rounded-[1.5rem] md:rounded-[2rem] shadow-[0_0_50px_rgba(var(--primary),0.5)] animate-pulse-subtle flex items-center gap-3 md:gap-5 active:scale-95 transition-all text-xs md:text-base border-4 border-black/10"
              >
                  <Save className="w-5 h-5 md:w-8 md:h-8" /> Sincronizar Tudo
              </Button>
          </div>
      </div>
    </div>
  );
}
