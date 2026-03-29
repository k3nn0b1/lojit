import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils";
import { Image as ImageIcon, Search, Upload, Trash2, Edit3, ImagePlus, Box, Info, Layout, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminProduct } from "@/lib/types";
import { Label } from "@/components/ui/label";

interface ImagesTabProps {
  tenantId: string;
  storedProducts: AdminProduct[];
  setStoredProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>;
  uploadToCloudinary: (file: File) => Promise<{ secure_url: string; public_id: string }>;
  removeFromCloudinary: (publicId: string) => Promise<void>;
  IS_SUPABASE_READY: boolean;
}

const ImagesTab = ({
  tenantId,
  storedProducts,
  setStoredProducts,
  uploadToCloudinary,
  removeFromCloudinary,
  IS_SUPABASE_READY,
}: ImagesTabProps) => {
  const [imagesQuery, setImagesQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleSelectReplaceFile = (id: number, index: number, file?: File) => {
    if (!file) return;
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (>${MAX_MB}MB)`);
      return;
    }
    void handleReplaceProductImage(id, index, file);
  };

  const triggerFilePickerForProduct = (id: number, index: number) => {
    const input = fileInputRefs.current[`${id}-${index}`];
    if (input) input.click();
  };

  const handleReplaceProductImage = async (id: number, index: number, file: File) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      const suffix = index === 1 ? "" : index;
      const field = `image${suffix}`;
      const publicIdField = `publicId${suffix}`;
      const payload = { 
        [field]: result.secure_url,
        [publicIdField]: result.public_id
      };

      if (IS_SUPABASE_READY && tenantId) {
        const { error } = await supabase.from("products").update(payload).eq("id", id).eq("tenant_id", tenantId);
        if (error) throw error;
      }

      setStoredProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...payload } : p))
      );
      toast.success(`Foto ${index} atualizada com sucesso`);
    } catch (e: any) {
      toast.error("Falha ao atualizar imagem", { description: parseSupabaseError(e) });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProductImage = async (id: number, index: number) => {
    if (!confirm(`Deseja remover a foto ${index} deste produto permanentemente?`)) return;
    
    setUploading(true);
    try {
      const suffix = index === 1 ? "" : index;
      const field = `image${suffix}`;
      const publicIdField = `publicId${suffix}`;

      const prod = storedProducts.find(p => p.id === id);
      // @ts-ignore
      const publicId = prod?.[publicIdField];

      if (publicId) {
        await removeFromCloudinary(publicId);
      }

      const payload = { 
        [field]: null,
        [publicIdField]: null
      };

      if (IS_SUPABASE_READY && tenantId) {
        const { error } = await supabase.from("products").update(payload).eq("id", id).eq("tenant_id", tenantId);
        if (error) throw error;
      }

      setStoredProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
      toast.success(`Foto ${index} removida`);
    } catch (e: any) {
      toast.error("Falha ao remover imagem");
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = storedProducts.filter((p) =>
    `${p.name} ${p.category || ""} ${String(p.id ?? "")}`
      .toLowerCase()
      .includes(imagesQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-3xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <ImageIcon className="w-8 h-8" /> Curadoria de Imagens
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Gestor central de ativos visuais e resoluções master</p>
            </div>
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
              <Input
                value={imagesQuery}
                onChange={(e) => setImagesQuery(e.target.value)}
                placeholder="FILTRAR POR PRODUTO OU REF..."
                className="h-14 bg-background/50 border-primary/5 rounded-2xl pl-14 pr-8 text-[11px] font-black uppercase tracking-widest shadow-2xl focus:ring-primary/20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10">
          {filteredProducts.length === 0 ? (
            <div className="py-32 text-center space-y-6 opacity-20">
                 <Layout className="w-20 h-20 mx-auto opacity-30 animate-pulse" />
                 <p className="text-[10px] font-black uppercase tracking-[0.4em]">Nenhum ativo detectado nesta visualização.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {filteredProducts.map((p) => (
                <div key={p.id} className="group relative rounded-[3rem] border border-primary/5 bg-card/40 p-10 flex flex-col gap-10 hover:border-primary/40 transition-all shadow-[0_0_50px_rgba(0,0,0,0.2)] hover:shadow-[0_0_70px_rgba(var(--primary),0.05)] overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-[60px] -z-10 group-hover:scale-150 transition-transform" />
                  
                  <div className="flex items-center justify-between border-b border-primary/10 pb-6">
                    <div className="min-w-0 space-y-1">
                      <h4 className="font-black text-base uppercase tracking-tight truncate max-w-[250px] leading-tight group-hover:text-primary transition-colors">{p.name}</h4>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40 tracking-widest leading-none">ID DE REGISTRO: #{p.id}</p>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-inner">{p.category}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map((idx) => {
                      const suffix = idx === 1 ? "" : idx;
                      // @ts-ignore
                      const imageUrl = p[`image${suffix}`];

                      return (
                        <div key={idx} className="flex flex-col gap-4 group/slot">
                          <div className="group/img relative aspect-square rounded-[2rem] border-2 border-primary/5 bg-background shadow-2xl overflow-hidden flex items-center justify-center transition-all group-hover/slot:translate-y-[-4px]">
                            <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 text-[9px] text-white font-black uppercase tracking-widest opacity-80 shadow-2xl">
                                POS {idx}
                            </div>
                            
                            {imageUrl ? (
                              <>
                                <img
                                  src={imageUrl}
                                  alt={`${p.name} - ${idx}`}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110 grayscale group-hover/slot:grayscale-0"
                                />
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => triggerFilePickerForProduct(p.id!, idx)} 
                                            className="h-11 w-11 bg-primary/20 hover:bg-primary text-primary hover:text-black rounded-full border border-primary/20 transition-all shadow-2xl"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleRemoveProductImage(p.id!, idx)} 
                                            className="h-11 w-11 bg-destructive/20 hover:bg-destructive text-white rounded-full border border-destructive/20 transition-all shadow-2xl"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">Trocar Ativo</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-3 h-full w-full cursor-pointer hover:bg-primary/5 transition-all group/empty" onClick={() => triggerFilePickerForProduct(p.id!, idx)}>
                                <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-dashed border-primary/20 flex items-center justify-center group-hover/empty:scale-110 transition-transform">
                                   <ImagePlus className="w-6 h-6 text-primary/20 group-hover/empty:text-primary transition-colors" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 group-hover/empty:text-primary transition-colors">Vazio</span>
                              </div>
                            )}
                          </div>
                          
                          <input
                            ref={(el) => { fileInputRefs.current[`${p.id}-${idx}`] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleSelectReplaceFile(p.id!, idx, e.target.files?.[0] ?? undefined)}
                          />
                          
                          {!imageUrl && (
                             <Button
                                variant="outline"
                                onClick={() => triggerFilePickerForProduct(p.id!, idx)}
                                disabled={uploading}
                                className="h-10 text-[9px] font-black uppercase tracking-[0.2em] border-primary/10 hover:bg-primary/5 rounded-xl transition-all shadow-inner"
                             >
                                <PlusCircle className="w-3.5 h-3.5 mr-2" /> Upload
                             </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="p-10 rounded-[3rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-10 text-primary shadow-3xl">
         <div className="hidden md:block">
            <Layout className="w-12 h-12 opacity-30 animate-pulse-subtle" />
         </div>
         <div className="space-y-2 text-center md:text-left">
            <h5 className="text-[12px] font-black uppercase tracking-[0.3em] leading-relaxed">Arquitetura Visual de Lojista</h5>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] leading-relaxed opacity-60">
                O gerenciamento de imagens nesta aba reflete diretamente na vitrine do cliente. Slots vazios não aparecem na navegação final, garantindo uma interface limpa e focada no inventário disponível.
            </p>
         </div>
      </div>
    </div>
  );
};

export default ImagesTab;
