import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils";

interface ImagesTabProps {
  storedProducts: any[];
  setStoredProducts: React.Dispatch<React.SetStateAction<any[]>>;
  uploadToCloudinary: (file: File) => Promise<{ secure_url: string; public_id: string }>;
  CLOUD_NAME: string;
  IS_SUPABASE_READY: boolean;
  MAX_FILE_SIZE_MB: number;
  ALLOWED_TYPES: string[];
}

const ImagesTab = ({
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
  const [replaceFiles, setReplaceFiles] = useState<Record<number, File | null>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleSelectReplaceFile = (id: number, file?: File) => {
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
    void handleReplaceProductImage(id, file);
  };

  const triggerFilePickerForProduct = (id: number) => {
    const input = fileInputRefs.current[id];
    if (input) input.click();
  };

  const handleReplaceProductImage = async (id: number, file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      const payload = { image: uploaded.secure_url, publicId: uploaded.public_id };

      if (IS_SUPABASE_READY) {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      }

      setStoredProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, image: payload.image, publicId: payload.publicId } : p))
      );
      toast.success("Imagem atualizada");
    } catch (e: any) {
      toast.error("Falha ao atualizar imagem", { description: parseSupabaseError(e) });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProductImage = async (id: number) => {
    if (!confirm("Deseja remover a imagem deste produto?")) return;
    
    setUploading(true);
    try {
      const payload = { image: null, publicId: null };

      if (IS_SUPABASE_READY) {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      }

      setStoredProducts((prev) => prev.map((p) => (p.id === id ? { ...p, image: null, publicId: null } : p)));
      toast.success("Imagem removida do produto");
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
        {storedProducts.filter((p) => p.image || p.publicId).length === 0 ? (
          <p className="text-muted-foreground">Nenhuma imagem vinculada a itens.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={imagesQuery}
                onChange={(e) => setImagesQuery(e.target.value)}
                placeholder="Buscar por nome, categoria ou ID..."
              />
            </div>
            {(() => {
              const images = storedProducts
                .filter((p) => p.image || p.publicId)
                .filter((p) =>
                  `${p.name} ${p.category || ""} ${String(p.id ?? "")}`
                    .toLowerCase()
                    .includes(imagesQuery.toLowerCase())
                );
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((p) => (
                    <div key={p.id} className="rounded-md border p-3 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            p.publicId
                              ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${p.publicId}`
                              : p.image
                          }
                          alt={p.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {p.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={(el) => {
                            fileInputRefs.current[p.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSelectReplaceFile(p.id, e.target.files?.[0] ?? undefined)}
                        />
                        <Button
                          variant="outline"
                          onClick={() => triggerFilePickerForProduct(p.id)}
                          disabled={uploading}
                          size="sm"
                        >
                          Alterar imagem
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-foreground"
                          onClick={() => handleRemoveProductImage(p.id)}
                          size="sm"
                        >
                          Remover imagem
                        </Button>
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
