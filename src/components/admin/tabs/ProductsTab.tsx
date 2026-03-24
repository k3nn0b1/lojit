import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Trash2, Upload, X, Search, PlusCircle } from "lucide-react";
import { formatBRL, parseSupabaseError, sortSizes } from "@/lib/utils";
import { removeFromCloudinary } from "@/lib/cloudinary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminProduct, Color } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface ProductsTabProps {
  tenantId: string;
  storedProducts: AdminProduct[];
  setStoredProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  globalSizes: string[];
  setGlobalSizes: React.Dispatch<React.SetStateAction<string[]>>;
  globalColors: Color[];
  setGlobalColors: React.Dispatch<React.SetStateAction<Color[]>>;
  uploadToCloudinary: (file: File) => Promise<{ secure_url: string; public_id: string }>;
  IS_SUPABASE_READY: boolean;
  setActiveTab: (tab: string) => void;
}

const ProductsTab = ({
  tenantId,
  storedProducts,
  setStoredProducts,
  categories,
  setCategories,
  globalSizes,
  setGlobalSizes,
  globalColors,
  setGlobalColors,
  uploadToCloudinary,
  IS_SUPABASE_READY,
  setActiveTab,
}: ProductsTabProps) => {
  const [product, setProduct] = useState({ 
    name: "", 
    category: "", 
    price: 0, 
    sizes: [] as string[], 
    colors: [] as Color[], 
    stock: 0, 
    imageUrl: "", 
    imageUrl2: "", 
    imageUrl3: "", 
    publicId: "",
    publicId2: "",
    publicId3: "",
    description: "" 
  });
  
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
  const [uploading, setUploading] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Quick Addition States
  const [quickAddType, setQuickAddType] = useState<"category" | "size" | "color" | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [quickHex, setQuickHex] = useState("#000000");
  const [quickSaving, setQuickSaving] = useState(false);

  const filteredProducts = storedProducts.filter((p) =>
    `${p.name} ${p.category || ""} ${String(p.id ?? "")}`
      .toLowerCase()
      .includes(productQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
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
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (>${MAX_MB}MB)`);
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

  const handleColorToggle = (colorObj: Color) => {
    const exists = product.colors.find(c => c.name === colorObj.name);
    const next = exists
      ? product.colors.filter((c) => c.name !== colorObj.name)
      : [...product.colors, colorObj];
    handleChange("colors", next);
  };

  const handleQuickAdd = async () => {
    if (!quickInput.trim()) return;
    setQuickSaving(true);
    try {
      if (quickAddType === 'category') {
        const { error } = await supabase.from('categories').insert([{ name: quickInput, tenant_id: tenantId }]);
        if (error) throw error;
        setCategories(prev => [...prev, quickInput].sort());
        handleChange("category", quickInput);
        toast.success("Categoria adicionada!");
      } else if (quickAddType === 'size') {
        const { error } = await supabase.from('sizes').insert([{ name: quickInput, tenant_id: tenantId }]);
        if (error) throw error;
        const nextSizes = [...globalSizes, quickInput];
        setGlobalSizes(nextSizes);
        handleSizeToggle(quickInput);
        toast.success("Tamanho adicionado!");
      } else if (quickAddType === 'color') {
        const { data, error } = await supabase.from('colors').insert([{ name: quickInput, hex: quickHex, tenant_id: tenantId }]).select('*').single();
        if (error) throw error;
        setGlobalColors(prev => [...prev, data]);
        handleColorToggle(data);
        toast.success("Cor adicionada!");
      }
      setQuickAddType(null);
      setQuickInput("");
    } catch (e: any) {
      toast.error("Erro ao adicionar item rápido", { description: parseSupabaseError(e) });
    } finally {
      setQuickSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!product.name || !product.category || product.price <= 0) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setUploading(true);
    let uploadedImages: { url: string; publicId: string }[] = [{ url: "", publicId: "" }, { url: "", publicId: "" }, { url: "", publicId: "" }];

    try {
      const uploadPromises = imageFiles.map(async (file, idx) => {
          if (!file) return null;
          const result = await uploadToCloudinary(file);
          return { secure_url: result.secure_url, public_id: result.public_id, idx };
      });

      const results = await Promise.all(uploadPromises);
      results.forEach(res => {
          if (res) {
            uploadedImages[res.idx] = { url: res.secure_url, publicId: res.public_id };
          }
      });
    } catch (err: any) {
      toast.error("Falha no upload das imagens");
      setUploading(false);
      return;
    }

    // Garante que o stockBySize contenha apenas os tamanhos selecionados e com números válidos
    const finalStockBySize: Record<string, number> = {};
    let calculatedTotal = 0;
    
    (product.sizes || []).forEach(s => {
      const qty = Number(distribution[s] || 0);
      finalStockBySize[s] = qty;
      calculatedTotal += qty;
    });

    const baseProductForSupabase = {
      name: product.name,
      category: product.category,
      price: product.price,
      sizes: product.sizes,
      stock: calculatedTotal, // Agora sempre baseado no que foi preenchido por tamanho
      image: uploadedImages[0].url || product.imageUrl,
      publicId: uploadedImages[0].publicId || product.publicId || "",
      image2: uploadedImages[1].url || product.imageUrl2,
      publicId2: uploadedImages[1].publicId || product.publicId2 || "",
      image3: uploadedImages[2].url || product.imageUrl3,
      publicId3: uploadedImages[2].publicId || product.publicId3 || "",
      description: product.description,
      stockBySize: finalStockBySize,
      colors: product.colors,
      tenant_id: tenantId,
    };

    if (IS_SUPABASE_READY && tenantId) {
      try {
        const { data, error } = await supabase.from("products").insert([baseProductForSupabase]).select("*").single();
        if (error) throw error;
        setStoredProducts((prev) => [...prev, data]);
        toast.success("Produto cadastrado com sucesso!");
        
        // Reset form
        setProduct({ 
          name: "", 
          category: "", 
          price: 0, 
          sizes: [], 
          colors: [], 
          stock: 0, 
          imageUrl: "", 
          imageUrl2: "", 
          imageUrl3: "", 
          publicId: "",
          publicId2: "",
          publicId3: "",
          description: "" 
        });
        setImageFiles([null, null, null]);
        setImagePreviews([null, null, null]);
        setDistribution({});
      } catch (e: any) {
        toast.error("Erro ao salvar produto", { description: parseSupabaseError(e) });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRemoveProduct = async (id: number) => {
    if (!confirm("Deseja realmente excluir este produto permanentemente?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      setStoredProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Produto removido");
    } catch (e: any) {
      toast.error("Erro ao remover produto");
    }
  };

  return (
    <div className="space-y-8">
      {/* Form: Adicionar Produto */}
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 py-4 border-b border-primary/10">
          <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Novo Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome do Produto</Label>
                <Input value={product.name} onChange={(e) => handleChange("name", e.target.value)} className="h-11 bg-muted/20 border-primary/10" placeholder="Ex: Camiseta Retrô Brasil..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria</Label>
                  <div className="flex gap-2">
                    <Select value={product.category} onValueChange={(val) => handleChange("category", val)}>
                      <SelectTrigger className="h-11 bg-muted/20 border-primary/10 flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="h-11 w-11 border-primary/10 bg-muted/10 shrink-0" onClick={() => setQuickAddType("category")}>
                      <PlusCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Preço (R$)</Label>
                  <Input type="number" value={product.price || ''} onChange={(e) => handleChange("price", parseFloat(e.target.value))} className="h-11 bg-muted/20 border-primary/10 font-black text-primary" placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="md:col-span-6 space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição / Detalhes</Label>
              <textarea 
                className="flex min-h-[110px] w-full rounded-xl border border-primary/10 bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                placeholder="Detalhes técnicos, material, tipo de patch..."
                value={product.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">Tamanhos Disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {globalSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSizeToggle(s)}
                    className={`h-9 px-4 rounded-xl border text-[10px] font-black transition-all ${
                      product.sizes.includes(s) 
                        ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' 
                        : 'border-primary/10 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                   type="button"
                   onClick={() => setQuickAddType("size")}
                   className="h-9 px-4 rounded-xl border border-dashed border-primary/30 text-[10px] font-black text-primary/60 hover:border-primary hover:text-primary transition-all flex items-center gap-1"
                >
                   <PlusCircle className="w-3 h-3" /> NOVO
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Cores Disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {globalColors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleColorToggle(c)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black transition-all ${
                      product.colors.find(pc => pc.name === c.name)
                        ? 'bg-primary/20 border-primary text-primary shadow-lg'
                        : 'border-primary/10 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </button>
                ))}
                <button
                   type="button"
                   onClick={() => setQuickAddType("color")}
                   className="h-9 px-4 rounded-xl border border-dashed border-primary/30 text-[10px] font-black text-primary/60 hover:border-primary hover:text-primary transition-all flex items-center gap-1"
                >
                   <PlusCircle className="w-3 h-3" /> NOVA
                </button>
              </div>
            </div>
          </div>

          {product.sizes.length > 0 && (
            <div className="space-y-4 p-5 rounded-2xl bg-muted/10 border border-primary/10">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Estoque Inicial por Tamanho</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {product.sizes.map((s) => (
                  <div key={s} className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-muted-foreground block text-center">{s}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={distribution[s] || ""}
                      onChange={(e) => setDistribution((prev) => ({ ...prev, [s]: parseInt(e.target.value) || 0 }))}
                      className="h-9 bg-background border-primary/10 text-center font-bold text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Imagens do Produto (Até 3)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[0, 1, 2].map((idx) => (
                    <div key={idx} className="group relative aspect-square rounded-2xl border-2 border-dashed border-primary/10 hover:border-primary/40 transition-all overflow-hidden bg-muted/5">
                        {imagePreviews[idx] ? (
                            <>
                                <img src={imagePreviews[idx]!} alt="" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button variant="destructive" size="icon" className="rounded-full shadow-2xl" onClick={() => {
                                        const nextFiles = [...imageFiles]; nextFiles[idx] = null; setImageFiles(nextFiles);
                                        const nextPreviews = [...imagePreviews]; nextPreviews[idx] = null; setImagePreviews(nextPreviews);
                                    }}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <Label htmlFor={`prod-img-${idx}`} className="flex flex-col items-center justify-center gap-2 h-full cursor-pointer group-hover:bg-primary/5">
                                <Upload className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Foto {idx+1}</span>
                                <input id={`prod-img-${idx}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0], idx)} />
                            </Label>
                        )}
                    </div>
                ))}
            </div>
          </div>

          <Button 
            className="w-full h-14 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest shadow-xl shadow-primary/20" 
            onClick={handleSubmit} 
            disabled={uploading}
          >
            {uploading ? "Salvando Dados..." : "Cadastrar Produto"}
          </Button>
        </CardContent>
      </Card>

      {/* Grid: Lista de Produtos */}
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-primary/5 px-6 pt-6">
           <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-2">
            Produtos Ativos
            <Badge variant="outline" className="text-[10px] ml-2 font-black border-primary/20 text-muted-foreground">{filteredProducts.length}</Badge>
          </CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={productQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Pesquisar catálogo..."
              className="pl-10 h-10 bg-muted/20 border-primary/10 rounded-full text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-primary/5 border-b border-primary/10">
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Protudo</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categoria</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estoque Total</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                    {visibleProducts.map((p) => (
                        <tr 
                            key={p.id} 
                            onClick={() => setActiveTab("stock")}
                            className="group hover:bg-primary/5 cursor-pointer transition-colors"
                        >
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl border border-primary/10 overflow-hidden shrink-0 bg-muted">
                                        <img src={p.image || "/placeholder.png"} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-sm uppercase truncate max-w-[200px]">{p.name}</div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">REF: #{p.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant="outline" className="border-primary/20 text-muted-foreground text-[9px] font-black uppercase">{p.category}</Badge>
                            </td>
                            <td className="px-6 py-4 font-black text-primary text-sm">
                                {formatBRL(p.price)}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="font-black text-xs">{p.stock} <span className="text-[10px] opacity-40">un</span></span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase truncate max-w-[150px]">{p.sizes.join(' · ')}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveProduct(p.id!); }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          {visibleProducts.length === 0 && (
            <div className="py-20 text-center space-y-3">
                 <div className="text-4xl opacity-20">?</div>
                 <p className="text-muted-foreground font-medium italic">Nenhum produto encontrado.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-8 border-t border-primary/5">
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage <= 1} 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-9 px-4 font-black text-[10px] uppercase border-primary/10"
                >
                    Anterior
                </Button>
                <div className="flex items-center gap-1.5 px-4 font-black text-xs">
                    <span className="text-primary">{currentPage}</span>
                    <span className="opacity-20">/</span>
                    <span className="text-muted-foreground">{totalPages}</span>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-9 px-4 font-black text-[10px] uppercase border-primary/10"
                >
                    Próxima
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro Rápido */}
      <Dialog open={quickAddType !== null} onOpenChange={(open) => !open && setQuickAddType(null)}>
        <DialogContent className="bg-card text-foreground border-primary/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-widest text-primary">
              Cadastrar {quickAddType === 'category' ? 'Categoria' : quickAddType === 'size' ? 'Tamanho' : 'Cor'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium italic">
                Adicione um novo item global para usar em seus produtos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
               <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Nome do(a) {quickAddType === 'category' ? 'Categoria' : quickAddType === 'size' ? 'Tamanho' : 'Cor'}
               </Label>
               <Input 
                  value={quickInput} 
                  onChange={(e) => setQuickInput(e.target.value)} 
                  placeholder="Ex: Camisetas, XL, Azul..." 
                  className="h-11 bg-muted/20 border-primary/10"
               />
            </div>
            {quickAddType === 'color' && (
              <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Selecione a Cor</Label>
                  <div className="flex items-center gap-4">
                      <Input 
                        type="color" 
                        value={quickHex} 
                        onChange={(e) => setQuickHex(e.target.value)} 
                        className="w-12 h-12 p-1 bg-background border-primary/10"
                      />
                      <span className="text-xs font-mono opacity-50">{quickHex.toUpperCase()}</span>
                  </div>
              </div>
            )}
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setQuickAddType(null)} className="font-bold">Cancelar</Button>
             <Button 
                onClick={handleQuickAdd} 
                disabled={quickSaving || !quickInput.trim()}
                className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest"
             >
                {quickSaving ? 'Salvando...' : 'Cadastrar'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsTab;
