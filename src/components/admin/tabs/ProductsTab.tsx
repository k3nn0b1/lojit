import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, Trash2, Plus, Image as ImageIcon, ChevronDown, ChevronUp, Loader2, Upload, X } from "lucide-react";
import { formatBRL, parseSupabaseError, normalizeCategory, sortSizes } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductsTabProps {
  storedProducts: any[];
  setStoredProducts: React.Dispatch<React.SetStateAction<any[]>>;
  categories: string[];
  globalSizes: string[];
  distribution: Record<string, number>;
  setDistribution: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  uploadToCloudinary: (file: File) => Promise<{ secure_url: string; public_id: string }>;
  IS_SUPABASE_READY: boolean;
  MAX_FILE_SIZE_MB: number;
  ALLOWED_TYPES: string[];
  handleStockBySizeChange: (id: number, size: string, newStock: number) => void;
  navigateStock?: (id: number, name: string) => void;
}

const ProductsTab = ({
  storedProducts,
  setStoredProducts,
  categories,
  globalSizes,
  distribution,
  setDistribution,
  uploadToCloudinary,
  IS_SUPABASE_READY,
  MAX_FILE_SIZE_MB,
  ALLOWED_TYPES,
  handleStockBySizeChange,
  navigateStock,
}: ProductsTabProps) => {
  const [product, setProduct] = useState({ name: "", category: "", price: 0, sizes: [] as string[], stock: 0, imageUrl: "", imageUrl2: "", imageUrl3: "", description: "" });
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
  const [uploading, setUploading] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const filteredProducts = storedProducts.filter((p) =>
    `${p.name} ${p.category || ""} ${String(p.id ?? "")}`
      .toLowerCase()
      .includes(productQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const handleQueryChange = (val: string) => {
    setProductQuery(val);
    setCurrentPage(1);
  };

  const handleChange = (field: string, value: any) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleImage = (file: File | undefined, index: number) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (>${MAX_FILE_SIZE_MB}MB)`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Formato não permitido. Use JPG, PNG ou WEBP.");
      return;
    }
    
    const nextFiles = [...imageFiles];
    nextFiles[index] = file;
    setImageFiles(nextFiles);
    
    const nextPreviews = [...imagePreviews];
    nextPreviews[index] = URL.createObjectURL(file);
    setImagePreviews(nextPreviews);
  };

  const handleSizeToggle = (size: string) => {
    const next = product.sizes.includes(size)
      ? product.sizes.filter((s) => s !== size)
      : [...product.sizes, size];
    handleChange("sizes", sortSizes(next));
  };

  const handleSubmit = async () => {
    if (!product.name || !product.category || product.price <= 0) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    let imageUrl = product.imageUrl;
    let publicId: string | undefined;
    let imageUrl2 = product.imageUrl2;
    let publicId2: string | undefined;
    let imageUrl3 = product.imageUrl3;
    let publicId3: string | undefined;

    if (imageFiles.some(f => f !== null)) {
      setUploading(true);
      try {
        const uploadPromises = imageFiles.map(async (file, idx) => {
            if (!file) return null;
            const uploaded = await uploadToCloudinary(file);
            return { url: uploaded.secure_url, id: uploaded.public_id, idx };
        });

        const results = await Promise.all(uploadPromises);
        results.forEach(res => {
            if (!res) return;
            if (res.idx === 0) { imageUrl = res.url; publicId = res.id; }
            if (res.idx === 1) { imageUrl2 = res.url; publicId2 = res.id; }
            if (res.idx === 2) { imageUrl3 = res.url; publicId3 = res.id; }
        });
      } catch (err: any) {
        toast.error("Falha no upload para Cloudinary");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const allocatedTotal = (product.sizes || []).reduce((acc, s) => acc + (Number(distribution[s] || 0)), 0);
    const totalStock = Number(product.stock || 0);

    const baseProductForSupabase = {
      name: product.name,
      category: product.category,
      price: product.price,
      sizes: product.sizes,
      stock: allocatedTotal > 0 ? allocatedTotal : totalStock,
      image: imageUrl || "",
      publicId,
      image2: imageUrl2 || "",
      publicId2,
      image3: imageUrl3 || "",
      publicId3,
      description: product.description,
      stockBySize: Object.fromEntries((product.sizes || []).map((s) => [s, Number(distribution[s] || 0)])),
    };

    if (IS_SUPABASE_READY) {
      try {
        const { data, error } = await supabase.from("products").insert([baseProductForSupabase]).select("*").single();
        if (error) throw error;
        setStoredProducts((prev) => [...prev, data]);
        toast.success("Produto cadastrado");
        setProduct({ name: "", category: "", price: 0, sizes: [], stock: 0, imageUrl: "", imageUrl2: "", imageUrl3: "", description: "" });
        setImageFiles([null, null, null]);
        setImagePreviews([null, null, null]);
        setDistribution({});
      } catch (e: any) {
        toast.error("Falha ao salvar no Supabase", { description: parseSupabaseError(e) });
      }
    }
  };

  const handleRemoveProduct = async (id: number) => {
    if (!confirm("Deseja realmente excluir este produto?")) return;
    if (IS_SUPABASE_READY) {
      try {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        setStoredProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success("Produto removido");
      } catch (e: any) {
        toast.error("Falha ao remover no Supabase");
      }
    }
  };



  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input value={product.name} onChange={(e) => handleChange("name", e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={product.category}
                onValueChange={(val) => handleChange("category", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" value={product.price} onChange={(e) => handleChange("price", parseFloat(e.target.value))} />
            </div>
            <div>
              <Label>Estoque Inicial Total</Label>
              <Input type="number" value={product.stock} onChange={(e) => handleChange("stock", parseInt(e.target.value))} />
            </div>
          </div>

          <div>
            <Label>Descrição / Detalhes do Produto</Label>
            <textarea 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ex: Camisa Tailandesa 1:1, tecido Dri-FIT, patch bordado..."
              value={product.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div>
            <Label>Tamanhos Disponíveis</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {globalSizes.map((s) => (
                <Badge
                  key={s}
                  variant={product.sizes.includes(s) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleSizeToggle(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {product.sizes.length > 0 && (
            <div className="space-y-2">
              <Label>Distribuição de Estoque</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {product.sizes.map((s) => (
                  <div key={s} className="space-y-1">
                    <Label className="text-[10px] uppercase">{s}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={distribution[s] || ""}
                      onChange={(e) => setDistribution((prev) => ({ ...prev, [s]: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4">
            <Label>Imagens do Produto (Até 3)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                        {imagePreviews[idx] ? (
                            <div className="relative aspect-square rounded-lg border-2 border-primary/20 bg-muted/30 overflow-hidden flex items-center justify-center group">
                                <img src={imagePreviews[idx]!} alt={`Preview ${idx+1}`} className="h-full w-full object-cover" />
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    const nextFiles = [...imageFiles];
                                    nextFiles[idx] = null;
                                    setImageFiles(nextFiles);
                                    
                                    const nextPreviews = [...imagePreviews];
                                    nextPreviews[idx] = null;
                                    setImagePreviews(nextPreviews);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-bold">FOTO {idx+1}</div>
                            </div>
                        ) : (
                            <div className="relative aspect-square">
                                <Label 
                                    htmlFor={`product-image-upload-${idx}`}
                                    className="flex flex-col items-center justify-center gap-2 h-full w-full rounded-lg border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 cursor-pointer transition-smooth group"
                                >
                                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-smooth">
                                      <Upload className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-center px-2">
                                      <span className="block text-xs font-bold text-primary">Foto {idx+1}</span>
                                    </div>
                                </Label>
                                <input id={`product-image-upload-${idx}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0], idx)} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={uploading}>
            {uploading ? "Fazendo upload..." : "Cadastrar Produto"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={productQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar produtos..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleProducts.map((p) => (
              <div 
                key={p.id} 
                className="border rounded-lg p-3 space-y-3 bg-card text-card-foreground shadow-sm hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer group/card"
                onClick={() => navigateStock?.(p.id, p.name)}
              >
                <div className="flex items-center gap-3">
                  {p.image && (
                    <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.category}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveProduct(p.id);
                      }} 
                      className="group"
                    >
                      <Trash2 className="h-4 w-4 text-destructive group-hover:text-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold">{formatBRL(p.price)}</span>
                  <span>Estoque: {p.stock}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {filteredProducts.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6 bg-muted/20 p-4 rounded-lg border">
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                <span>Mostrando {pageSize} por página</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] bg-background">
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent>
                    {[9, 18, 36, 72].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-8 text-xs font-bold uppercase tracking-wider"
                >
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {(() => {
                    const windowSize = 5;
                    const pages: (number | "ellipsis")[] = [];
                    const start = Math.max(1, currentPage - Math.floor(windowSize / 2));
                    const end = Math.min(totalPages, start + windowSize - 1);
                    const adjustedStart = Math.max(1, end - windowSize + 1);

                    if (adjustedStart > 1) {
                      pages.push(1);
                      if (adjustedStart > 2) pages.push("ellipsis");
                    }

                    for (let n = adjustedStart; n <= end; n++) {
                      pages.push(n);
                    }

                    if (end < totalPages) {
                      if (end < totalPages - 1) pages.push("ellipsis");
                      pages.push(totalPages);
                    }

                    return pages.map((item, idx) =>
                      item === "ellipsis" ? (
                        <span key={`el-${idx}`} className="px-1 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(item as number)}
                          className={`h-8 w-8 p-0 text-xs font-bold transition-all ${
                            currentPage === item
                              ? "bg-primary text-primary-foreground shadow-primary/30"
                              : "hover:bg-primary/10 hover:text-foreground"
                          }`}
                        >
                          {item}
                        </Button>
                      )
                    );
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-8 text-xs font-bold uppercase tracking-wider"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsTab;
