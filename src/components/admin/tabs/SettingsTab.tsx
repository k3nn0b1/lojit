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
import { Loader2, Upload, X } from "lucide-react";


export default function SettingsTab() {
  const { settings, loading, updateSettings } = useStoreSettings();
  const [formData, setFormData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        ...settings,
        primary_hex: hslStringToHex(settings.primary_color),
        secondary_hex: hslStringToHex(settings.secondary_color),
        background_hex: hslStringToHex(settings.background_color),
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
          const { secure_url } = await uploadToCloudinary(file, "fut75/logo");
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
          const { secure_url } = await uploadToCloudinary(file, "fut75/background");
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
                    placeholder="Ex: FUT75 Store"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp">Número de WhatsApp</Label>
                <Input 
                    id="whatsapp" 
                    value={formData.whatsapp} 
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                    placeholder="Ex: 5575981284738"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instagram">Link do Instagram</Label>
                <Input 
                    id="instagram" 
                    value={formData.instagram_url} 
                    onChange={e => setFormData({...formData, instagram_url: e.target.value})}
                    placeholder="Ex: @fut75store ou link completo"
                />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalização do Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
          <div className="grid gap-2">
            <Label htmlFor="footer_info">Informações do Footer (Copyright)</Label>
            <Input 
                id="footer_info" 
                value={formData.footer_info} 
                onChange={e => setFormData({...formData, footer_info: e.target.value})}
            />
          </div>

          <div className="pt-4 border-t border-border/50 space-y-8">
            <div>
              <h4 className="text-sm font-medium mb-4">Cores do Sistema (HEX)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                      <Label htmlFor="primary_color" className="text-xs uppercase text-muted-foreground">Cor Primária (Temas e Botões)</Label>
                      <div className="flex items-center gap-3">
                          <Input 
                              type="color"
                              id="primary_color" 
                              value={formData.primary_hex} 
                              className="w-14 h-10 p-1 bg-[#1a1a1a] border-border"
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
                              className="w-14 h-10 p-1 bg-[#1a1a1a] border-border"
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
                    <Label htmlFor="background_color" className="text-xs uppercase text-muted-foreground">Cor de Fundo</Label>
                    <div className="flex items-center gap-3">
                        <Input 
                            type="color"
                            id="background_color" 
                            value={formData.background_hex} 
                            className="w-14 h-10 p-1 bg-[#1a1a1a] border-border"
                            onChange={e => setFormData({...formData, background_hex: e.target.value})}
                        />
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{formData.background_hex}</code>
                    </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs uppercase text-muted-foreground">Imagem de Fundo (Opcional)</Label>
                  <div className="flex items-center gap-4">
                      {formData.background_url && (
                          <div className="h-20 w-32 rounded-md border border-border overflow-hidden bg-white/5 relative group">
                              <img src={formData.background_url} alt="BG Preview" className="h-full w-full object-cover" />
                              <button 
                                onClick={() => setFormData({...formData, background_url: null})}
                                className="absolute top-1 right-1 bg-destructive p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                          </div>
                      )}
                      <div className="flex-1">
                          <Label 
                              htmlFor="bg-upload" 
                              className="flex items-center justify-center gap-2 h-12 px-4 rounded-md border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 cursor-pointer transition-smooth"
                          >
                              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
                              <span className="font-medium">{uploading ? "Enviando..." : "Carregar imagem de fundo"}</span>
                          </Label>
                          <input id="bg-upload" type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload} disabled={uploading} />
                      </div>
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
