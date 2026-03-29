import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Trash2, Upload, X, Search, PlusCircle, Pencil, ShoppingBag, List, Tag, Box, ArrowRight, History } from "lucide-react";
import { formatBRL, parseSupabaseError, sortSizes } from "@/lib/utils";
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
  const [editingId, setEditingId] = useState<number | null>(null);

  const [quickAddType, setQuickAddType] = useState<"category" | "size" | "color" | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [quickHex, setQuickHex] = useState("#000000");
  const [quickSaving, setQuickSaving] = useState(false);

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
      active: (product as any).active ?? true,
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

  return (
    <div className="space-y-10">
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
                   <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-40 ml-2">Nome do Produto</Label>
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
                  <p className="text-[8px] font-black text-muted-foreground opacity-40 uppercase tracking-widest text-center">Tamanho recomendado: 1000x1000px</p>
               </div>

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
              {uploading ? "Sincronizando..." : editingId ? "Confirmar Atualização" : "Finalizar Cadastro de Produto"}
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

      <Dialog open={quickAddType !== null} onOpenChange={(open) => !open && setQuickAddType(null)}>
        <DialogContent className="bg-card text-foreground border-primary/30 max-w-md rounded-[3rem] p-10 overflow-hidden shadow-3xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10" />
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-primary flex items-center gap-3">
              <PlusCircle className="w-6 h-6" /> Cadastrar {quickAddType === 'category' ? 'Categoria' : quickAddType === 'size' ? 'Tamanho' : 'Cor'}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium opacity-60">
                Adicione uma nova variante global que será compartilhada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2">Identificador / Nome</Label>
               <Input 
                  value={quickInput} 
                  onChange={(e) => setQuickInput(e.target.value)} 
                  placeholder="DIGITE AQUI..." 
                  className="h-14 bg-background/50 border-primary/10 rounded-2xl font-black text-xs px-6 shadow-xl"
               />
            </div>
          </div>
          <DialogFooter className="mt-10 gap-3">
             <Button variant="ghost" onClick={() => setQuickAddType(null)} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px]">Voltar</Button>
             <Button 
                onClick={handleQuickAdd} 
                disabled={quickSaving || !quickInput.trim()}
                className="h-14 px-8 rounded-2xl bg-primary text-black font-black uppercase flex-1 shadow-xl"
             >
                {quickSaving ? '...' : 'Confirmar'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsTab;
