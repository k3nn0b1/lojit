import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";
import { hexToHSL, hslStringToHex } from "@/lib/colors";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Loader2, Upload, Instagram, Settings, Layout, Palette, Phone, Globe, Save } from "lucide-react";
import { WhatsappIcon } from "../../icons/WhatsappIcon";
import { YoutubeIcon } from "../../icons/YoutubeIcon";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { CreditCard, Trash2, Plus, Search, Wallet, MapPin, Truck } from "lucide-react";
import { FormaPagamento } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge as UI_Badge } from "@/components/ui/badge";

interface SettingsTabProps {
  tenantId: string;
}

const PaymentManagement = ({ tenantId }: { tenantId: string }) => {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFormaName, setNewFormaName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [adding, setAdding] = useState(false);

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

  const handleAdd = async () => {
    if (!newFormaName.trim()) return;
    setAdding(true);
    
    const { data, error } = await supabase
      .from("formas_pagamento")
      .insert({
        name: newFormaName.trim(),
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
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-primary">Gerenciar Opções</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Estas opções aparecerão no carrinho do cliente</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40" />
            <input 
              type="text" 
              placeholder="Buscar pagamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-muted/20 border border-primary/10 rounded-xl pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-primary/40 transition-all"
            />
          </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-muted/10 p-4 rounded-2xl border border-primary/5">
          <div className="sm:col-span-3 space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Nome da Forma de Pagamento</Label>
            <input 
              type="text" 
              placeholder="Ex: Cartão de Crédito, Pix, Dinheiro..." 
              value={newFormaName}
              onChange={(e) => setNewFormaName(e.target.value)}
              className="w-full h-11 bg-background border border-primary/20 rounded-xl px-4 text-xs font-black focus:outline-none focus:border-primary transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <Button 
              onClick={handleAdd}
              disabled={adding || !newFormaName.trim()}
              className="w-full h-11 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20"
            >
              {adding ? "..." : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
            </Button>
          </div>
       </div>

       <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="py-10 text-center opacity-30">Carregando...</div>
          ) : filteredFormas.length > 0 ? (
            filteredFormas.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/5 border border-primary/5 hover:border-primary/20 transition-all group">
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                       <Wallet className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase">{f.name}</p>
                    </div>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => handleDelete(f.id)}
                   className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                 >
                   <Trash2 className="w-4 h-4" />
                 </Button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
               <CreditCard className="w-12 h-12 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma forma de pagamento cadastrada</p>
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

      const sorted = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(entry => entry[0]);

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
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
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
      toast.success("Configurações atualizadas!");
    } catch (error) {
      toast.error("Erro ao salvar");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, path: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
        const { secure_url } = await uploadToCloudinary(file, path);
        setFormData({...formData, [field]: secure_url});
        toast.success("Upload concluído!");
    } catch {
        toast.error("Falha no upload");
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="bg-muted/40 p-1.5 rounded-2xl border border-primary/10 mb-8 h-auto grid grid-cols-3 md:flex md:w-fit mx-auto gap-1">
          <TabsTrigger value="geral" className="rounded-xl px-2 md:px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px] md:text-[10px]">
            Geral
          </TabsTrigger>
          <TabsTrigger value="contato" className="rounded-xl px-2 md:px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px] md:text-[10px]">
            Contatos
          </TabsTrigger>
          <TabsTrigger value="identidade" className="rounded-xl px-2 md:px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px] md:text-[10px]">
            Identidade
          </TabsTrigger>
          <TabsTrigger value="secoes" className="rounded-xl px-2 md:px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px] md:text-[10px]">
            Layout
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="rounded-xl px-2 md:px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px] md:text-[10px]">
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="outros" className="rounded-xl px-2 md:px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px] md:text-[10px]">
            Avançado
          </TabsTrigger>
        </TabsList>

        <Card className="bg-card/30 backdrop-blur-sm border-primary/10 shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            {/* Aba Geral */}
            <TabsContent value="geral" className="p-5 md:p-10 m-0 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-3 border-b border-primary/5 pb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-widest text-primary">Informações da Loja</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60">Dados básicos de identificação</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Título Comercial (Exibido no Navegador)</Label>
                        <Input value={formData.store_name} onChange={e => setFormData({...formData, store_name: e.target.value})} className="h-14 bg-muted/20 border-primary/10 rounded-2xl font-black text-lg shadow-xl" />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Logotipo Principal</Label>
                        <div className="p-6 rounded-[2rem] border border-primary/10 bg-muted/10 flex flex-col items-center gap-6 group hover:bg-muted/20 transition-all">
                             {formData.logo_url ? (
                                <div className="relative group">
                                     <img src={formData.logo_url} className="h-24 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform" />
                                </div>
                             ) : (
                                <div className="h-24 w-24 rounded-full border-2 border-dashed border-primary/20 flex items-center justify-center text-primary/20">Logo</div>
                             )}
                             <Label htmlFor="logo-up" className="w-full flex items-center justify-center h-12 rounded-2xl bg-primary/10 hover:bg-primary hover:text-black cursor-pointer transition-all gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Upload className="w-4 h-4" /> {uploading ? "Sincronizando..." : "Trocar Logotipo"}
                                <input id="logo-up" type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'logo_url', 'store/logo')} />
                             </Label>
                        </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Localização Física / SEDE</Label>
                        <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="h-14 bg-muted/20 border-primary/10 rounded-2xl font-black text-xs shadow-xl" placeholder="Rua..." />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Agenda de Atendimento</Label>
                        <Textarea value={formData.opening_hours} onChange={e => setFormData({...formData, opening_hours: e.target.value})} className="min-h-[160px] bg-muted/20 border-primary/10 rounded-[2rem] p-6 text-sm font-medium resize-none shadow-xl" />
                    </div>
                  </div>
               </div>
            </TabsContent>

            {/* Aba Contato */}
            <TabsContent value="contato" className="p-5 md:p-10 m-0 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-3 border-b border-primary/5 pb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-widest text-primary">Canais de Contato</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60">Redes sociais e comunicação direta</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { icon: <WhatsappIcon className="w-5 h-5" />, label: "WhatsApp", field: 'whatsapp', showField: 'show_whatsapp', placeholder: "55..." },
                    { icon: <Instagram className="w-5 h-5" />, label: "Instagram", field: 'instagram_url', showField: 'show_instagram', placeholder: "@..." },
                    { icon: <YoutubeIcon className="w-5 h-5" />, label: "YouTube", field: 'youtube_url', showField: 'show_youtube', placeholder: "Canal..." }
                  ].map(item => (
                    <div key={item.field} className="p-8 rounded-[2.5rem] bg-muted/10 border border-primary/10 space-y-6 hover:shadow-2xl transition-all shadow-primary/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-primary">
                                {item.icon}
                                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-primary/10">
                                <span className="text-[8px] font-black uppercase text-muted-foreground">Exibir</span>
                                <Switch checked={formData[item.showField]} onCheckedChange={v => setFormData({...formData, [item.showField]: v})} className="scale-75" />
                            </div>
                        </div>
                        <Input 
                            value={formData[item.field]} 
                            onChange={e => setFormData({...formData, [item.field]: e.target.value})} 
                            placeholder={item.placeholder}
                            className="h-12 bg-background border-primary/10 rounded-xl font-bold text-sm"
                        />
                    </div>
                  ))}
               </div>
            </TabsContent>

            {/* Aba Identidade Visual */}
            <TabsContent value="identidade" className="p-5 md:p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-3 border-b border-primary/5 pb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-widest text-primary">Identidade Cromática</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60">Personalização de cores e efeitos visuais</p>
                  </div>
               </div>

               <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: "Cor Primária", field: 'primary_hex' },
                        { label: "Cor Secundária", field: 'secondary_hex' },
                        { label: "Fundo Base", field: 'background_hex' }
                    ].map(c => (
                        <div key={c.field} className="p-6 rounded-[2rem] bg-muted/10 border border-primary/10 flex items-center gap-6 group hover:bg-muted/20 transition-all shadow-xl shadow-primary/5">
                            <div className="relative shrink-0">
                                <div className="w-14 h-14 rounded-2xl border-2 border-white/5 shadow-2xl transition-transform group-hover:scale-110" style={{ backgroundColor: formData[c.field] }} />
                                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={formData[c.field]} onChange={e => setFormData({...formData, [c.field]: e.target.value})} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{c.label}</h4>
                                <code className="text-sm font-black text-primary uppercase">{formData[c.field]}</code>
                            </div>
                        </div>
                    ))}
                  </div>

                  {suggestedColors.length > 0 && (
                    <div className="flex items-center gap-6 p-6 rounded-2xl bg-primary/5 border border-primary/10 max-w-fit mx-auto animate-pulse-subtle">
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Inspirado na sua LOGO:</span>
                        <div className="flex gap-4">
                            {suggestedColors.map(color => (
                                <button key={color} onClick={() => setFormData({...formData, primary_hex: color, secondary_hex: color})} className="w-8 h-8 rounded-full border-2 border-white/20 hover:scale-125 transition-all shadow-lg shadow-black/40" style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Efeito de Plano de Fundo</Label>
                        <Select value={formData.background_type || "solid"} onValueChange={v => setFormData({...formData, background_type: v})}>
                          <SelectTrigger className="h-14 bg-muted/20 border-primary/10 rounded-2xl font-black text-xs px-6 uppercase tracking-widest shadow-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-primary/10 rounded-2xl p-2">
                             <SelectItem value="solid" className="rounded-xl py-3 font-black text-[10px] uppercase">Clássico</SelectItem>
                             <SelectItem value="bg1" className="rounded-xl py-3 font-black text-[10px] uppercase">Mesh Gradient</SelectItem>
                             <SelectItem value="bg2" className="rounded-xl py-3 font-black text-[10px] uppercase">Topográfico</SelectItem>
                             <SelectItem value="bg4" className="rounded-xl py-3 font-black text-[10px] uppercase">Etereo (Shadow)</SelectItem>
                             <SelectItem value="bg5" className="rounded-xl py-3 font-black text-[10px] uppercase">Fumaça Dinâmica</SelectItem>
                             <SelectItem value="bg7" className="rounded-xl py-3 font-black text-[10px] uppercase">Brilho Neon</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Papel de Parede Personalizado</Label>
                        <div className="flex gap-4">
                             {formData.background_url && (
                                <div className="h-14 w-14 rounded-2xl border border-primary/10 overflow-hidden shrink-0 shadow-lg">
                                    <img src={formData.background_url} className="w-full h-full object-cover" />
                                </div>
                             )}
                             <Label htmlFor="bg-up" className="flex-1 flex items-center justify-center h-14 rounded-2xl border-2 border-dashed border-primary/10 hover:border-primary/40 cursor-pointer transition-all text-[10px] font-black uppercase tracking-widest text-primary/60">
                                <Upload className="w-4 h-4 mr-2" /> Alterar Fundo
                             </Label>
                             <input id="bg-up" type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'background_url', 'store/background')} />
                        </div>
                    </div>
                  </div>
               </div>
            </TabsContent>

            {/* Aba Layout/Seções */}
            <TabsContent value="secoes" className="p-5 md:p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-3 border-b border-primary/5 pb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Layout className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-widest text-primary">Arquitetura da Home</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60">Textos, banners e vitrines</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8 p-8 rounded-[2.5rem] bg-muted/10 border border-primary/10 shadow-xl">
                    <h4 className="text-[12px] font-black uppercase text-primary tracking-[0.2em] mb-4">Seção Hero (Topo)</h4>
                    <div className="grid gap-4">
                        <Input value={formData.hero_title_l1} onChange={e => setFormData({...formData, hero_title_l1: e.target.value})} placeholder="Linha 1..." className="h-12 bg-background border-primary/10 font-bold" />
                        <Input value={formData.hero_title_l2} onChange={e => setFormData({...formData, hero_title_l2: e.target.value})} placeholder="Linha 2..." className="h-12 bg-background border-primary/10 font-black text-primary" />
                        <Input value={formData.hero_title_l3} onChange={e => setFormData({...formData, hero_title_l3: e.target.value})} placeholder="Linha 3..." className="h-12 bg-background border-primary/10 font-bold" />
                        <div className="pt-2">
                             <Label className="text-[9px] font-black uppercase text-muted-foreground ml-2">Slogan de Entrada</Label>
                             <Input value={formData.hero_phrase} onChange={e => setFormData({...formData, hero_phrase: e.target.value})} placeholder="Slogan..." className="h-12 bg-background border-primary/10 text-xs italic" />
                        </div>
                    </div>
                  </div>

                  <div className="space-y-8 p-8 rounded-[2.5rem] bg-muted/10 border border-primary/10 shadow-xl">
                    <h4 className="text-[12px] font-black uppercase text-primary tracking-[0.2em] mb-4">Seção Vitrine</h4>
                    <div className="grid gap-4">
                        <Input value={formData.collection_title_l1} onChange={e => setFormData({...formData, collection_title_l1: e.target.value})} placeholder="Explicação (ex: NOSSA)" className="h-12 bg-background border-primary/10 font-bold" />
                        <Input value={formData.collection_title_l2} onChange={e => setFormData({...formData, collection_title_l2: e.target.value})} placeholder="Destaque (ex: COLEÇÃO)" className="h-12 bg-background border-primary/10 font-black text-primary" />
                        <div className="pt-2">
                             <Label className="text-[9px] font-black uppercase text-muted-foreground ml-2">Frase de Chamada</Label>
                             <Input value={formData.collection_subtitle} onChange={e => setFormData({...formData, collection_subtitle: e.target.value})} className="h-12 bg-background border-primary/10 text-xs" />
                        </div>
                    </div>
                  </div>
               </div>
            </TabsContent>            {/* Aba Pagamentos */}
            <TabsContent value="pagamento" className="p-5 md:p-10 m-0 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-3 border-b border-primary/5 pb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-widest text-primary">Formas de Pagamento</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60">Gerencie as opções de pagamento aceitas na sua loja</p>
                  </div>
               </div>

               <div className="space-y-8">
                  <PaymentManagement tenantId={tenantId} />
               </div>
            </TabsContent>

            {/* Aba Avançado */}
            <TabsContent value="outros" className="p-5 md:p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-3 border-b border-primary/5 pb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-widest text-primary">Configurações Avançadas</h3>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60">Scripts, SEO e institucionais</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">História da Loja (Sobre Nós)</Label>
                    <Textarea value={formData.about_us} onChange={e => setFormData({...formData, about_us: e.target.value})} className="min-h-[240px] bg-muted/20 border-primary/10 rounded-[2.5rem] p-8 text-sm leading-relaxed shadow-xl" placeholder="Escreva a jornada da sua loja..." />
                  </div>
                  <div className="space-y-10">
                    <div className="space-y-4 p-8 rounded-[2.5rem] bg-muted/10 border border-primary/10 shadow-lg">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Texto Rodapé (Copyright)</Label>
                        <Input value={formData.footer_info} onChange={e => setFormData({...formData, footer_info: e.target.value})} className="h-12 bg-background border-primary/10 rounded-xl font-medium text-xs" />
                    </div>
                    <div className="space-y-4 p-8 rounded-[2.5rem] bg-muted/10 border border-primary/10 shadow-lg">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Legenda Tamanhos Produto</Label>
                        <Input value={formData.product_size_label} onChange={e => setFormData({...formData, product_size_label: e.target.value})} className="h-12 bg-background border-primary/10 rounded-xl font-medium text-xs" />
                    </div>
                  </div>
               </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Floating Save Button Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm pointer-events-none">
          <div className="container mx-auto max-w-7xl flex justify-center md:justify-end pointer-events-auto">
              <Button 
                onClick={handleSave} 
                className="h-12 md:h-16 px-8 md:px-16 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-xl md:rounded-2xl shadow-[0_0_30px_rgba(var(--primary),0.4)] animate-pulse-subtle flex items-center gap-2 md:gap-3 active:scale-95 transition-all text-[10px] md:text-sm"
              >
                  <Save className="w-4 h-4 md:w-6 md:h-6" /> Aplicar Configurações
              </Button>
          </div>
      </div>
    </div>
  );
}
