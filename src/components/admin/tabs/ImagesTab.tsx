import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils";
import { Image as ImageIcon, Search, Upload, Trash2, Edit3, ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { removeFromCloudinary } from "@/lib/cloudinary";
import { AdminProduct } from "@/lib/types";

interface ImagesTabProps {
  tenantId: string;
  storedProducts: AdminProduct[];
  setStoredProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>;
  uploadToCloudinary: (file: File) => Promise<string>;
  IS_SUPABASE_READY: boolean;
}

const ImagesTab = ({
  tenantId,
  storedProducts,
  setStoredProducts,
  uploadToCloudinary,
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
      const url = await uploadToCloudinary(file);
      const suffix = index === 1 ? "" : index;
      const field = `image${suffix}`;
      const payload = { [field]: url };

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
      const payload = { [field]: null };

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
    <div className="space-y-6">
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 py-6 border-b border-primary/10 px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
                <ImageIcon className="w-6 h-6" /> Galeria de Imagens
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Gerencie resoluções e artes visuais do catálogo</p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={imagesQuery}
                onChange={(e) => setImagesQuery(e.target.value)}
                placeholder="Pesquisar por nome ou ID..."
                className="h-11 bg-muted/20 border-primary/10 rounded-full pl-11 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center space-y-3">
                 <div className="text-4xl text-primary/20">?</div>
                 <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Nenhum produto em galeria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredProducts.map((p) => (
                <div key={p.id} className="group relative rounded-[2.5rem] border border-primary/10 bg-muted/5 p-6 flex flex-col gap-6 hover:border-primary/30 transition-all shadow-xl shadow-primary/5">
                  <div className="flex items-center justify-between border-b border-primary/5 pb-4">
                    <div className="min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tighter truncate max-w-[200px]">{p.name}</h4>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40">REF: #{p.id}</p>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-3">{p.category}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((idx) => {
                      const suffix = idx === 1 ? "" : idx;
                      // @ts-ignore
                      const imageUrl = p[`image${suffix}`];

                      return (
                        <div key={idx} className="flex flex-col gap-3">
                          <div className="group/img relative aspect-square rounded-2xl border border-primary/10 bg-black/40 overflow-hidden flex items-center justify-center">
                            {imageUrl ? (
                              <>
                                <img
                                  src={imageUrl}
                                  alt={`${p.name} - ${idx}`}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => triggerFilePickerForProduct(p.id!, idx)} className="h-9 w-9 bg-white/20 hover:bg-white/40 text-white rounded-full">
                                        <Edit3 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveProductImage(p.id!, idx)} className="h-9 w-9 bg-destructive/20 hover:bg-destructive/60 text-white rounded-full">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-2 h-full w-full cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => triggerFilePickerForProduct(p.id!, idx)}>
                                <ImagePlus className="w-6 h-6 text-primary/20" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Vazio</span>
                              </div>
                            )}
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] text-white font-black uppercase tracking-widest opacity-60">POS {idx}</div>
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
                                className="h-8 text-[9px] font-black uppercase tracking-widest border-primary/10 hover:bg-primary/5 rounded-xl"
                             >
                               Adicionar
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
    </div>
  );
};

export default ImagesTab;
