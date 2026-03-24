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
import { Loader2, Upload, X, Instagram } from "lucide-react";
import { WhatsappIcon } from "../../icons/WhatsappIcon";
import { YoutubeIcon } from "../../icons/YoutubeIcon";
import { Switch } from "@/components/ui/switch";
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
  tenantId?: string | null;
}

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

      // Reduz a imagem para processar mais rápido e agrupar cores
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

        if (a < 128) continue; // ignora transparente

        // Arredonda para reduzir variações sutis e agrupar cores similares
        const roundedR = Math.round(r / 15) * 15;
        const roundedG = Math.round(g / 15) * 15;
        const roundedB = Math.round(b / 15) * 15;

        // Ignora cores muito próximas de preto ou branco (opcional, mas geralmente melhor para temas)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (luminance < 0.1 || luminance > 0.9) continue;

        const hex = `#${((1 << 24) + (roundedR << 16) + (roundedG << 8) + roundedB).toString(16).slice(1)}`;
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }

      // Ordena por frequência e pega a cor predominante
      const sorted = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1) // Apenas a mais frequente
        .map(entry => entry[0]);

      setSuggestedColors(sorted);
    };
  };

  useEffect(() => {
      const getHex = (colorStr: string | undefined) => {
        if (!colorStr) return "#000000";
        if (colorStr.startsWith('#')) return colorStr;
        try {
          return hslStringToHex(colorStr);
        } catch (e) {
          return "#000000";
        }
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
    <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

      // Normaliza Instagram
      if (payload.instagram_url && !payload.instagram_url.startsWith('http')) {
        const handle = payload.instagram_url.startsWith('@') 
          ? payload.instagram_url.substring(1) 
          : payload.instagram_url;
        payload.instagram_url = `https://www.instagram.com/${handle}/`;
      }
      
      // Remove temporary hex fields
      const { primary_hex, secondary_hex, background_hex, ...finalPayload } = payload;

      await updateSettings(finalPayload);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {

      console.error(error);
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
          const { secure_url } = await uploadToCloudinary(file, "store/logo");
          setFormData({...formData, logo_url: secure_url});
          toast.success("Logo carregado com sucesso!");
      } catch (error) {
          console.error(error);
          toast.error("Erro ao carregar logo");
      } finally {
          setUploading(false);
      }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
          const { secure_url } = await uploadToCloudinary(file, "store/background");
          setFormData({...formData, background_url: secure_url});
          toast.success("Background carregado com sucesso!");
      } catch (error) {
          console.error(error);
          toast.error("Erro ao carregar background");
      } finally {
          setUploading(false);
      }
  };


  return (
    <div className="space-y-6">
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-8 h-auto p-1.5 bg-muted/30">
          <TabsTrigger value="geral" className="text-xs uppercase font-bold py-3 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">Geral</TabsTrigger>
          <TabsTrigger value="contato" className="text-xs uppercase font-bold py-3 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">Contatos</TabsTrigger>
          <TabsTrigger value="identidade" className="text-xs uppercase font-bold py-3 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">Identidade Visual</TabsTrigger>
          <TabsTrigger value="secoes" className="text-xs uppercase font-bold py-3 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">Seções</TabsTrigger>
          <TabsTrigger value="outros" className="text-xs uppercase font-bold py-3 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">Avançado</TabsTrigger>
        </TabsList>

        <Card className="border-border/40 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            {/* Aba Geral */}
            <TabsContent value="geral" className="p-6 md:p-10 m-0 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="store_name" className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      NOME DA LOJA <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">EXIBIDO NO TÍTULO</span>
                    </Label>
                    <Input 
                      id="store_name" 
                      value={formData.store_name} 
                      onChange={e => setFormData({...formData, store_name: e.target.value})}
                      placeholder="Ex: Minha Loja"
                      className="h-14 text-base font-semibold border-border/50 focus:border-primary transition-all bg-muted/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">LOGOTIPO DA LOJA</Label>
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-border/40 bg-muted/10 backdrop-blur-sm">
                      {formData.logo_url && (
                        <div className="relative group p-1.5 rounded-lg bg-white/5 border border-white/10 flex-shrink-0">
                          <img src={formData.logo_url} alt="Logo" className="h-12 w-auto object-contain transition-transform group-hover:scale-105" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Label htmlFor="logo-upload" className="flex items-center justify-center w-full h-12 rounded-lg border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all gap-2">
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
                          <span className="text-xs font-black uppercase tracking-widest text-primary/80">{uploading ? "Salvando..." : "Substituir Logo"}</span>
                        </Label>
                        <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="address" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">ENDEREÇO COMPLETO</Label>
                  <Input 
                    id="address" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="h-14 text-base font-medium border-border/50 focus:border-primary transition-all bg-muted/20"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="opening_hours" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">HORÁRIO DE FUNCIONAMENTO</Label>
                  <Textarea 
                    id="opening_hours" 
                    value={formData.opening_hours} 
                    onChange={e => setFormData({...formData, opening_hours: e.target.value})}
                    placeholder="Ex: Segunda a Sexta: 9h às 18h&#10;Sábado: 9h às 14h"
                    className="min-h-[120px] text-base font-medium border-border/50 focus:border-primary transition-all bg-muted/20 resize-none p-4"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba Contato */}
            <TabsContent value="contato" className="p-6 md:p-10 m-0 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 gap-10 max-w-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <WhatsappIcon className="w-6 h-6" />
                    <h3 className="font-bold uppercase tracking-widest">WhatsApp Comercial</h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase font-bold opacity-60">Número WhastApp</Label>
                      <Input 
                        value={formData.whatsapp} 
                        onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                        placeholder="Ex: 5575981284738"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label className="text-[10px] uppercase font-bold opacity-60 text-center">Exibir</Label>
                      <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border">
                        <Switch checked={formData.show_whatsapp} onCheckedChange={c => setFormData({...formData, show_whatsapp: c})} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Rodapé</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <Instagram className="w-6 h-6" />
                    <h3 className="font-bold uppercase tracking-widest">Acesso Rápido Instagram</h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase font-bold opacity-60">Conta Instagram</Label>
                      <Input 
                        value={formData.instagram_url} 
                        onChange={e => setFormData({...formData, instagram_url: e.target.value})}
                        placeholder="Ex: @minhaloja"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label className="text-[10px] uppercase font-bold opacity-60 text-center">Exibir</Label>
                      <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border">
                        <Switch checked={formData.show_instagram} onCheckedChange={c => setFormData({...formData, show_instagram: c})} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Rodapé</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <YoutubeIcon className="w-6 h-6" />
                    <h3 className="font-bold uppercase tracking-widest">Link Youtube</h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase font-bold opacity-60">Canal Youtube</Label>
                      <Input 
                        value={formData.youtube_url} 
                        onChange={e => setFormData({...formData, youtube_url: e.target.value})}
                        placeholder="Ex: youtube.com/@loja"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label className="text-[10px] uppercase font-bold opacity-60 text-center">Exibir</Label>
                      <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border">
                        <Switch checked={formData.show_youtube} onCheckedChange={c => setFormData({...formData, show_youtube: c})} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Rodapé</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Aba Identidade Visual */}
            <TabsContent value="identidade" className="p-6 md:p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h3 className="font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    Cores do Sistema <span className="text-[10px] text-muted-foreground font-medium">Paleta Principal</span>
                  </h3>
                  {suggestedColors.length > 0 && (
                    <div className="flex items-center gap-4 bg-muted/20 px-4 py-2 rounded-xl border border-primary/10">
                      <span className="text-[10px] uppercase font-bold text-primary/70">Sugestão da Logo:</span>
                      <div className="flex gap-2">
                        {suggestedColors.map(color => (
                          <button
                            key={color}
                            onClick={() => setFormData({ ...formData, primary_hex: color, secondary_hex: color })}
                            className="w-7 h-7 rounded-full border border-white/20 hover:scale-110 transition-all shadow-md active:scale-95"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
                    <Label className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground">COR PRIMÁRIA</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-12 rounded-lg border-2 border-white/20 shadow-inner relative overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: formData.primary_hex }}
                      >
                        <input 
                          type="color" 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                          value={formData.primary_hex}
                          onChange={e => setFormData({...formData, primary_hex: e.target.value})}
                        />
                      </div>
                      <code className="text-sm font-mono tracking-widest text-primary font-bold">{formData.primary_hex}</code>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
                    <Label className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground">COR SECUNDÁRIA (NEON)</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-12 rounded-lg border-2 border-white/20 shadow-inner relative overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: formData.secondary_hex }}
                      >
                        <input 
                          type="color" 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                          value={formData.secondary_hex}
                          onChange={e => setFormData({...formData, secondary_hex: e.target.value})}
                        />
                      </div>
                      <code className="text-sm font-mono tracking-widest text-primary font-bold">{formData.secondary_hex}</code>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
                    <Label className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground">COR DO FUNDO BASE</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-12 rounded-lg border-2 border-white/20 shadow-inner relative overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: formData.background_hex }}
                      >
                        <input 
                          type="color" 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                          value={formData.background_hex}
                          onChange={e => setFormData({...formData, background_hex: e.target.value})}
                        />
                      </div>
                      <code className="text-sm font-mono tracking-widest text-primary font-bold">{formData.background_hex}</code>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ESTILO VISUAL DO FUNDO</Label>
                    <Select value={formData.background_type || "solid"} onValueChange={v => setFormData({...formData, background_type: v})}>
                      <SelectTrigger className="h-12 bg-card/60 backdrop-blur-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Esportivo (Bolas de Futebol)</SelectItem>
                        <SelectItem value="bg1">Vibrante (Mesh Gradient)</SelectItem>
                        <SelectItem value="bg2">Topográfico (Interactive Flow)</SelectItem>
                        <SelectItem value="bg3">Auroras (Radial Gradient)</SelectItem>
                        <SelectItem value="bg4">Etereo (Shadow Movement)</SelectItem>
                        <SelectItem value="bg5">Fumaça Dinâmica (Smoke Effect)</SelectItem>
                        <SelectItem value="bg6">Linhas de Luz (Floating Paths)</SelectItem>
                        <SelectItem value="bg7">Brilho de Neon (Beams Flow)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PLANO DE FUNDO PERSONALIZADO (IMAGEM)</Label>
                    <div className="flex gap-4">
                      {formData.background_url && (
                        <div className="h-12 w-12 rounded border border-border overflow-hidden bg-card">
                          <img src={formData.background_url} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <Label htmlFor="bg-upload" className="flex items-center justify-center flex-1 h-12 rounded border border-dashed border-primary/30 hover:bg-primary/5 cursor-pointer transition-all">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary mr-2" />}
                        <span className="text-xs font-bold uppercase tracking-wider">{uploading ? "Dando upload..." : "Escolher Imagem"}</span>
                      </Label>
                      <input id="bg-upload" type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload} disabled={uploading} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-6 border-t border-border">
                <h3 className="font-extrabold uppercase tracking-widest text-primary">Estilo das Fontes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase opacity-60">FONTE PRINCIPAL (TÍTULOS H1-H6)</Label>
                    <Select value={formData.primary_font || "'Bebas Neue', cursive"} onValueChange={v => setFormData({...formData, primary_font: v})}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="'Bebas Neue', cursive">Bebas Neue (Impactante)</SelectItem>
                        <SelectItem value="'Outfit', sans-serif">Outfit (Premium Moderna)</SelectItem>
                        <SelectItem value="'Kanit', sans-serif">Kanit (Robusta)</SelectItem>
                        <SelectItem value="'Oswald', sans-serif">Oswald (Esportiva)</SelectItem>
                        <SelectItem value="'Montserrat', sans-serif">Montserrat (Elegante)</SelectItem>
                        <SelectItem value="'Inter', sans-serif">Inter (Padrão)</SelectItem>
                        <SelectItem value="'Poppins', sans-serif">Poppins (Suave)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="p-4 rounded border border-dashed bg-muted/10">
                      <p style={{ fontFamily: formData.primary_font || "'Bebas Neue', cursive" }} className="text-2xl uppercase tracking-widest text-primary">Exemplo Título</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase opacity-60">FONTE SECUNDÁRIA (PARÁGRAFOS)</Label>
                    <Select value={formData.secondary_font || "'Inter', sans-serif"} onValueChange={v => setFormData({...formData, secondary_font: v})}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="'Inter', sans-serif">Inter (Padrão)</SelectItem>
                        <SelectItem value="'Outfit', sans-serif">Outfit (Elegante)</SelectItem>
                        <SelectItem value="'Poppins', sans-serif">Poppins (Moderna)</SelectItem>
                        <SelectItem value="'Roboto', sans-serif">Roboto (Clássica)</SelectItem>
                        <SelectItem value="'Kanit', sans-serif">Kanit (Informal)</SelectItem>
                        <SelectItem value="'Montserrat', sans-serif">Montserrat (Geométrica)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="p-4 rounded border border-dashed bg-muted/10">
                      <p style={{ fontFamily: formData.secondary_font || "'Inter', sans-serif" }} className="text-xs text-muted-foreground leading-relaxed">Exemplo de texto corrido. O cliente vai ler as descrições dos produtos com esta fonte escolhida.</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Aba Seções */}
            <TabsContent value="secoes" className="p-6 md:p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-2">
                  <UI_Badge className="bg-primary hover:bg-primary font-black uppercase text-[9px] px-3">Topo</UI_Badge>
                  <h3 className="font-bold uppercase tracking-widest">Banners & Destaques (Hero)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold opacity-60">TÍTULO LINHA 1 (Topo)</Label>
                    <Input value={formData.hero_title_l1} onChange={e => setFormData({...formData, hero_title_l1: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold opacity-60">TÍTULO LINHA 2 (Central)</Label>
                    <Input value={formData.hero_title_l2} onChange={e => setFormData({...formData, hero_title_l2: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold opacity-60">TÍTULO LINHA 3 (Base)</Label>
                    <Input value={formData.hero_title_l3} onChange={e => setFormData({...formData, hero_title_l3: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold opacity-60 uppercase">FRASE DA HOME (Abaixo da logo no início)</Label>
                  <Input value={formData.hero_phrase} onChange={e => setFormData({...formData, hero_phrase: e.target.value})} />
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-2 text-primary">
                  <UI_Badge variant="outline" className="border-primary text-primary font-black uppercase text-[9px] px-3">Vitrine</UI_Badge>
                  <h3 className="font-bold uppercase tracking-widest">Vitrine de Produtos (Coleção)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold opacity-60">NOSSA (Texto Branco)</Label>
                    <Input value={formData.collection_title_l1} onChange={e => setFormData({...formData, collection_title_l1: e.target.value})} placeholder="Ex: NOSSA" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold opacity-60">COLEÇÃO (Texto de Destaque)</Label>
                    <Input value={formData.collection_title_l2} onChange={e => setFormData({...formData, collection_title_l2: e.target.value})} placeholder="Ex: COLEÇÃO" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold opacity-60 uppercase">Subtítulo da Vitrine</Label>
                  <Input value={formData.collection_subtitle} onChange={e => setFormData({...formData, collection_subtitle: e.target.value})} placeholder="Ex: As melhores seleções em um só lugar" />
                </div>
              </div>
            </TabsContent>

            {/* Aba Avançado */}
            <TabsContent value="outros" className="p-6 md:p-10 m-0 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="font-bold uppercase tracking-widest text-primary flex items-center gap-3">
                     Checkout & Produto
                  </h3>
                  <div className="p-4 rounded-xl bg-muted/10 border space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">LEGENDA "ESCOLHA SEU TAMANHO"</Label>
                      <Input 
                        value={formData.product_size_label} 
                        onChange={e => setFormData({...formData, product_size_label: e.target.value})}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-bold uppercase tracking-widest text-primary flex items-center gap-3">
                     Rodapé (Footer)
                  </h3>
                  <div className="p-4 rounded-xl bg-muted/10 border space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">INFORMAÇÕES DE COPYRIGHT</Label>
                      <Input 
                        value={formData.footer_info} 
                        onChange={e => setFormData({...formData, footer_info: e.target.value})}
                        className="h-11"
                        placeholder="Ex: © 2026 Loja. Todos os direitos reservados."
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-6">
                  <h3 className="font-bold uppercase tracking-widest text-primary">Sobre a Nossa História (Institucional)</h3>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-transparent rounded-xl opacity-50 blur group-hover:opacity-100 transition-all duration-1000"></div>
                    <Textarea 
                      value={formData.about_us} 
                      onChange={e => setFormData({...formData, about_us: e.target.value})}
                      rows={10}
                      className="relative h-48 bg-card border-border/60 focus:border-primary text-sm leading-relaxed p-6 rounded-xl"
                      placeholder="Conte sobre sua loja aqui..."
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <div className="sticky bottom-0 z-50 bg-background/80 backdrop-blur-md pt-4 pb-6 border-t border-border/40 mt-10">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="hidden md:block">
            {settings.updated_at && (
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Última atualização: {new Date(settings.updated_at).toLocaleString()}
              </p>
            )}
          </div>
          <Button 
            onClick={handleSave} 
            size="lg" 
            className="w-full md:w-auto px-16 h-14 text-lg font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] active:scale-95 transition-all"
          >
            CONFIRMAR ALTERAÇÕES
          </Button>
        </div>
      </div>
    </div>
  );
}
