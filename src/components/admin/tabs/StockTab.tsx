import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Package, 
  Search, 
  Layers, 
  Pencil, 
  X, 
  PlusCircle, 
  Box, 
  Save,
  Trash2,
  Settings2,
  BarChart3,
  Palette,
  Info,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Power,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AdminProduct, Color } from "@/lib/types";
import { parseSupabaseError } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StockTabProps {
  tenantId: string;
  storedProducts: AdminProduct[];
  setStoredProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>;
  globalSizes: string[];
  setGlobalSizes: React.Dispatch<React.SetStateAction<string[]>>;
  globalColors: Color[];
  setGlobalColors: React.Dispatch<React.SetStateAction<Color[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  uploadToCloudinary: (file: File) => Promise<{ secure_url: string; public_id: string }>;
  removeFromCloudinary: (publicId: string) => Promise<any>;
}

const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const sortSizes = (sizes: string[]) => {
  const order = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'XXXG'];
  return [...sizes].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
};

const StockTab = ({ 
  tenantId, 
  storedProducts, 
  setStoredProducts, 
  globalSizes, 
  setGlobalSizes, 
  globalColors, 
  setGlobalColors, 
  categories,
  setCategories,
  uploadToCloudinary,
  removeFromCloudinary
}: StockTabProps) => {
  const [stockQuery, setStockQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estado para o produto em edição (MODAL)
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  // Estado para o alerta de exclusão (ALERT DIALOG)
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para cadastros rápidos dentro do modal
  const [quickAddType, setQuickAddType] = useState<"category" | "size" | "color" | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [quickHex, setQuickHex] = useState("#000000");

  const filteredStock = storedProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(stockQuery.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(stockQuery.toLowerCase());
    
    const isActive = p.active ?? true;
    const matchesStatus = filterStatus === "all" 
      ? true 
      : filterStatus === "active" 
        ? isActive === true 
        : isActive === false;
        
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const visibleStock = filteredStock.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleQueryChange = (val: string) => {
    setStockQuery(val);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: "all" | "active" | "inactive") => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleOpenEdit = (p: AdminProduct) => {
    setEditingProduct({ ...p, active: p.active ?? true });
  };

  const handleUpdateField = (field: keyof AdminProduct, value: any) => {
    if (!editingProduct) return;
    setEditingProduct({ ...editingProduct, [field]: value });
  };

  const handleToggleActive = async (currentStatus: boolean) => {
    if (!editingProduct || !editingProduct.id) return;
    const nextStatus = !currentStatus;
    
    // Atualização otimista na UI
    setEditingProduct({ ...editingProduct, active: nextStatus });
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: nextStatus })
        .eq('id', editingProduct.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      setStoredProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, active: nextStatus } : p));
      toast.success(nextStatus ? "Produto ativado na loja" : "Produto oculto na loja");
    } catch (e: any) {
      toast.error("Erro ao alterar visibilidade");
      // Rollback em caso de erro
      setEditingProduct({ ...editingProduct, active: currentStatus });
    }
  };

  const handleStockUpdate = (size: string, val: number) => {
    if (!editingProduct) return;
    const nextStock = { ...(editingProduct.stockBySize || {}), [size]: val };
    const total = Object.values(nextStock).reduce((acc, v) => acc + (Number(v) || 0), 0) as number;
    setEditingProduct({ ...editingProduct, stockBySize: nextStock, stock: total });
  };

  const handleToggleSize = (size: string) => {
    if (!editingProduct) return;
    const currentSizes = editingProduct.sizes || [];
    const nextSizes = currentSizes.includes(size)
      ? currentSizes.filter(s => s !== size)
      : sortSizes([...currentSizes, size]);
    
    const nextStock = { ...(editingProduct.stockBySize || {}) };
    if (!currentSizes.includes(size)) {
      nextStock[size] = 0;
    } else {
      delete nextStock[size];
    }
    
    const total = Object.values(nextStock).reduce((acc, v) => acc + (Number(v) || 0), 0) as number;
    setEditingProduct({ ...editingProduct, sizes: nextSizes, stockBySize: nextStock, stock: total });
  };

  const handleToggleColor = (colorObj: Color) => {
    if (!editingProduct) return;
    const currentColors = (editingProduct.colors || []) as Color[];
    const exists = currentColors.some(c => c.name === colorObj.name);
    const nextColors = exists
      ? currentColors.filter(c => c.name !== colorObj.name)
      : [...currentColors, colorObj];
    setEditingProduct({ ...editingProduct, colors: nextColors });
  };

  const handleImageUpload = async (file: File | undefined, index: number) => {
    if (!file || !editingProduct) return;
    setUploadingIdx(index);
    try {
      const result = await uploadToCloudinary(file);
      const urlField = index === 0 ? "image" : index === 1 ? "image2" : "image3";
      const idField = index === 0 ? "publicId" : index === 1 ? "publicId2" : "publicId3";
      
      handleUpdateField(urlField as any, result.secure_url);
      handleUpdateField(idField as any, result.public_id);
      
      toast.success(`Foto ${index + 1} carregada`);
    } catch (e: any) {
      toast.error("Erro no upload");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleImageRemove = async (index: number) => {
    if (!editingProduct) return;
    const idField = index === 0 ? "publicId" : index === 1 ? "publicId2" : "publicId3";
    const urlField = index === 0 ? "image" : index === 1 ? "image2" : "image3";
    const publicId = editingProduct[idField as keyof AdminProduct] as string;

    try {
      if (publicId) await removeFromCloudinary(publicId);
      handleUpdateField(urlField as any, "");
      handleUpdateField(idField as any, "");
      toast.success("Imagem removida");
    } catch (e: any) {
      toast.error("Erro ao remover imagem");
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !editingProduct.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          price: editingProduct.price,
          category: editingProduct.category,
          description: editingProduct.description,
          sizes: editingProduct.sizes,
          stockBySize: editingProduct.stockBySize,
          stock: editingProduct.stock,
          colors: editingProduct.colors,
          image: editingProduct.image,
          image2: editingProduct.image2,
          image3: editingProduct.image3,
          publicId: editingProduct.publicId,
          publicId2: editingProduct.publicId2,
          publicId3: editingProduct.publicId3,
          active: editingProduct.active
        })
        .eq('id', editingProduct.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setStoredProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
      toast.success("Produto atualizado com sucesso");
      setEditingProduct(null);
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: parseSupabaseError(e) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveProduct = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteId).eq("tenant_id", tenantId);
      if (error) throw error;
      setStoredProducts((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Produto removido permanentemente");
      setEditingProduct(null);
      setDeleteId(null);
    } catch (e: any) {
      toast.error("Erro ao remover produto");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickInput.trim()) return;
    try {
      if (quickAddType === "category") {
        const { error } = await supabase.from('categories').insert({ name: quickInput, tenant_id: tenantId });
        if (error) throw error;
        setCategories(prev => [...prev, quickInput].sort());
        handleUpdateField("category", quickInput);
        toast.success("Categoria criada!");
      } else if (quickAddType === "size") {
        const { error } = await supabase.from('sizes').insert({ name: quickInput.toUpperCase(), tenant_id: tenantId });
        if (error) throw error;
        setGlobalSizes(prev => [...prev, quickInput.toUpperCase()]);
        handleToggleSize(quickInput.toUpperCase());
        toast.success("Tamanho criado!");
      } else if (quickAddType === "color") {
        const { data, error } = await supabase.from('colors').insert({ name: quickInput, hex: quickHex, tenant_id: tenantId }).select('*').single();
        if (error) throw error;
        setGlobalColors(prev => [...prev, data]);
        handleToggleColor(data);
        toast.success("Cor criada!");
      }
      setQuickAddType(null);
      setQuickInput("");
    } catch (e: any) {
      toast.error("Erro no cadastro rápido");
    }
  };

  return (
    <div className="space-y-10">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 shadow-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-primary/5 py-6 md:py-8 border-b border-primary/10 px-6 md:px-10">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <Box className="w-8 h-8" /> Gestão de Estoque
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Operação logística e controle de SKUS ativos</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                {/* Status Filter */}
                <div className="flex bg-background/50 p-1.5 rounded-2xl border border-primary/5 shadow-inner w-full md:w-auto">
                  <Button 
                    variant={filterStatus === 'all' ? 'default' : 'ghost'} 
                    size="sm" 
                    className={`flex-1 md:flex-none h-11 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'all' ? 'bg-primary text-black hover:bg-primary/90 shadow-lg' : 'text-muted-foreground hover:bg-primary/5'}`}
                    onClick={() => handleStatusFilter('all')}
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={filterStatus === 'active' ? 'default' : 'ghost'} 
                    size="sm" 
                    className={`flex-1 md:flex-none h-11 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'active' ? 'bg-primary text-black hover:bg-primary/90 shadow-lg' : 'text-muted-foreground hover:bg-primary/5'}`}
                    onClick={() => handleStatusFilter('active')}
                  >
                    Ativos
                  </Button>
                  <Button 
                    variant={filterStatus === 'inactive' ? 'default' : 'ghost'} 
                    size="sm" 
                    className={`flex-1 md:flex-none h-11 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'inactive' ? 'bg-primary text-black hover:bg-primary/90 shadow-lg' : 'text-zinc-500 hover:bg-primary/5'}`}
                    onClick={() => handleStatusFilter('inactive')}
                  >
                    Ocultos
                  </Button>
                </div>

                <div className="relative flex-1 md:w-80 w-full">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60" />
                   <Input 
                     placeholder="PESQUISAR SKU OU NOME..." 
                     value={stockQuery}
                     onChange={(e) => handleQueryChange(e.target.value)}
                     className="h-14 bg-background/50 border-primary/5 pl-14 pr-6 rounded-2xl uppercase font-black text-xs tracking-widest focus:ring-primary/20 shadow-xl"
                   />
                </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 md:p-10 pb-0">
             {[
               { label: 'Total Itens', val: storedProducts.length, color: 'text-primary' },
               { label: 'Uni. Ativas', val: storedProducts.reduce((acc, p) => acc + (p.stock || 0), 0), color: 'text-blue-500' },
               { label: 'Est. Crítico', val: storedProducts.filter(p => p.stock <= 5 && p.stock > 0).length, color: 'text-amber-500' },
               { label: 'Esgotados', val: storedProducts.filter(p => p.stock === 0).length, color: 'text-destructive' }
             ].map((stat, i) => (
                <div key={i} className="bg-muted/10 p-5 rounded-2xl md:rounded-3xl border border-primary/5 flex flex-col items-center justify-center group hover:bg-muted/20 transition-all shadow-xl">
                   <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors text-center">{stat.label}</span>
                   <span className={`text-xl md:text-2xl font-black ${stat.color}`}>{stat.val}</span>
                </div>
             ))}
          </div>

          <div className="p-6 md:p-10 space-y-8 md:space-y-10">
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {visibleStock.length > 0 ? visibleStock.map((p) => (
                <div 
                  key={p.id} 
                  className={`bg-card/40 border border-primary/5 rounded-[2rem] p-5 flex items-center justify-between active:scale-[0.98] transition-all ${!p.active ? 'grayscale opacity-60' : ''}`}
                  onClick={() => handleOpenEdit(p)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/20 overflow-hidden shrink-0">
                      {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-3.5 opacity-20" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase truncate leading-tight">{p.name}</h4>
                        {!p.active && <Badge className="text-[6px] h-3 px-1 bg-destructive/20 text-destructive border-none font-black tracking-tighter">OFF</Badge>}
                      </div>
                      <p className="text-[10px] font-black text-primary">{formatBRL(p.price)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-primary/10 text-primary border-primary/20">
                    {p.stock} UN
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-12 bg-muted/5 rounded-[2.5rem] border border-dashed border-primary/10">
                    <Filter className="w-10 h-10 text-primary/10 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Nenhum resultado para os filtros atuais</p>
                </div>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-[2.5rem] border border-primary/10 bg-muted/5 shadow-2xl">
              <Table>
                <TableHeader className="bg-primary/5 border-b border-primary/10">
                  <TableRow className="border-none">
                    <TableHead className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-primary">Ativo de Venda</TableHead>
                    <TableHead className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-primary">Classificação</TableHead>
                    <TableHead className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-primary">Valor SKU</TableHead>
                    <TableHead className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-primary">Volumetria</TableHead>
                    <TableHead className="px-10 py-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-primary">Operativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-primary/5">
                  {visibleStock.length > 0 ? visibleStock.map((p) => (
                    <TableRow key={p.id} className={`cursor-pointer transition-all border-none hover:bg-primary/5 group ${!p.active ? 'opacity-40 grayscale-[0.5]' : ''}`} onClick={() => handleOpenEdit(p)}>
                      <TableCell className="px-10 py-6">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-[1.2rem] border border-primary/10 overflow-hidden shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500">
                            {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-primary/20" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black uppercase tracking-tight truncate max-w-[200px]">{p.name}</span>
                            {!p.active && <span className="text-[8px] font-black text-destructive/60 uppercase tracking-widest mt-0.5">Item Oculto</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-10 py-6">
                        <Badge variant="outline" className="text-[8px] uppercase font-black border-primary/10 text-primary px-3 py-1 rounded-lg bg-background/20">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-10 py-6 font-black text-primary text-base">{formatBRL(p.price)}</TableCell>
                      <TableCell className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${p.stock > 10 ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : p.stock > 0 ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-destructive shadow-[0_0_12px_rgba(239,68,68,0.4)]'}`} />
                          <span className="font-black text-sm">{p.stock || 0} <span className="text-[9px] opacity-40 ml-1">UN</span></span>
                        </div>
                      </TableCell>
                      <TableCell className="px-10 py-6 text-right">
                        <Button variant="ghost" className="h-12 w-12 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-black transition-all shadow-lg border border-primary/5">
                          <Settings2 className="w-5 h-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="py-24 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-20">
                                <Box className="w-12 h-12 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Filtro sem resultados ativos</span>
                            </div>
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-6 p-6 border-t border-primary/10 mt-4">
                <Button variant="ghost" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="h-12 px-8 font-black text-[10px] uppercase rounded-xl border border-primary/5 hover:bg-primary/5">Anterior</Button>
                <div className="bg-muted/10 rounded-2xl border border-primary/5 px-6 h-10 flex items-center font-black text-xs text-primary shadow-inner">{currentPage} / {totalPages}</div>
                <Button variant="ghost" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="h-12 px-8 font-black text-[10px] uppercase rounded-xl border border-primary/5 hover:bg-primary/5">Próxima</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE EDIÇÃO COMPLETA */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-4xl w-[95vw] md:w-full bg-card border-primary/20 rounded-[2.5rem] md:rounded-[3.5rem] p-0 overflow-hidden shadow-3xl text-foreground">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -z-10" />
          
          <div className="flex flex-col h-[90vh] md:h-auto max-h-[90vh]">
            <div className="p-8 md:p-12 border-b border-primary/10 bg-primary/5 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl border-2 border-primary/20 overflow-hidden shadow-2xl bg-background shrink-0 relative">
                    {editingProduct?.active === false && <div className="absolute inset-0 bg-destructive/10 backdrop-grayscale-[0.5] z-10" />}
                    {editingProduct?.image ? <img src={editingProduct.image} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-5 opacity-20" />}
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tight text-primary truncate max-w-[200px] md:max-w-md">
                      {editingProduct?.name || "Editor de Ativo"}
                    </DialogTitle>
                    <div className="flex items-center gap-3">
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-40">Ref ID: #{editingProduct?.id}</DialogDescription>
                        {editingProduct?.active === false && <Badge className="bg-destructive text-white border-none text-[8px] font-black h-4 px-2 tracking-widest">DESATIVADO</Badge>}
                    </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-3 md:gap-4">
                  <Button 
                    variant="outline" 
                    className={`h-12 w-12 md:h-14 md:w-auto md:px-6 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-3 border shadow-xl ${editingProduct?.active ? 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/20' : 'border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/20'}`}
                    onClick={() => handleToggleActive(editingProduct?.active ?? true)}
                  >
                    {editingProduct?.active ? <><Eye className="w-5 h-5" /> <span className="hidden md:inline">Ativo na Loja</span></> : <><EyeOff className="w-5 h-5" /> <span className="hidden md:inline">Oculto na Loja</span></>}
                  </Button>
                  
                  <Button variant="ghost" className="h-12 w-12 md:h-14 md:w-14 rounded-2xl hover:bg-destructive/10 text-destructive border border-destructive/5" onClick={() => editingProduct && setDeleteId(editingProduct.id!)}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <Tabs defaultValue="geral" className="w-full h-full flex flex-col">
                <TabsList className="bg-muted/30 p-2 border-b border-primary/5 w-full flex justify-start h-16 rounded-none px-8 md:px-12 gap-8">
                  <TabsTrigger value="geral" className="bg-transparent border-none data-[state=active]:text-primary data-[state=active]:bg-primary/5 h-full px-6 flex items-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all">
                    <Info className="w-4 h-4" /> Geral
                  </TabsTrigger>
                  <TabsTrigger value="estoque" className="bg-transparent border-none data-[state=active]:text-primary data-[state=active]:bg-primary/5 h-full px-6 flex items-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all">
                    <BarChart3 className="w-4 h-4" /> Estoque
                  </TabsTrigger>
                  <TabsTrigger value="estilo" className="bg-transparent border-none data-[state=active]:text-primary data-[state=active]:bg-primary/5 h-full px-6 flex items-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all">
                    <Palette className="w-4 h-4" /> Estilo & Fotos
                  </TabsTrigger>
                </TabsList>

                <div className="p-8 md:p-12 flex-1">
                  <TabsContent value="geral" className="m-0 outline-none space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2">Título do Ativo</Label>
                        <Input 
                          value={editingProduct?.name || ""} 
                          onChange={(e) => handleUpdateField("name", e.target.value)}
                          className="h-16 bg-background/50 border-primary/10 rounded-2xl font-black text-lg px-8 shadow-2xl focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2">Precificação (BRL)</Label>
                        <Input 
                          type="number"
                          value={editingProduct?.price || ""} 
                          onChange={(e) => handleUpdateField("price", parseFloat(e.target.value) || 0)}
                          className="h-16 bg-background/50 border-primary/10 rounded-2xl font-black text-2xl text-primary px-8 shadow-2xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2">Classificação de Catálogo</Label>
                      <div className="flex gap-4">
                        <Select value={editingProduct?.category} onValueChange={(val) => handleUpdateField("category", val)}>
                          <SelectTrigger className="h-16 bg-background/50 border-primary/10 rounded-2xl font-black uppercase text-[11px] tracking-widest px-8 shadow-2xl flex-1">
                            <SelectValue placeholder="CATEGORIA" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-primary/20 rounded-2xl">
                            {categories.map(c => <SelectItem key={c} value={c} className="font-black uppercase text-[10px] py-4">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" className="h-16 w-16 rounded-2xl border-primary/10 bg-primary/5 text-primary shrink-0 hover:bg-primary/20" onClick={() => setQuickAddType("category")}>
                          <PlusCircle className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2">Descritivo de Ficha Técnica</Label>
                      <Textarea 
                        value={editingProduct?.description || ""} 
                        onChange={(e) => handleUpdateField("description", e.target.value)}
                        className="min-h-[180px] bg-background/50 border-primary/10 rounded-[2rem] p-8 text-sm font-medium resize-none leading-relaxed shadow-2xl"
                        placeholder="Detalhes técnicos, materiais, cuidados..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="estoque" className="m-0 outline-none space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Matriz de Grade Ativa</Label>
                        <Button variant="ghost" size="sm" className="h-10 px-6 rounded-xl bg-primary/5 text-primary font-black uppercase text-[9px] tracking-widest border border-primary/5" onClick={() => setQuickAddType("size")}>
                          <PlusCircle className="w-3.5 h-3.5 mr-2" /> Novo Tamanho Global
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        {globalSizes.map((s) => {
                          const isSelected = editingProduct?.sizes?.includes(s);
                          return (
                            <button
                              key={s}
                              onClick={() => handleToggleSize(s)}
                              className={`h-12 px-8 rounded-2xl border transition-all font-black text-[11px] uppercase tracking-widest ${isSelected ? 'bg-primary text-black border-primary shadow-xl shadow-primary/20' : 'bg-muted/10 border-primary/5 text-muted-foreground/60 hover:border-primary/40'}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {editingProduct?.sizes && editingProduct.sizes.length > 0 && (
                      <div className="space-y-6 p-8 rounded-[2.5rem] bg-muted/5 border border-primary/5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2 block mb-6 text-center">Unidades por Tamanho</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {sortSizes(editingProduct.sizes).map((s) => (
                            <div key={s} className="space-y-2 p-5 rounded-2xl bg-background/50 border border-primary/5 shadow-inner group hover:border-primary/20 transition-all">
                              <Label className="text-[9px] font-black text-primary/40 uppercase block text-center tracking-widest">{s}</Label>
                              <Input 
                                type="number" 
                                min={0} 
                                value={editingProduct.stockBySize?.[s] || 0}
                                onChange={(e) => handleStockUpdate(s, parseInt(e.target.value) || 0)}
                                className="h-10 border-none bg-transparent text-center font-black text-lg focus:ring-0 p-0"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="estilo" className="m-0 outline-none space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-6">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-2 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Portfólio de Imagens do Ativo
                        </Label>
                        <div className="grid grid-cols-3 gap-6 md:gap-8">
                            {[0, 1, 2].map((idx) => {
                                const urlField = idx === 0 ? "image" : idx === 1 ? "image2" : "image3";
                                const currentUrl = editingProduct?.[urlField as keyof AdminProduct] as string;
                                const isUploading = uploadingIdx === idx;

                                return (
                                    <div key={idx} className="group relative aspect-square rounded-[2rem] border-2 border-dashed border-primary/5 hover:border-primary/30 transition-all overflow-hidden bg-background/40 shadow-2xl">
                                        {currentUrl ? (
                                            <>
                                                <img src={currentUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                                    <Button variant="destructive" size="icon" className="rounded-full h-12 w-12 shadow-2xl transform scale-75 group-hover:scale-100 transition-transform" onClick={() => handleImageRemove(idx)}>
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <Label htmlFor={`edit-img-${idx}`} className={`flex flex-col items-center justify-center gap-2 h-full cursor-pointer group-hover:bg-primary/5 transition-colors ${isUploading ? 'pointer-events-none' : ''}`}>
                                                {isUploading ? (
                                                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                                                ) : (
                                                    <>
                                                        <Upload className="w-8 h-8 text-primary/20 group-hover:text-primary transition-colors" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover:text-primary">FOTO {idx+1}</span>
                                                    </>
                                                )}
                                                <input id={`edit-img-${idx}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], idx)} />
                                            </Label>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Paleta Colorimétrica</Label>
                        <Button variant="ghost" size="sm" className="h-10 px-6 rounded-xl bg-primary/5 text-primary font-black uppercase text-[9px] tracking-widest border border-primary/5" onClick={() => setQuickAddType("color")}>
                          <PlusCircle className="w-3.5 h-3.5 mr-2" /> Nova Cor Global
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {globalColors.map((c) => {
                          const isSelected = (editingProduct?.colors as Color[])?.some(pc => pc.name === c.name);
                          return (
                            <button
                              key={c.name}
                              onClick={() => handleToggleColor(c)}
                              className={`flex items-center gap-4 px-6 py-5 rounded-2xl border transition-all group ${isSelected ? 'bg-primary text-black border-primary shadow-xl shadow-primary/20' : 'bg-card/40 border-primary/5 text-muted-foreground/60 hover:bg-primary/5'}`}
                            >
                              <div className="w-6 h-6 rounded-full border border-white/10 shadow-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: c.hex }} />
                              <span className="font-black uppercase text-[10px] tracking-widest">{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <div className="p-8 md:p-12 border-t border-primary/10 bg-primary/5 shrink-0 flex gap-4">
               <Button variant="ghost" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={() => setEditingProduct(null)}>
                  Desistir
               </Button>
               <Button className="flex-[2] h-16 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-3xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all" onClick={handleSaveProduct} disabled={isSaving}>
                  {isSaving ? "Sincronizando..." : <><Save className="w-5 h-5 mr-3" /> Confirmar Atualização</>}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QUICK ADD SUB-MODAL */}
      <Dialog open={quickAddType !== null} onOpenChange={(open) => !open && setQuickAddType(null)}>
        <DialogContent className="max-w-md bg-card border-primary/30 rounded-[3rem] p-12 shadow-3xl text-foreground">
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-2xl font-black uppercase text-primary flex items-center justify-center gap-4">
              <PlusCircle className="w-8 h-8" /> {quickAddType === "category" ? "Nova Categoria" : quickAddType === "size" ? "Nova Grade" : "Nova Cor"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Identificador Visual</Label>
              <Input 
                value={quickInput} 
                onChange={(e) => setQuickInput(e.target.value)} 
                className="h-16 bg-background/50 border-primary/10 rounded-2xl text-xl font-black px-8"
                autoFocus
              />
            </div>

            {quickAddType === "color" && (
              <div className="space-y-3 p-8 rounded-[2rem] bg-muted/5 border border-primary/5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2 block mb-4 text-center">Seletor de Hex</Label>
                <div className="flex items-center justify-center gap-8">
                  <Input 
                    type="color" 
                    value={quickHex} 
                    onChange={(e) => setQuickHex(e.target.value)} 
                    className="w-24 h-24 p-1 rounded-3xl bg-background border-primary/20 cursor-pointer shadow-2xl"
                  />
                  <div className="flex flex-col">
                    <span className="text-xl font-black font-mono text-primary">{quickHex.toUpperCase()}</span>
                    <span className="text-[8px] font-black opacity-30 uppercase tracking-widest">Matiz Hex</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-12 gap-4">
            <Button variant="ghost" onClick={() => setQuickAddType(null)} className="flex-1 h-14 rounded-2xl font-black uppercase">Voltar</Button>
            <Button onClick={handleQuickAdd} disabled={!quickInput.trim()} className="flex-[2] h-14 rounded-2xl bg-primary text-black font-black uppercase shadow-xl">Cadastrar Global</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO PERSONALIZADA */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-md bg-card border-2 border-destructive/20 rounded-[3rem] p-12 shadow-3xl text-foreground overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-destructive/20" />
          <AlertDialogHeader className="mb-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4 border border-destructive/20 animate-pulse">
                <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-center text-primary">
              Operação Crítica
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium text-muted-foreground px-4 leading-relaxed">
               Você está prestes a remover este ativo permanentemente do banco de dados. Esta ação <span className="text-destructive font-black underline underline-offset-4 decoration-destructive/30">NÃO PODE SER DESFEITA.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-4 mt-4">
            <AlertDialogCancel asChild>
                <Button variant="ghost" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-xs border border-primary/5" disabled={isDeleting}>Abortar</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
                <Button 
                    className="flex-[2] h-16 bg-destructive text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-95"
                    onClick={handleRemoveProduct}
                    disabled={isDeleting}
                >
                    {isDeleting ? "Excluindo..." : "Sim, Excluir Agora"}
                </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockTab;
