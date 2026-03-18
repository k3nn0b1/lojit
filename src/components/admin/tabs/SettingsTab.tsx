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
    if (settings) {
      setFormData({
        ...settings,
        primary_hex: hslStringToHex(settings.primary_color),
        secondary_hex: hslStringToHex(settings.secondary_color),
        background_hex: hslStringToHex(settings.background_color),
        background_type: settings.background_type || "solid",
        background_config: settings.background_config || {}
      });
    }
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
      <Card>
        <CardHeader>
          <CardTitle>Dados da Loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="store_name">Nome da Loja (usado no título)</Label>
                <Input 
                    id="store_name" 
                    value={formData.store_name} 
                    onChange={e => setFormData({...formData, store_name: e.target.value})}
                    placeholder="Ex: Minha Loja"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instagram">Instagram (Link ou @)</Label>
                <div className="flex items-center gap-4">
                  <Input 
                      id="instagram" 
                      value={formData.instagram_url} 
                      onChange={e => setFormData({...formData, instagram_url: e.target.value})}
                      placeholder="Ex: @minhaloja"
                      className="flex-1"
                  />
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md border border-border">
                    <Switch 
                      id="show_instagram" 
                      checked={formData.show_instagram} 
                      onCheckedChange={checked => setFormData({...formData, show_instagram: checked})}
                    />
                    <Label htmlFor="show_instagram" className="text-xs font-bold cursor-pointer">MOSTRAR NO RODAPÉ</Label>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="whatsapp">WhatsApp (Número com DDD)</Label>
                <div className="flex items-center gap-4">
                  <Input 
                      id="whatsapp" 
                      value={formData.whatsapp} 
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                      placeholder="Ex: 5575981284738"
                      className="flex-1"
                  />
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md border border-border">
                    <Switch 
                      id="show_whatsapp" 
                      checked={formData.show_whatsapp} 
                      onCheckedChange={checked => setFormData({...formData, show_whatsapp: checked})}
                    />
                    <Label htmlFor="show_whatsapp" className="text-xs font-bold cursor-pointer">MOSTRAR NO RODAPÉ</Label>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="youtube">YouTube (Link do Canal)</Label>
                <div className="flex items-center gap-4">
                  <Input 
                      id="youtube" 
                      value={formData.youtube_url} 
                      onChange={e => setFormData({...formData, youtube_url: e.target.value})}
                      placeholder="Ex: https://youtube.com/@seucanal"
                      className="flex-1"
                  />
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md border border-border">
                    <Switch 
                      id="show_youtube" 
                      checked={formData.show_youtube} 
                      onCheckedChange={checked => setFormData({...formData, show_youtube: checked})}
                    />
                    <Label htmlFor="show_youtube" className="text-xs font-bold cursor-pointer">MOSTRAR NO RODAPÉ</Label>
                  </div>
                </div>
              </div>
          </div>

          <div className="grid gap-2">
            <Label>Logo da Loja</Label>
            <div className="flex items-center gap-4">
                {formData.logo_url && (
                    <div className="h-20 w-auto min-w-[80px] rounded-md border border-border overflow-hidden bg-white/5 p-2 flex items-center justify-center">
                        <img src={formData.logo_url} alt="Logo Preview" className="h-full w-full object-contain" />
                    </div>
                )}
                <div className="flex-1">
                    <Label 
                        htmlFor="logo-upload" 
                        className="flex items-center justify-center gap-2 h-12 px-4 rounded-md border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 cursor-pointer transition-smooth"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
                        <span className="font-medium">{uploading ? "Enviando..." : "Carregar nova logo"}</span>
                    </Label>
                    <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Endereço Completo</Label>
            <Input 
                id="address" 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})}
                placeholder="Rua, Número, Bairro, Cidade - UF"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="opening_hours">Horário de Funcionamento</Label>
            <Textarea 
                id="opening_hours" 
                value={formData.opening_hours} 
                onChange={e => setFormData({...formData, opening_hours: e.target.value})}
                placeholder="Ex: Segunda a Sexta: 9h às 18h&#10;Sábado: 9h às 14h"
                rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalização do Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 border-b border-border/50 pb-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Seção: Hero (Destaque Principal)</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="hero_l1">Título Linha 1</Label>
                <Input 
                    id="hero_l1" 
                    value={formData.hero_title_l1} 
                    onChange={e => setFormData({...formData, hero_title_l1: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hero_l2">Título Linha 2 (Destaque)</Label>
                <Input 
                    id="hero_l2" 
                    value={formData.hero_title_l2} 
                    onChange={e => setFormData({...formData, hero_title_l2: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hero_l3">Título Linha 3 (Destaque)</Label>
                <Input 
                    id="hero_l3" 
                    value={formData.hero_title_l3} 
                    onChange={e => setFormData({...formData, hero_title_l3: e.target.value})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hero_phrase">Frase do Hero (Abaixo da logo na home)</Label>
              <Input 
                  id="hero_phrase" 
                  value={formData.hero_phrase} 
                  onChange={e => setFormData({...formData, hero_phrase: e.target.value})}
              />
            </div>
          </div>

          <div className="grid gap-6 border-b border-border/50 pb-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Seção: Vitrine (Nossa Coleção)</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="coll_l1">Título (Branco)</Label>
                <Input 
                    id="coll_l1" 
                    value={formData.collection_title_l1} 
                    onChange={e => setFormData({...formData, collection_title_l1: e.target.value})}
                    placeholder="Ex: NOSSA"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coll_l2">Título (Destaque de Cor)</Label>
                <Input 
                    id="coll_l2" 
                    value={formData.collection_title_l2} 
                    onChange={e => setFormData({...formData, collection_title_l2: e.target.value})}
                    placeholder="Ex: COLEÇÃO"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coll_sub">Subtítulo da Seção</Label>
              <Input 
                  id="coll_sub" 
                  value={formData.collection_subtitle} 
                  onChange={e => setFormData({...formData, collection_subtitle: e.target.value})}
                  placeholder="Ex: As melhores seleções em um só lugar"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="about_us">Sobre Nós</Label>
            <Textarea 
                id="about_us" 
                value={formData.about_us} 
                onChange={e => setFormData({...formData, about_us: e.target.value})}
                rows={5}
                className="resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="footer_info">Informações do Footer (Copyright)</Label>
              <Input 
                  id="footer_info" 
                  value={formData.footer_info} 
                  onChange={e => setFormData({...formData, footer_info: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="font_family">Fonte do Site</Label>
              <Select 
                value={formData.font_family || "'Inter', sans-serif"} 
                onValueChange={value => setFormData({...formData, font_family: value})}
              >
                <SelectTrigger id="font_family" className="bg-card border-border">
                  <SelectValue placeholder="Selecione a fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="'Inter', sans-serif">Inter (Padrão)</SelectItem>
                  <SelectItem value="'Poppins', sans-serif">Poppins (Moderna)</SelectItem>
                  <SelectItem value="'Roboto', sans-serif">Roboto (Clássica)</SelectItem>
                  <SelectItem value="'Pacifico', cursive">Pacifico (Manuscrita)</SelectItem>
                  <SelectItem value="'Iosevka Charon', monospace">Iosevka Charon (Programador)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Cores do Sistema (HEX)</h4>
                {suggestedColors.length > 0 && (
                  <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/20">
                    <span className="text-[10px] uppercase font-bold text-primary/70">Sugestão da Logo:</span>
                    <div className="flex gap-1.5">
                      {suggestedColors.map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            setFormData({ ...formData, primary_hex: color, secondary_hex: color });
                            toast.info(`Cor predominante ${color} aplicada!`);
                          }}
                          className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-smooth shadow-sm"
                          style={{ backgroundColor: color }}
                          title={`Aplicar ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                      <Label htmlFor="primary_color" className="text-xs uppercase text-muted-foreground">Cor Primária (Temas e Botões)</Label>
                      <div className="flex items-center gap-3">
                          <Input 
                              type="color"
                              id="primary_color" 
                              value={formData.primary_hex} 
                              className="w-14 h-10 p-1 bg-card border-border"
                              onChange={e => setFormData({...formData, primary_hex: e.target.value})}
                          />
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{formData.primary_hex}</code>
                      </div>
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="secondary_color" className="text-xs uppercase text-muted-foreground">Cor Secundária (Efeito Neon)</Label>
                      <div className="flex items-center gap-3">
                          <Input 
                              type="color"
                              id="secondary_color" 
                              value={formData.secondary_hex} 
                              className="w-14 h-10 p-1 bg-card border-border"
                              onChange={e => setFormData({...formData, secondary_hex: e.target.value})}
                          />
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{formData.secondary_hex}</code>
                      </div>
                  </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-4">Background do Site</h4>
              <div className="space-y-6">
                <div className="grid gap-2">
                    <Label className="text-xs uppercase text-muted-foreground">Tipo de Estilo de Fundo</Label>
                    <Select 
                      value={formData.background_type || "solid"} 
                      onValueChange={value => setFormData({...formData, background_type: value})}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue placeholder="Selecione o estilo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Esportivo (Bolas de Futebol)</SelectItem>
                        <SelectItem value="bg1">Vibrante (Mesh Gradient)</SelectItem>
                        <SelectItem value="bg2">Topográfico (Interactive Flow)</SelectItem>
                        <SelectItem value="bg3">Auroras (Radial Gradient)</SelectItem>
                        <SelectItem value="bg4">Etereo (Shadow Movement)</SelectItem>
                      </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="background_color" className="text-xs uppercase text-muted-foreground">Cor de Fundo Base / Sólida</Label>
                    <div className="flex items-center gap-3">
                        <Input 
                            type="color"
                            id="background_color" 
                            value={formData.background_hex} 
                            className="w-14 h-10 p-1 bg-card border-border"
                            onChange={e => setFormData({...formData, background_hex: e.target.value})}
                        />
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{formData.background_hex}</code>
                    </div>
                </div>

              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} size="lg" className="w-full md:w-auto px-12 h-12 text-lg font-bold">
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
