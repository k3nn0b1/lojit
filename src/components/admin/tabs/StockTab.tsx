import React, { useState, useEffect } from 'react';
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
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Pencil, 
  X, 
  PlusCircle, 
  Box, 
  Save,
  Trash2
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

interface StockTabProps {
  tenantId: string;
  storedProducts: AdminProduct[];
  setStoredProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>;
  globalSizes: string[];
  globalColors: Color[];
  categories: string[];
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

const StockTab = ({ tenantId, storedProducts, setStoredProducts, globalSizes, globalColors, categories }: StockTabProps) => {
  const [stockQuery, setStockQuery] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<number, Partial<AdminProduct>>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estados para nova grade
  const [isNewSizeDialogOpen, setIsNewSizeDialogOpen] = useState(false);
  const [newSizeName, setNewSizeName] = useState("");
  const [targetProductForNewSize, setTargetProductForNewSize] = useState<number | null>(null);
  const [creatingSize, setCreatingSize] = useState(false);

  const filteredStock = storedProducts.filter(p => 
    p.name.toLowerCase().includes(stockQuery.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(stockQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const visibleStock = filteredStock.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleQueryChange = (val: string) => {
    setStockQuery(val);
    setCurrentPage(1);
  };

  const handleStockBySizeChange = async (productId: number, size: string, newVal: number) => {
    try {
      const product = storedProducts.find(p => p.id === productId);
      if (!product) return;

      const updatedStockBySize = {
        ...(product.stockBySize || {}),
        [size]: newVal
      };

      const totalStock = Object.values(updatedStockBySize).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) as number;

      const { error } = await supabase
        .from('products')
        .update({ stockBySize: updatedStockBySize, stock: totalStock })
        .eq('id', productId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setStoredProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, stockBySize: updatedStockBySize, stock: totalStock } : p
      ));
    } catch (e: any) {
      toast.error("Erro ao atualizar estoque", { description: parseSupabaseError(e) });
    }
  };

  const handleUpdateProductFields = async (id: number) => {
    const fields = editFields[id];
    if (!fields) return;

    try {
      const { error } = await supabase
        .from('products')
        .update(fields)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setStoredProducts(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
      setEditFields(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Produto atualizado com maestria");
    } catch (e: any) {
      toast.error("Falha na atualização", { description: parseSupabaseError(e) });
    }
  };

  const handleRemoveProduct = async (id: number) => {
    if (!confirm("Deseja realmente excluir este produto permanentemente?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      setStoredProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Produto removido com sucesso");
    } catch (e: any) {
      toast.error("Erro ao remover produto");
    }
  };

  const handleAddSizeToModel = async (id: number, newSize: string) => {
    try {
      const target = storedProducts.find(p => p.id === id);
      if (!target) return;
      if ((target.sizes || []).includes(newSize)) return;

      const nextSizes = [...(target.sizes || []), newSize];
      const nextStockBySize = { ...(target.stockBySize || {}), [newSize]: 0 };

      const { error } = await supabase
        .from('products')
        .update({ sizes: nextSizes, stockBySize: nextStockBySize })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setStoredProducts(prev => prev.map(p => p.id === id ? { ...p, sizes: nextSizes, stockBySize: nextStockBySize } : p));
      toast.success(`Tamanho ${newSize} adicionado ao modelo`);
    } catch (e: any) {
      toast.error("Erro ao adicionar tamanho", { description: parseSupabaseError(e) });
    }
  };

  const handleRemoveSizeFromModel = async (id: number, size: string) => {
    if (!confirm(`Deseja remover o tamanho ${size} deste produto?`)) return;
    try {
      const target = storedProducts.find(p => p.id === id);
      if (!target) return;
      
      const nextSizes = (target.sizes || []).filter(s => s !== size);
      const nextStockBySize = { ...target.stockBySize };
      delete nextStockBySize[size];
      const nextTotal = Object.values(nextStockBySize).reduce((acc: number, n: any) => acc + (Number(n) || 0), 0) as number;
      
      const { error } = await supabase
        .from('products')
        .update({ sizes: nextSizes, stockBySize: nextStockBySize, stock: nextTotal })
        .eq('id', id)
        .eq('tenant_id', tenantId);
        
      if (error) throw error;
      
      setStoredProducts(prev => prev.map(p => p.id === id ? { ...p, sizes: nextSizes, stockBySize: nextStockBySize, stock: nextTotal } : p));
      toast.success(`Tamanho ${size} removido`);
    } catch (e: any) {
      toast.error("Erro ao remover tamanho");
    }
  };

  const handleCreateGlobalSize = async () => {
    if (!newSizeName.trim()) return;
    setCreatingSize(true);
    try {
      const { error } = await supabase.from('sizes').insert({ name: newSizeName.trim().toUpperCase(), tenant_id: tenantId });
      if (error) throw error;
      
      if (targetProductForNewSize) {
        await handleAddSizeToModel(targetProductForNewSize, newSizeName.trim().toUpperCase());
      }
      
      toast.success("Tamanho criado globalmente");
      setIsNewSizeDialogOpen(false);
      setNewSizeName("");
    } catch (e: any) {
      toast.error("Erro ao criar tamanho");
    } finally {
      setCreatingSize(false);
    }
  };

  return (
    <div className="space-y-10">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 shadow-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-primary/5 py-6 md:py-8 border-b border-primary/10 px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <Box className="w-8 h-8" /> Gestão de Estoque
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Operação logística e controle de SKUS ativos</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60" />
                   <Input 
                     placeholder="PESQUISAR POR SKU OU NOME..." 
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
            <div className="md:hidden space-y-4">
              {visibleStock.map((p) => (
                <div 
                  key={p.id} 
                  className={`bg-card/40 border border-primary/5 rounded-[2rem] p-5 space-y-4 transition-all ${expandedProductId === p.id ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}
                  onClick={() => setExpandedProductId(p.id!)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 max-w-[70%]">
                      <div className="w-12 h-12 rounded-2xl bg-muted/20 border border-primary/10 overflow-hidden shrink-0">
                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-3.5 opacity-20" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black uppercase truncate leading-tight">{p.name}</h4>
                        <p className="text-[10px] font-black text-primary">{formatBRL(p.price)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${p.stock > 10 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                      {p.stock} UN
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <Dialog open={!!expandedProductId} onOpenChange={(open) => !open && setExpandedProductId(null)}>
              <DialogContent className="md:hidden max-w-[95vw] w-full bg-card border-primary/30 rounded-[2.5rem] p-6 text-foreground shadow-3xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10" />
                <DialogHeader className="mb-4 shrink-0">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary truncate max-w-[80%]">
                    {storedProducts.find(p => p.id === expandedProductId)?.name || "Gestão de Produto"}
                  </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {expandedProductId && (() => {
                    const p = storedProducts.find(prod => prod.id === expandedProductId)!;
                    const fieldData = editFields[p.id!] || p;
                    const sortedSizes = sortSizes(p.sizes || []);
                    return (
                      <div className="space-y-6">
                        <Tabs defaultValue="stock" className="w-full">
                          <TabsList className="bg-muted/40 p-1.5 rounded-xl border border-primary/10 mb-6 w-full flex">
                            <TabsTrigger value="stock" className="flex-1 rounded-lg h-10 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px]">
                              Grade
                            </TabsTrigger>
                            <TabsTrigger value="edit" className="flex-1 rounded-lg h-10 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[9px]">
                              Ficha
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="stock" className="mt-0 outline-none space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                              {sortedSizes.map((s) => (
                                <div key={s} className="group relative flex flex-col gap-2 p-4 rounded-2xl bg-card/60 border border-primary/5 shadow-xl">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">{s}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveSizeFromModel(p.id!, s); }} className="text-muted-foreground/40 hover:text-destructive">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-8 text-xl font-black bg-transparent border-none focus-visible:ring-0 p-0 shadow-none text-foreground"
                                    value={Number((p.stockBySize || {})[s] || 0)}
                                    onChange={(e) => handleStockBySizeChange(p.id!, s, parseInt(e.target.value) || 0)}
                                  />
                                </div>
                              ))}
                              <div className="flex flex-col gap-1 p-4 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/10 flex items-center justify-center text-center">
                                 <Select onValueChange={(val) => val && handleAddSizeToModel(p.id!, val)}>
                                    <SelectTrigger className="border-none bg-transparent focus:ring-0 shadow-none text-primary flex flex-col items-center gap-1 h-auto p-0">
                                      <PlusCircle className="w-8 h-8 opacity-40 shrink-0" />
                                      <span className="text-[8px] font-black uppercase tracking-widest">Add Grade</span>
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-primary/30 rounded-2xl min-w-[200px]">
                                       {globalSizes.filter(gs => !p.sizes.includes(gs)).map(gs => (
                                          <SelectItem key={gs} value={gs} className="font-black py-3 rounded-lg text-xs uppercase px-4 cursor-pointer">{gs}</SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="edit" className="mt-0 outline-none space-y-4">
                             <div className="space-y-2">
                               <Label className="text-[8px] font-black uppercase tracking-widest text-primary/60 ml-1">Nome do Produto</Label>
                               <Input
                                 className="h-12 bg-background/50 border-primary/5 rounded-xl font-black text-xs px-4 shadow-xl focus:ring-primary/20"
                                 value={fieldData.name}
                                 onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, name: e.target.value } }))}
                               />
                             </div>
                             <div className="space-y-2">
                               <Label className="text-[8px] font-black uppercase tracking-widest text-primary/60 ml-1">Preço (BRL)</Label>
                               <Input
                                 type="number"
                                 className="h-12 bg-background/50 border-primary/5 rounded-xl text-lg font-black text-primary px-4 shadow-xl focus:ring-primary/20"
                                 value={String(fieldData.price || '')}
                                 onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, price: parseFloat(e.target.value) || 0 } }))}
                               />
                             </div>
                             <div className="space-y-2">
                               <Label className="text-[8px] font-black uppercase tracking-widest text-primary/60 ml-1">Categoria</Label>
                               <Select value={fieldData.category} onValueChange={(val) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, category: val } }))}>
                                 <SelectTrigger className="h-12 bg-background/50 border-primary/5 rounded-xl font-black text-xs px-4 shadow-xl">
                                   <SelectValue placeholder="Selecione..." />
                                 </SelectTrigger>
                                 <SelectContent className="bg-card border-primary/20 rounded-xl">
                                   {categories.map(c => <SelectItem key={c} value={c} className="text-[10px] font-black uppercase">{c}</SelectItem>)}
                                 </SelectContent>
                               </Select>
                             </div>
                             <div className="space-y-2">
                               <Label className="text-[8px] font-black uppercase tracking-widest text-primary/60 ml-1">Descrição</Label>
                               <Textarea
                                 className="min-h-[100px] bg-background/50 border-primary/5 rounded-xl p-4 text-xs font-medium resize-none leading-relaxed shadow-xl focus:ring-primary/20"
                                 value={fieldData.description || ""}
                                 onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, description: e.target.value } }))}
                               />
                             </div>
                             <Button onClick={() => handleUpdateProductFields(p.id!)} className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl mt-2">
                                Salvar Alterações
                             </Button>
                          </TabsContent>
                        </Tabs>
                        
                        <Button 
                          variant="ghost" 
                          className="w-full h-12 bg-destructive/5 text-destructive rounded-xl text-[10px] font-black uppercase tracking-widest border border-destructive/10"
                          onClick={() => handleRemoveProduct(p.id!)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir Produto Permanentemente
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>

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
                  {visibleStock.map((p) => {
                    const isExpanded = expandedProductId === p.id;
                    const fieldData = editFields[p.id!] || p;
                    const sortedSizes = sortSizes(p.sizes || []);

                    return (
                      <React.Fragment key={p.id}>
                        <TableRow 
                          className={`cursor-pointer transition-all border-none ${isExpanded ? 'bg-primary/10 shadow-inner' : 'hover:bg-primary/5 group'}`} 
                          onClick={() => setExpandedProductId(isExpanded ? null : p.id!)}
                        >
                          <TableCell className="px-10 py-6">
                            <div className="flex items-center gap-6">
                              <div className="w-14 h-14 rounded-[1.2rem] border border-primary/10 flex items-center justify-center bg-background/50 overflow-hidden shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                                {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-primary/20" />}
                              </div>
                              <span className="text-sm font-black uppercase tracking-tight truncate max-w-[200px]">{p.name}</span>
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
                            <div className="flex justify-end gap-3">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`rounded-xl h-10 w-10 p-0 ${isExpanded ? 'bg-primary text-black shadow-xl shadow-primary/20' : 'bg-primary/5 text-primary'}`}
                              >
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="rounded-xl h-10 w-10 p-0 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                onClick={(e) => { e.stopPropagation(); handleRemoveProduct(p.id!); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="hover:bg-transparent border-none">
                            <TableCell colSpan={5} className="p-0 border-none">
                              <div className="p-10 bg-black/30 animate-in fade-in slide-in-from-top-6 duration-500">
                                <Tabs defaultValue="stock" className="w-full">
                                  <TabsList className="bg-muted/40 p-2 rounded-2xl border border-primary/10 mb-10 w-fit mx-auto shadow-2xl">
                                    <TabsTrigger value="stock" className="rounded-xl px-12 h-12 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[10px]">
                                      <Layers className="w-4 h-4 mr-3" /> Gestão de Variantes
                                    </TabsTrigger>
                                    <TabsTrigger value="edit" className="rounded-xl px-12 h-12 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[10px]">
                                      <Pencil className="w-4 h-4 mr-3" /> Ficha Técnica
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="stock" className="mt-0 outline-none space-y-10">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                      {sortedSizes.map((s) => (
                                        <div key={s} className="group relative flex flex-col gap-4 p-6 rounded-[2.5rem] bg-card/60 border border-primary/5 hover:border-primary/40 transition-all hover:translate-y-[-6px] shadow-2xl">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{s}</span>
                                            <button 
                                              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1" 
                                              onClick={(e) => { e.stopPropagation(); handleRemoveSizeFromModel(p.id!, s); }}
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-[8px] font-black text-muted-foreground uppercase opacity-40 block tracking-widest">Unidades</Label>
                                            <Input
                                              type="number"
                                              min={0}
                                              className="h-10 text-2xl font-black bg-transparent border-none focus-visible:ring-0 p-0 shadow-none text-foreground"
                                              value={Number((p.stockBySize || {})[s] || 0)}
                                              onChange={(e) => handleStockBySizeChange(p.id!, s, parseInt(e.target.value) || 0)}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                      
                                      <div className="flex flex-col gap-3 p-6 rounded-[2.5rem] bg-primary/5 border-2 border-dashed border-primary/10 flex items-center justify-center text-center group hover:bg-primary/10 transition-all cursor-pointer">
                                         <Select onValueChange={(val) => val && handleAddSizeToModel(p.id!, val)}>
                                            <SelectTrigger className="border-none bg-transparent focus:ring-0 shadow-none text-primary flex flex-col items-center gap-2 h-auto p-0">
                                              <PlusCircle className="w-10 h-10 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                                              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Acoplar Grade</span>
                                              <ChevronDown className="w-4 h-4 opacity-20" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-primary/30 rounded-3xl min-w-[240px] shadow-3xl">
                                               {globalSizes.filter(gs => !p.sizes.includes(gs)).map(gs => (
                                                  <SelectItem key={gs} value={gs} className="font-black py-4 rounded-2xl text-xs uppercase px-6 cursor-pointer focus:bg-primary/10 transition-colors">{gs}</SelectItem>
                                               ))}
                                            </SelectContent>
                                         </Select>
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="edit" className="mt-0 outline-none">
                                    <div className="bg-card/40 rounded-[3rem] border border-primary/10 p-12 space-y-12 shadow-3xl relative overflow-hidden">
                                       <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10" />
                                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                          <div className="space-y-8">
                                            <div className="space-y-3">
                                              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Identificação Principal (SKU Name)</Label>
                                              <Input
                                                className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black text-lg px-8 shadow-2xl focus:ring-primary/20"
                                                value={fieldData.name}
                                                onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, name: e.target.value } }))}
                                              />
                                            </div>
                                            <div className="grid grid-cols-2 gap-8">
                                              <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Precificação (BRL)</Label>
                                                <Input
                                                  type="number"
                                                  className="h-16 bg-background/50 border-primary/5 rounded-2xl text-2xl font-black text-primary px-8 shadow-2xl focus:ring-primary/20"
                                                  value={String(fieldData.price || '')}
                                                  onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, price: parseFloat(e.target.value) || 0 } }))}
                                                />
                                              </div>
                                              <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Classificação</Label>
                                                <Select value={fieldData.category} onValueChange={(val) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, category: val } }))}>
                                                  <SelectTrigger className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl">
                                                     <SelectValue placeholder="CATEGORIA" />
                                                  </SelectTrigger>
                                                  <SelectContent className="bg-card border-primary/20 rounded-xl">
                                                     {categories.map(c => <SelectItem key={c} value={c} className="text-[10px] font-black uppercase">{c}</SelectItem>)}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Descritivo de Ficha Técnica</Label>
                                            <Textarea
                                              className="min-h-[200px] bg-background/50 border-primary/5 rounded-[2rem] p-8 text-sm font-medium resize-none leading-relaxed shadow-2xl focus:ring-primary/20"
                                              value={fieldData.description || ""}
                                              onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, description: e.target.value } }))}
                                            />
                                          </div>
                                       </div>

                                       <div className="space-y-6 pt-10 border-t border-primary/5">
                                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Cromatismo Ativos</Label>
                                          <div className="flex flex-wrap gap-4">
                                            {globalColors.map((c) => {
                                              const currentColors = (fieldData.colors || []) as Color[];
                                              const isSelected = currentColors.some(pc => pc.name === c.name);
                                              return (
                                                <button
                                                  key={c.name}
                                                  onClick={() => {
                                                    const nextColors = isSelected ? currentColors.filter(pc => pc.name !== c.name) : [...currentColors, c];
                                                    setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, colors: nextColors } }));
                                                  }}
                                                  className={`flex items-center gap-4 px-8 py-4 rounded-2xl border transition-all text-[11px] font-black uppercase ${isSelected ? 'bg-primary text-black border-primary shadow-2xl' : 'bg-muted/10 border-primary/5 text-muted-foreground/60'}`}
                                                >
                                                  <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
                                                  {c.name}
                                                </button>
                                              );
                                            })}
                                          </div>
                                       </div>

                                       <div className="flex justify-center pt-8">
                                          <Button onClick={() => handleUpdateProductFields(p.id!)} className="h-16 px-16 bg-primary text-black font-black uppercase tracking-[0.1em] rounded-2xl shadow-3xl">
                                            <Save className="w-5 h-5 mr-4" /> Atualizar Ficha Técnica
                                          </Button>
                                       </div>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 p-4 bg-primary/5 border-t border-primary/10 rounded-b-[2.5rem]">
                <Button variant="ghost" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="h-12 px-8 font-black text-[10px] uppercase rounded-xl">Anterior</Button>
                <div className="bg-muted/20 rounded-2xl border border-primary/5 px-4 h-10 flex items-center"><span className="text-xs font-black text-primary">{currentPage} / {totalPages}</span></div>
                <Button variant="ghost" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="h-12 px-8 font-black text-[10px] uppercase rounded-xl">Próxima</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isNewSizeDialogOpen} onOpenChange={setIsNewSizeDialogOpen}>
        <DialogContent className="max-w-md bg-card border-primary/30 rounded-[3rem] p-12 shadow-3xl">
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-3xl font-black uppercase text-primary flex items-center justify-center gap-4"><PlusCircle className="w-8 h-8" /> Grade Global</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Nome da Grade</Label>
            <Input value={newSizeName} onChange={(e) => setNewSizeName(e.target.value.toUpperCase())} className="h-16 bg-background/50 border-primary/10 rounded-2xl text-2xl font-black px-8" />
          </div>
          <DialogFooter className="mt-12 gap-4">
            <Button variant="ghost" onClick={() => setIsNewSizeDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black uppercase">Cancelar</Button>
            <Button onClick={handleCreateGlobalSize} disabled={creatingSize || !newSizeName.trim()} className="flex-[2] h-14 rounded-2xl bg-primary text-black font-black uppercase shadow-xl">{creatingSize ? "..." : "SALVAR"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTab;
