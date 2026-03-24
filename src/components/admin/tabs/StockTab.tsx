import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, ChevronDown, ChevronUp, Package, Layers, X, Box, Save, PlusCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRL, sortSizes, parseSupabaseError } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AdminProduct, Color } from "@/lib/types";

interface StockTabProps {
  tenantId: string;
  storedProducts: AdminProduct[];
  setStoredProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>;
  globalSizes: string[];
  globalColors: Color[];
}

const StockTab = ({
  tenantId,
  storedProducts,
  setStoredProducts,
  globalSizes,
  globalColors,
}: StockTabProps) => {
  const [stockQuery, setStockQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<number, any>>({});
  
  // UI States for New Size
  const [isNewSizeDialogOpen, setIsNewSizeDialogOpen] = useState(false);
  const [newSizeName, setNewSizeName] = useState("");
  const [creatingSize, setCreatingSize] = useState(false);
  const [targetProductForNewSize, setTargetProductForNewSize] = useState<number | null>(null);

  const filteredStock = storedProducts.filter((p) =>
    `${p.name} ${p.category || ""} ${String(p.id ?? "")}`
      .toLowerCase()
      .includes(stockQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredStock.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const visibleStock = filteredStock.slice(startIndex, startIndex + pageSize);

  const handleQueryChange = (val: string) => {
    setStockQuery(val);
    setCurrentPage(1);
  };

  const handleStockBySizeChange = async (id: number, size: string, newStock: number) => {
    try {
      const target = storedProducts.find(p => p.id === id);
      if (!target) return;
      
      const nextStockBySize = { ...(target.stockBySize || {}), [size]: Math.max(0, newStock) };
      const nextTotal = Object.values(nextStockBySize).reduce((acc: number, n: any) => acc + (Number(n) || 0), 0) as number;
      
      const { error } = await supabase
        .from('products')
        .update({ stockBySize: nextStockBySize, stock: nextTotal })
        .eq('id', id)
        .eq('tenant_id', tenantId);
        
      if (error) throw error;
      
      setStoredProducts(prev => prev.map(p => p.id === id ? { ...p, stockBySize: nextStockBySize, stock: nextTotal } : p));
      toast.success("Estoque atualizado", { description: `${target.name} (${size}): ${newStock}un` });
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
      toast.success("Produto atualizado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao atualizar produto", { description: parseSupabaseError(e) });
    }
  };

  const handleAddSizeToModel = async (id: number, newSize: string) => {
    try {
      const target = storedProducts.find(p => p.id === id);
      if (!target) return;
      
      const currentSizes = Array.isArray(target.sizes) ? target.sizes : [];
      if (currentSizes.includes(newSize)) return;
      
      const nextSizes = sortSizes([...currentSizes, newSize]);
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
    <div className="space-y-6">
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 py-6 border-b border-primary/10 px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
                <Box className="w-6 h-6" /> Controle de Estoque
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Gerencie quantidades e variantes do catálogo</p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={stockQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Buscar por nome ou ID..."
                className="h-11 bg-muted/20 border-primary/10 rounded-full pl-11 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Layout de Cartões para Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden p-4">
            {visibleStock.map((p) => {
              const isExpanded = expandedProductId === p.id;
              const sortedSizes = sortSizes(p.sizes || []);
              
              return (
                <div 
                  key={p.id} 
                  className={`p-4 rounded-2xl bg-muted/10 border border-primary/10 transition-all ${isExpanded ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : ''}`}
                >
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedProductId(isExpanded ? null : p.id!)}>
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center border border-primary/10 overflow-hidden shrink-0">
                      {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-xs uppercase truncate leading-tight mb-1">{p.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] uppercase font-black border-primary/20 text-muted-foreground h-4 px-1">{p.category}</Badge>
                        <div className="flex items-center gap-1.5">
                          <div className={`h-1.5 w-1.5 rounded-full ${p.stock > 10 ? 'bg-green-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-destructive'}`} />
                          <span className="font-black text-[10px]">{p.stock || 0} un</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${isExpanded ? 'bg-primary text-black' : ''}`}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-primary/5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-3">
                        {sortedSizes.map((s) => (
                          <div key={s} className="p-3 rounded-xl bg-card/60 border border-primary/10 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black text-primary uppercase">{s}</div>
                            <div className="space-y-1">
                              <span className="text-[8px] font-black text-muted-foreground uppercase opacity-60 block">Qtd</span>
                              <Input
                                type="number"
                                min={0}
                                className="h-7 text-sm font-black bg-transparent border-none focus-visible:ring-0 p-0 shadow-none text-foreground"
                                value={Number((p.stockBySize || {})[s] || 0)}
                                onChange={(e) => handleStockBySizeChange(p.id!, s, parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                         <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-primary uppercase">Total Consolidado</p>
                            <p className="text-xl font-black text-foreground">{p.stock || 0} <span className="text-xs opacity-40">unidades</span></p>
                         </div>
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 px-4 border-primary/20 font-black text-[9px] uppercase tracking-widest"
                            onClick={() => setExpandedProductId(null)}
                         >
                            Fechar
                         </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10 border-b border-primary/5">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pl-8 text-primary/70">Produto</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 text-primary/70">Categoria</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 text-primary/70">Preço</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 text-primary/70">Total</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pr-8 text-right text-primary/70">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleStock.map((p) => {
                  const isExpanded = expandedProductId === p.id;
                  const fieldData = editFields[p.id!] || p;
                  const sortedSizes = sortSizes(p.sizes || []);

                  return (
                    <React.Fragment key={p.id}>
                      <TableRow 
                        className={`cursor-pointer transition-all border-b border-primary/5 ${isExpanded ? 'bg-primary/10 shadow-inner' : 'hover:bg-primary/5'}`} 
                        onClick={() => setExpandedProductId(isExpanded ? null : p.id!)}
                      >
                        <TableCell className="font-bold py-5 pl-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center border border-primary/10 overflow-hidden shrink-0">
                              {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-muted-foreground" />}
                            </div>
                            <span className="text-sm font-black uppercase tracking-tighter truncate max-w-[200px]">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-black border-primary/20 text-muted-foreground">
                            {p.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-black text-primary text-sm">{formatBRL(p.price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${p.stock > 10 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : p.stock > 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                            <span className="font-black text-sm">{p.stock || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="sm" className={`rounded-xl h-10 w-10 p-0 ${isExpanded ? 'bg-primary text-black' : ''}`}>
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent border-none">
                          <TableCell colSpan={5} className="p-0 border-b border-primary/10">
                            <div className="p-8 bg-black/20 animate-in fade-in slide-in-from-top-4 duration-500">
                              <Tabs defaultValue="stock" className="w-full">
                                <TabsList className="bg-muted/40 p-1.5 rounded-2xl border border-primary/10 mb-8 w-fit mx-auto">
                                  <TabsTrigger value="stock" className="rounded-xl px-10 h-11 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[10px]">
                                    <Layers className="w-4 h-4 mr-2" /> Estoque & Variantes
                                  </TabsTrigger>
                                  <TabsTrigger value="edit" className="rounded-xl px-10 h-11 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-widest text-[10px]">
                                    <Pencil className="w-4 h-4 mr-2" /> Dados do Produto
                                  </TabsTrigger>
                                </TabsList>

                                <TabsContent value="stock" className="mt-0 outline-none space-y-8">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                    {sortedSizes.map((s) => (
                                      <div key={s} className="group relative flex flex-col gap-3 p-5 rounded-[2rem] bg-card/60 border border-primary/10 hover:border-primary/40 transition-all hover:translate-y-[-4px] shadow-lg">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-black text-primary uppercase tracking-widest">{s}</span>
                                          <button 
                                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1" 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveSizeFromModel(p.id!, s); }}
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 block">Quantidade</Label>
                                          <Input
                                            type="number"
                                            min={0}
                                            className="h-10 text-xl font-black bg-transparent border-none focus-visible:ring-0 p-0 shadow-none text-foreground"
                                            value={Number((p.stockBySize || {})[s] || 0)}
                                            onChange={(e) => handleStockBySizeChange(p.id!, s, parseInt(e.target.value) || 0)}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    
                                    {/* Slot de Adicionar */}
                                    <div className="flex flex-col gap-2 p-5 rounded-[2rem] bg-primary/5 border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all justify-center items-center text-center group cursor-pointer min-h-[120px]">
                                      <Select
                                        onValueChange={(val) => {
                                          if (val) handleAddSizeToModel(p.id!, val);
                                        }}
                                      >
                                        <SelectTrigger className="border-none bg-transparent focus:ring-0 shadow-none text-primary hover:text-primary transition-colors flex flex-col items-center gap-2 h-auto p-0">
                                          <PlusCircle className="w-10 h-10 opacity-30 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110" />
                                          <span className="text-[9px] font-black uppercase tracking-widest">Incluir Tamanho</span>
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-primary/20 rounded-2xl p-2 min-w-[200px]">
                                            <div className="px-2 py-3 border-b border-primary/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center mb-2">
                                                Tamanhos Globais
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto px-1 custom-scrollbar">
                                                {globalSizes.filter(gs => !p.sizes.includes(gs)).map(gs => (
                                                    <SelectItem key={gs} value={gs} className="font-black py-3 rounded-xl hover:bg-primary/10 text-xs px-4">
                                                        {gs}
                                                    </SelectItem>
                                                ))}
                                            </div>
                                            <div 
                                                className="p-3 mt-3 rounded-xl bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest text-center cursor-pointer hover:bg-primary/30 transition-all border border-primary/30 mx-1 mb-1"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsNewSizeDialogOpen(true);
                                                    setTargetProductForNewSize(p.id!);
                                                }}
                                            >
                                                + Criar Novo Global
                                            </div>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:flex-row items-center gap-8 p-8 rounded-[2.5rem] bg-card/40 border border-primary/10 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                                      <Box className="w-10 h-10" />
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                      <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">Inventário Total Consolidado</h5>
                                      <div className="flex items-center gap-4 justify-center sm:justify-start">
                                         <p className="text-5xl font-black text-foreground">{p.stock || 0}</p>
                                         <span className="px-4 py-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">unidades ativas</span>
                                      </div>
                                    </div>
                                  </div>
                                </TabsContent>

                                <TabsContent value="edit" className="mt-0 outline-none">
                                  <div className="bg-card/40 rounded-[2.5rem] border border-primary/10 p-10 space-y-10 shadow-2xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                      <div className="space-y-6">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-2">Label de Exibição (Nome)</Label>
                                          <Input
                                            className="h-14 bg-background border-primary/10 rounded-2xl focus-visible:ring-primary/20 text-base font-black px-6 shadow-xl"
                                            value={fieldData.name}
                                            onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, name: e.target.value } }))}
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-2">Preço (R$)</Label>
                                            <Input
                                              type="number"
                                              className="h-14 bg-background border-primary/10 rounded-2xl text-xl font-black text-primary px-6 shadow-xl"
                                              value={String(fieldData.price || '')}
                                              onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, price: parseFloat(e.target.value) || 0 } }))}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-2">ID Sistema</Label>
                                            <div className="h-14 bg-muted/40 border border-primary/5 rounded-2xl flex items-center px-6 font-black text-xs opacity-40">
                                              #{p.id}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-2">Descrição / Informações Técnicas</Label>
                                        <Textarea
                                          className="min-h-[160px] bg-background border-primary/10 rounded-2xl focus-visible:ring-primary/20 text-sm font-medium px-6 py-5 resize-none leading-relaxed shadow-xl"
                                          value={fieldData.description || ""}
                                          onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, description: e.target.value } }))}
                                          placeholder="Descreva materiais, tecnologias, origem..."
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-primary/10">
                                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-2">Variantes de Cores Ativas</Label>
                                      <div className="flex flex-wrap gap-3">
                                        {globalColors.map((c) => {
                                          const currentColors = (fieldData.colors || []) as Color[];
                                          const isSelected = currentColors.some(pc => pc.name === c.name);
                                          return (
                                            <button
                                              key={c.name}
                                              onClick={() => {
                                                const nextColors = isSelected
                                                  ? currentColors.filter(pc => pc.name !== c.name)
                                                  : [...currentColors, c];
                                                setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, colors: nextColors } }));
                                              }}
                                              className={`flex items-center gap-3 px-6 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                                                isSelected 
                                                  ? 'bg-primary text-black border-primary shadow-xl shadow-primary/20 transform translate-y-[-2px]' 
                                                  : 'bg-muted/20 hover:bg-primary/5 border-primary/5 text-muted-foreground'
                                              }`}
                                            >
                                              <div className={`w-3.5 h-3.5 rounded-full border ${isSelected ? 'border-primary-foreground/30' : 'border-white/10'}`} style={{ backgroundColor: c.hex }} />
                                              {c.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                      <Button 
                                        onClick={() => handleUpdateProductFields(p.id!)}
                                        className="h-16 px-14 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 rounded-2xl animate-pulse-subtle"
                                      >
                                        <Save className="w-5 h-5 mr-3" /> Salvar Alterações
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-8 bg-muted/20 border-t border-primary/10">
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                <span>Exibir</span>
                <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 w-[80px] bg-background border-primary/10 rounded-xl font-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 50].map((size) => <SelectItem key={size} value={String(size)} className="font-black">{size}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span>por página</span>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="h-10 rounded-xl px-5 border-primary/10 font-black text-[10px] uppercase">Anterior</Button>
                <div className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black">
                    {currentPage} / {totalPages}
                </div>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="h-10 rounded-xl px-5 border-primary/10 font-black text-[10px] uppercase">Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Novo Tamanho Global */}
      <Dialog open={isNewSizeDialogOpen} onOpenChange={setIsNewSizeDialogOpen}>
        <DialogContent className="max-w-md bg-card border-primary/20 rounded-[2.5rem] p-10 border shadow-2xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
              <PlusCircle className="w-7 h-7" /> Novo Tamanho
            </DialogTitle>
            <DialogDescription className="text-xs uppercase font-black tracking-[.2em] text-muted-foreground pt-2">
              Cadastre uma nova variante no sistema global
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-2">Identificador (Ex: XL, 44, GGG)</Label>
              <Input
                placeholder="DIGITE O NOME..."
                value={newSizeName}
                onChange={(e) => setNewSizeName(e.target.value.toUpperCase())}
                className="h-16 bg-background border-primary/20 rounded-2xl text-xl font-black px-6 focus:ring-primary/20"
                onKeyDown={(e) => e.key === "Enter" && handleCreateGlobalSize()}
              />
              <p className="text-[9px] text-muted-foreground font-black uppercase opacity-40 ml-2 tracking-widest">* Este tamanho ficará disponível para todo o catálogo.</p>
            </div>
          </div>

          <DialogFooter className="mt-10 gap-3">
            <Button variant="ghost" onClick={() => { setIsNewSizeDialogOpen(false); setNewSizeName(""); }} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancelar</Button>
            <Button onClick={handleCreateGlobalSize} disabled={creatingSize || !newSizeName.trim()} className="flex-[2] h-14 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest shadow-xl shadow-primary/20">{creatingSize ? "Processando..." : "Criar e Atribuir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTab;
