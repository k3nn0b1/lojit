import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImagesTabProps {
  tenantId?: string | null;
  storedProducts: any[];
  setStoredProducts: React.Dispatch<React.SetStateAction<any[]>>;
  uploadToCloudinary: (file: File) => Promise<{ secure_url: string; public_id: string }>;
  CLOUD_NAME: string;
  IS_SUPABASE_READY: boolean;
  MAX_FILE_SIZE_MB: number;
  ALLOWED_TYPES: string[];
}

const ImagesTab = ({
  tenantId,
  storedProducts,
  setStoredProducts,
  uploadToCloudinary,
  CLOUD_NAME,
  IS_SUPABASE_READY,
  MAX_FILE_SIZE_MB,
  ALLOWED_TYPES,
}: ImagesTabProps) => {
  const [imagesQuery, setImagesQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const handleSelectReplaceFile = (id: number, index: number, file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (>${MAX_FILE_SIZE_MB}MB)`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Formato não permitido. Use JPG, PNG ou WEBP.");
      return;
    }
    
    // Auto replace when selected
    void handleReplaceProductImage(id, index, file);
  };

  const triggerFilePickerForProduct = (id: number, index: number) => {
    const input = fileInputRefs.current[`${id}-${index}`];
    if (input) input.click();
  };

  const handleReplaceProductImage = async (id: number, index: number, file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      const suffix = index === 1 ? "" : index;
      const payload = { [`image${suffix}`]: uploaded.secure_url, [`publicId${suffix}`]: uploaded.public_id };

      if (IS_SUPABASE_READY && tenantId) {
        const { error } = await supabase.from("products").update(payload).eq("id", id).eq("tenant_id", tenantId);
        if (error) throw error;
      }

      setStoredProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...payload } : p))
      );
      toast.success(`Foto ${index} atualizada`);
    } catch (e: any) {
      toast.error("Falha ao atualizar imagem", { description: parseSupabaseError(e) });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProductImage = async (id: number, index: number) => {
    if (!confirm(`Deseja remover a foto ${index} deste produto?`)) return;
    
    setUploading(true);
    try {
      const suffix = index === 1 ? "" : index;
      const payload = { [`image${suffix}`]: null, [`publicId${suffix}`]: null };

      if (IS_SUPABASE_READY && tenantId) {
        const { error } = await supabase.from("products").update(payload).eq("id", id).eq("tenant_id", tenantId);
        if (error) throw error;
      }

      setStoredProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
      toast.success(`Foto ${index} removida`);
    } catch (e: any) {
      toast.error("Falha ao remover imagem", { description: parseSupabaseError(e) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Imagens</CardTitle>
      </CardHeader>
      <CardContent>
        {storedProducts.length === 0 ? (
          <p className="text-muted-foreground">Nenhum produto cadastrado.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Input
                value={imagesQuery}
                onChange={(e) => setImagesQuery(e.target.value)}
                placeholder="Buscar por nome, categoria ou ID..."
              />
            </div>
            {(() => {
              const products = storedProducts
                .filter((p) =>
                  `${p.name} ${p.category || ""} ${String(p.id ?? "")}`
                    .toLowerCase()
                    .includes(imagesQuery.toLowerCase())
                );
              return (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {products.map((p) => (
                    <div key={p.id} className="rounded-xl border bg-card/50 p-4 flex flex-col gap-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="min-w-0">
                          <div className="font-bold text-lg truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">ID: {p.id}</div>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{p.category}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map((idx) => {
                          const suffix = idx === 1 ? "" : idx;
                          const imageUrl = p[`image${suffix}`];
                          const publicId = p[`publicId${suffix}`];

                          return (
                            <div key={idx} className="flex flex-col gap-2">
                              <div className="relative aspect-square rounded-lg border-2 border-primary/10 bg-muted/30 overflow-hidden flex items-center justify-center group overflow-hidden">
                                {imageUrl || publicId ? (
                                  <img
                                    src={
                                      publicId
                                        ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`
                                        : imageUrl
                                    }
                                    alt={`${p.name} - Foto ${idx}`}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <ImageIcon className="w-8 h-8" />
                                    <span className="text-[10px] font-bold uppercase">Sem Foto</span>
                                  </div>
                                )}
                                <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-white font-bold tracking-tight">FOTO {idx}</div>
                              </div>
                              
                              <div className="flex flex-col gap-1">
                                <input
                                  ref={(el) => {
                                    fileInputRefs.current[`${p.id}-${idx}`] = el;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleSelectReplaceFile(p.id, idx, e.target.files?.[0] ?? undefined)}
                                />
                                <Button
                                  variant="outline"
                                  onClick={() => triggerFilePickerForProduct(p.id, idx)}
                                  disabled={uploading}
                                  size="sm"
                                  className="h-7 text-[10px] font-bold uppercase tracking-tight"
                                >
                                  {imageUrl || publicId ? "Alterar" : "Adicionar"}
                                </Button>
                                {(imageUrl || publicId) && (
                                  <Button
                                    variant="ghost"
                                    className="h-7 text-[10px] font-bold uppercase tracking-tight text-destructive hover:bg-destructive/10 hover:text-foreground"
                                    onClick={() => handleRemoveProductImage(p.id, idx)}
                                    size="sm"
                                    disabled={uploading}
                                  >
                                    Remover
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImagesTab;
