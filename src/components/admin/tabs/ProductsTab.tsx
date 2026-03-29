import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Trash2, Upload, X, Search, PlusCircle, Pencil, ShoppingBag, List, Tag, Box, ArrowRight, History } from "lucide-react";
import { formatBRL, parseSupabaseError, sortSizes, formatPhoneMask } from "@/lib/utils";
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
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleQueryChange = (val: string) => {
    setProductQuery(val);
    setCurrentPage(1);
  };

  const handleChange = (field: string, value: any) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditProduct = (p: AdminProduct) => {
      setEditingId(p.id!);
      setProduct({
        name: p.name,
        category: p.category || "",
        price: p.price,
        sizes: p.sizes || [],
        colors: (p.colors || []) as Color[],
        stock: p.stock || 0,
        imageUrl: p.image || "",
        imageUrl2: p.image2 || "",
        imageUrl3: p.image3 || "",
        publicId: p.publicId || "",
        publicId2: p.publicId2 || "",
        publicId3: p.publicId3 || "",
        description: p.description || ""
      });
      setDistribution(p.stockBySize || {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.info("Produto carregado para edição");
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
      stock: calculatedTotal,
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
        if (editingId) {
          const { error } = await supabase
            .from("products")
            .update(baseProductForSupabase)
            .eq("id", editingId)
            .eq("tenant_id", tenantId);
          if (error) throw error;
          setStoredProducts((prev) => prev.map(p => p.id === editingId ? { ...p, ...baseProductForSupabase } : p));
          toast.success("Produto atualizado com sucesso!");
          setEditingId(null);
        } else {
          const { data, error } = await supabase.from("products").insert([baseProductForSupabase]).select("*").single();
          if (error) throw error;
          setStoredProducts((prev) => [...prev, data]);
          toast.success("Produto cadastrado com sucesso!");
        }
        
        setProduct({ 
          name: "", category: "", price: 0, sizes: [], colors: [], stock: 0, 
          imageUrl: "", imageUrl2: "", imageUrl3: "", publicId: "", publicId2: "", publicId3: "", description: "" 
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
    <div className="space-y-10">
      {/* Form: Adicionar Produto */}
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-2xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                {editingId ? <Pencil className="w-8 h-8" /> : <PlusCircle className="w-8 h-8" />}
                {editingId ? "Editar Produto" : "Novo Produto"}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Cadastro técnico e visual de mercadorias</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-10 space-y-8 md:space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-3">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary ml-2">Identificação Principal</Label>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-40 ml-2">Nome do Protudo</Label>
                   <Input value={product.name} onChange={(e) => handleChange("name", e.target.value)} className="h-14 bg-background/50 border-primary/5 rounded-2xl uppercase font-black text-xs tracking-widest focus:ring-primary/20 shadow-xl" placeholder="EX: CAMISETA RETRÔ BRASIL 1970..." />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-40 ml-2">Categoria Mestra</Label>
                  <div className="flex gap-2">
                    <Select value={product.category} onValueChange={(val) => handleChange("category", val)}>
                      <SelectTrigger className="h-14 bg-background/50 border-primary/5 rounded-2xl font-black uppercase text-[10px] tracking-widest px-6 shadow-xl">
                        <SelectValue placeholder="SELECIONE" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-primary/20 rounded-xl">
                        {categories.map((c) => (
                          <SelectItem key={c} value={c} className="text-[10px] font-black uppercase">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="h-14 w-14 border-primary/10 bg-primary/5 rounded-2xl shrink-0 hover:bg-primary/20 text-primary" onClick={() => setQuickAddType("category")}>
                      <PlusCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-40 ml-2">Valor de Venda (BRL)</Label>
                  <Input type="number" value={product.price || ''} onChange={(e) => handleChange("price", parseFloat(e.target.value))} className="h-14 bg-background/50 border-primary/5 rounded-2xl font-black text-primary text-base shadow-xl" placeholder="0.00" />
                </div>
              </div>

               <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-40 ml-2">Descritivo Comercial</Label>
                <textarea 
                  className="flex min-h-[160px] w-full rounded-[2rem] border border-primary/5 bg-background/50 px-6 py-5 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-medium leading-relaxed shadow-xl"
                  placeholder="Detalhes técnicos, material, tipo de patch, durabilidade e cuidados..."
                  value={product.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-8">
               <div className="space-y-4">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary ml-2 flex items-center gap-2">
                     <Upload className="w-3.5 h-3.5" /> Estúdio de Imagens
                  </Label>
                  
                  {/* Ajuste Mobile: Grid 3 colunas em qualquer tela para as fotos */}
                  <div className="grid grid-cols-3 gap-3 md:gap-6">
                      {[0, 1, 2].map((idx) => (
                          <div key={idx} className="group relative aspect-square rounded-2xl border-2 border-dashed border-primary/5 hover:border-primary/30 transition-all overflow-hidden bg-background/40 shadow-xl">
                              {imagePreviews[idx] ? (
                                  <>
                                      <img src={imagePreviews[idx]!} alt="" className="h-full w-full object-cover" />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <Button variant="destructive" size="icon" className="rounded-full h-8 w-8 shadow-2xl" onClick={() => {
                                              const nextFiles = [...imageFiles]; nextFiles[idx] = null; setImageFiles(nextFiles);
                                              const nextPreviews = [...imagePreviews]; nextPreviews[idx] = null; setImagePreviews(nextPreviews);
                                          }}>
                                              <X className="w-3.5 h-3.5" />
                                          </Button>
                                      </div>
                                  </>
                              ) : (
                                  <Label htmlFor={`prod-img-${idx}`} className="flex flex-col items-center justify-center gap-1 h-full cursor-pointer group-hover:bg-primary/5">
                                      <Upload className="w-4 h-4 text-primary/30 group-hover:text-primary transition-colors" />
                                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover:text-primary transition-colors">Foto {idx+1}</span>
                                      <input id={`prod-img-${idx}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0], idx)} />
                                  </Label>
                              )}
                          </div>
                      ))}
                  </div>
                  <p className="text-[8px] font-black text-muted-foreground opacity-40 uppercase tracking-widest text-center">Tamanho recomendado: 1000x1000px (Máx 5MB)</p>
               </div>

                {/* Variantes e Estoque Rápido */}
                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-muted/10 border border-primary/5 space-y-6">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 text-center">Variantes & Inventário</h5>
                   
                   <div className="space-y-4">
                      <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Grade de Tamanhos</Label>
                      <div className="flex flex-wrap gap-2">
                        {globalSizes.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSizeToggle(s)}
                            className={`h-9 px-4 rounded-xl border text-[10px] font-black transition-all ${
                              product.sizes.includes(s) 
                                ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' 
                                : 'border-primary/5 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                        <button
                           type="button"
                           onClick={() => setQuickAddType("size")}
                           className="h-9 px-4 rounded-xl border border-dashed border-primary/20 text-[10px] font-black text-primary/40 hover:border-primary/60 hover:text-primary transition-all flex items-center gap-1"
                        >
                           <PlusCircle className="w-3 h-3" /> NOVO
                        </button>
                      </div>
                   </div>

                   {product.sizes.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-primary/5">
                         <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Qtd p/ Tamanho</Label>
                         <div className="grid grid-cols-3 gap-2">
                            {product.sizes.map((s) => (
                              <div key={s} className="space-y-1">
                                <Label className="text-[8px] uppercase font-black text-primary/40 block text-center">{s}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={distribution[s] || ""}
                                  onChange={(e) => setDistribution((prev) => ({ ...prev, [s]: parseInt(e.target.value) || 0 }))}
                                  className="h-9 bg-background/50 border-primary/5 text-center font-black text-[10px] rounded-lg"
                                />
                              </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>

          <div className="pt-8 md:pt-10 border-t border-primary/10 flex flex-col sm:flex-row gap-3 md:gap-4">
            <Button 
              className="flex-1 h-16 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 text-xs" 
              onClick={handleSubmit} 
              disabled={uploading}
            >
              {uploading ? "Sincronizando Banco..." : editingId ? "Confirmar Atualização" : "Finalizar Cadastro de Produto"}
            </Button>
            
            {editingId && (
              <Button 
                variant="outline"
                className="h-16 px-10 border-primary/10 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-primary/5"
                onClick={() => {
                  setEditingId(null);
                  setProduct({ 
                    name: "", category: "", price: 0, sizes: [], colors: [], stock: 0, 
                    imageUrl: "", imageUrl2: "", imageUrl3: "", publicId: "", publicId2: "", publicId3: "", description: "" 
                  });
                  setDistribution({});
                  setImageFiles([null, null, null]);
                  setImagePreviews([null, null, null]);
                }}
              >
                Desistir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid: Lista de Produtos Premium */}
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 shadow-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-primary/5 py-6 md:py-8 border-b border-primary/10 px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <List className="w-8 h-8" /> Portfólio Ativo
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Visualização completa do catálogo disponível</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60" />
                   <Input 
                     placeholder="PESQUISAR NO CATÁLOGO..." 
                     value={productQuery}
                     onChange={(e) => handleQueryChange(e.target.value)}
                     className="h-14 bg-background/50 border-primary/5 pl-14 pr-6 rounded-2xl uppercase font-black text-xs tracking-widest focus:ring-primary/20 shadow-xl"
                   />
                </div>
                <Badge variant="outline" className="h-14 px-6 rounded-2xl border-primary/10 text-[11px] font-black uppercase text-primary bg-background/40 shadow-xl">
                  {filteredProducts.length} <span className="opacity-40 ml-2">SKUS</span>
                </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Layout de Cartões para Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden p-4">
            {visibleProducts.map((p) => (
              <div 
                key={p.id} 
                onClick={() => setActiveTab("stock")}
                className="p-6 rounded-[2rem] bg-muted/5 border border-primary/10 space-y-5 relative overflow-hidden active:scale-[0.98] transition-all hover:border-primary/40 shadow-xl"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[30px] -z-10" />
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-[1.5rem] border border-primary/10 flex items-center justify-center bg-background/50 overflow-hidden shadow-lg shrink-0">
                     <img src={p.image || "/placeholder.png"} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" alt="" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-black text-base uppercase truncate leading-tight">{p.name}</h4>
                    <div className="flex items-center gap-3">
                       <Badge variant="outline" className="border-primary/10 text-primary text-[8px] font-black uppercase h-5 px-2 bg-primary/5">{p.category}</Badge>
                       <span className="text-[9px] font-black text-muted-foreground opacity-40 uppercase tracking-widest">ID: #{p.id}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-primary/5">
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-black text-muted-foreground opacity-40 mb-1 tracking-widest">Inventário</span>
                    <span className="font-black text-lg text-primary">{p.stock} <span className="text-[10px] opacity-40">unidades</span></span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-12 w-12 rounded-2xl bg-primary/5 text-primary hover:bg-primary transition-all hover:text-black"
                      onClick={(e) => { e.stopPropagation(); handleEditProduct(p); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-12 w-12 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive transition-all hover:text-white"
                      onClick={(e) => { e.stopPropagation(); handleRemoveProduct(p.id!); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela para Desktop */}
          <div className="hidden md:block overflow-hidden rounded-b-[2.5rem]">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-primary/5 border-y border-primary/10">
                        <th className="px-10 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Detalhamento do Produto</th>
                        <th className="px-10 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Classificação</th>
                        <th className="px-10 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Preço Final</th>
                        <th className="px-10 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary">Disponibilidade</th>
                        <th className="px-10 py-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-primary">Operativo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                    {visibleProducts.map((p) => (
                        <tr 
                            key={p.id} 
                            onClick={() => setActiveTab("stock")}
                            className="group hover:bg-primary/5 cursor-pointer transition-all"
                        >
                            <td className="px-10 py-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-[1.2rem] border border-primary/10 flex items-center justify-center bg-background/50 overflow-hidden shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500">
                                        <img src={p.image || "/placeholder.png"} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-sm uppercase truncate max-w-[200px] group-hover:text-primary transition-colors">{p.name}</div>
                                        <div className="text-[10px] font-black text-muted-foreground opacity-30 uppercase tracking-widest">SKU: #{p.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-10 py-6">
                                <Badge variant="outline" className="border-primary/10 text-muted-foreground text-[8px] font-black uppercase px-3 py-1 rounded-lg bg-background/20">{p.category}</Badge>
                            </td>
                            <td className="px-10 py-6 font-black text-primary text-base">
                                {formatBRL(p.price)}
                            </td>
                            <td className="px-10 py-6">
                                <div className="flex flex-col">
                                    <span className="font-black text-sm">{p.stock} <span className="text-[10px] opacity-30 uppercase ml-1">unidades</span></span>
                                    <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest truncate max-w-[150px]">{p.sizes.join(' · ')}</span>
                                </div>
                            </td>
                            <td className="px-10 py-6 text-right">
                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-10 w-10 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-black transition-all"
                                        onClick={(e) => { e.stopPropagation(); handleEditProduct(p); }}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-10 w-10 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveProduct(p.id!); }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          {/* Pagination Premium */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 md:gap-6 p-4 md:p-8 bg-primary/5 border-t border-primary/10 rounded-b-[2rem] md:rounded-b-[2.5rem]">
                <Button 
                    variant="ghost" 
                    disabled={currentPage <= 1} 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-10 md:h-12 px-4 md:px-8 font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-primary/10 rounded-xl w-auto flex-1 md:flex-none max-w-[120px]"
                >
                    Anterior
                </Button>
                <div className="flex items-center gap-1.5 p-1 md:p-2 bg-muted/20 rounded-xl md:rounded-2xl border border-primary/5 shadow-inner px-2 shrink-0">
                    <span className="px-2 md:px-4 text-[10px] md:text-xs font-black text-primary whitespace-nowrap">{currentPage} <span className="text-muted-foreground opacity-30 mx-1">/</span> {totalPages}</span>
                </div>
                <Button 
                    variant="ghost" 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-10 md:h-12 px-4 md:px-8 font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-primary/10 rounded-xl w-auto flex-1 md:flex-none max-w-[120px]"
                >
                    Próxima
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro Rápido Premium */}
      <Dialog open={quickAddType !== null} onOpenChange={(open) => !open && setQuickAddType(null)}>
        <DialogContent className="bg-card text-foreground border-primary/30 max-w-md rounded-[3rem] p-10 overflow-hidden shadow-3xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10" />
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-primary flex items-center gap-3">
              <PlusCircle className="w-6 h-6" /> Cadastrar {quickAddType === 'category' ? 'Categoria' : quickAddType === 'size' ? 'Tamanho' : 'Cor'}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium opacity-60">
                Adicione uma nova variante global que será compartilhada em todo o seu catálogo comercial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2">Identificador Visual / Nome</Label>
               <Input 
                  value={quickInput} 
                  onChange={(e) => setQuickInput(e.target.value)} 
                  placeholder="EX: CAMISETAS, XL, AZUL..." 
                  className="h-14 bg-background/50 border-primary/10 rounded-2xl font-black text-xs px-6 shadow-xl"
               />
            </div>
            {quickAddType === 'color' && (
              <div className="space-y-2 p-6 rounded-2xl bg-muted/10 border border-primary/5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1 block mb-3 text-center">Selecionador de Matiz</Label>
                  <div className="flex items-center justify-center gap-6">
                      <div className="relative group">
                        <Input 
                            type="color" 
                            value={quickHex} 
                            onChange={(e) => setQuickHex(e.target.value)} 
                            className="w-20 h-20 p-1 bg-background border-primary/20 rounded-[1.5rem] cursor-pointer shadow-2xl group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black font-mono text-primary">{quickHex.toUpperCase()}</span>
                        <span className="text-[8px] font-black opacity-30 uppercase tracking-widest">Hex Code</span>
                      </div>
                  </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-10 gap-3">
             <Button variant="ghost" onClick={() => setQuickAddType(null)} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest">Voltar</Button>
             <Button 
                onClick={handleQuickAdd} 
                disabled={quickSaving || !quickInput.trim()}
                className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex-1 transition-all active:scale-95"
             >
                {quickSaving ? 'Sincronizando...' : 'Confirmar e Adicionar'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsTab;
