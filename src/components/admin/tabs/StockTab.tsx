import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, ChevronDown, ChevronUp, Package, Layers, X, Box, Save, PlusCircle, Search, ArrowRight, TrendingUp } from "lucide-react";
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
    <div className="space-y-10">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-2xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
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
          {/* Dashboard Superior Rápido (Consistente com Pedidos) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 md:p-10 pb-0">
             {[
               { label: 'Total Itens', val: storedProducts.length, color: 'text-primary' },
               { label: 'Uni. Ativas', val: storedProducts.reduce((acc, p) => acc + (p.stock || 0), 0), color: 'text-blue-500' },
               { label: 'Esq. Crítico', val: storedProducts.filter(p => p.stock <= 5 && p.stock > 0).length, color: 'text-amber-500' },
               { label: 'Esgotados', val: storedProducts.filter(p => p.stock === 0).length, color: 'text-destructive' }
             ].map((stat, i) => (
                <div key={i} className="bg-muted/10 p-5 rounded-3xl border border-primary/5 flex flex-col items-center justify-center group hover:bg-muted/20 transition-all shadow-xl">
                   <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">{stat.label}</span>
                   <span className={`text-2xl font-black ${stat.color}`}>{stat.val}</span>
                </div>
             ))}
          </div>

          <div className="p-10 space-y-10">
            {/* Listagem Mobile */}
            <div className="grid grid-cols-1 gap-6 md:hidden">
              {visibleStock.map((p) => {
                const isExpanded = expandedProductId === p.id;
                const sortedSizes = sortSizes(p.sizes || []);
                return (
                  <div 
                    key={p.id} 
                    className={`p-8 rounded-[2.5rem] bg-muted/5 border border-primary/10 transition-all ${isExpanded ? 'bg-primary/5 border-primary shadow-2xl scale-[1.02]' : 'hover:border-primary/20 shadow-xl'}`}
                    onClick={() => setExpandedProductId(isExpanded ? null : p.id!)}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-background/50 border border-primary/10 overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
                        {p.image ? <img src={p.image} className="w-full h-full object-cover grayscale" /> : <Package className="w-6 h-6 text-primary/20" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-black text-sm uppercase truncate leading-tight">{p.name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] uppercase font-black border-primary/10 text-primary h-5 px-1.5 bg-primary/5">{p.category}</Badge>
                          <div className={`h-1.5 w-1.5 rounded-full ${p.stock > 10 ? 'bg-green-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-destructive'} animate-pulse`} />
                          <span className="font-black text-[10px] text-muted-foreground">{p.stock || 0} UNI</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className={`h-10 w-10 rounded-xl ${isExpanded ? 'bg-primary text-black' : 'bg-primary/5 text-primary'}`}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-8 pt-8 border-t border-primary/5 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-3">
                          {sortedSizes.map((s) => (
                            <div key={s} className="p-4 rounded-[1.5rem] bg-background/50 border border-primary/5 shadow-inner">
                              <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{s}</span>
                              <Input
                                type="number"
                                min={0}
                                className="h-8 text-lg font-black bg-transparent border-none focus-visible:ring-0 p-0 shadow-none text-foreground"
                                value={Number((p.stockBySize || {})[s] || 0)}
                                onChange={(e) => handleStockBySizeChange(p.id!, s, parseInt(e.target.value) || 0)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tabela Desktop Elite */}
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
                            <Button variant="ghost" size="sm" className={`rounded-xl h-10 w-10 p-0 ${isExpanded ? 'bg-primary text-black shadow-xl shadow-primary/20' : 'bg-primary/5 text-primary'}`}>
                              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </Button>
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
                                      
                                      {/* Slot de Adição Premium */}
                                      <div className="flex flex-col gap-2 p-6 rounded-[2.5rem] bg-primary/5 border-2 border-dashed border-primary/10 hover:border-primary/40 hover:bg-primary/10 transition-all justify-center items-center text-center group cursor-pointer min-h-[140px] shadow-xl">
                                        <Select
                                          onValueChange={(val) => {
                                            if (val) handleAddSizeToModel(p.id!, val);
                                          }}
                                        >
                                          <SelectTrigger className="border-none bg-transparent focus:ring-0 shadow-none text-primary hover:text-primary transition-colors flex flex-col items-center gap-2 h-auto p-0">
                                            <PlusCircle className="w-12 h-12 opacity-20 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Acoplar Tamanho</span>
                                          </SelectTrigger>
                                          <SelectContent className="bg-card border-primary/30 rounded-[2rem] p-4 min-w-[240px] shadow-3xl">
                                              <div className="px-4 py-4 border-b border-primary/10 text-[9px] font-black uppercase tracking-[0.3em] text-primary opacity-50 text-center mb-4">Grade Global Sistemática</div>
                                              <div className="max-h-[240px] overflow-y-auto px-1 custom-scrollbar grid grid-cols-2 gap-2">
                                                  {globalSizes.filter(gs => !p.sizes.includes(gs)).map(gs => (
                                                      <SelectItem key={gs} value={gs} className="font-black py-4 rounded-xl hover:bg-primary/20 text-xs px-6 uppercase cursor-pointer border border-transparent hover:border-primary/20">
                                                          {gs}
                                                      </SelectItem>
                                                  ))}
                                              </div>
                                              <div 
                                                  className="p-4 mt-6 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-widest text-center cursor-pointer hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 mx-1"
                                                  onClick={(e) => { e.preventDefault(); setIsNewSizeDialogOpen(true); setTargetProductForNewSize(p.id!); }}
                                              >
                                                  + Criar Novo Tamanho Global
                                              </div>
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
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Assinatura de Sistema</Label>
                                                <div className="h-16 bg-muted/20 border border-primary/5 rounded-2xl flex items-center px-8 font-black text-sm opacity-30 italic">
                                                  UNIQUE_ID: #{p.id}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Descritivo de Ficha Técnica</Label>
                                            <Textarea
                                              className="min-h-[200px] bg-background/50 border-primary/5 rounded-[2rem] p-8 text-sm font-medium resize-none leading-relaxed shadow-2xl focus:ring-primary/20"
                                              value={fieldData.description || ""}
                                              onChange={(e) => setEditFields(prev => ({ ...prev, [p.id!]: { ...fieldData, description: e.target.value } }))}
                                              placeholder="Especifique materiais, tecnologia e diferenciais deste lote..."
                                            />
                                          </div>
                                       </div>

                                       <div className="space-y-6 pt-10 border-t border-primary/5">
                                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Variantes de Cromatismo Ativas</Label>
                                          <div className="flex flex-wrap gap-4">
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
                                                  className={`flex items-center gap-4 px-8 py-4 rounded-2xl border transition-all text-[11px] font-black uppercase tracking-widest ${
                                                    isSelected 
                                                      ? 'bg-primary text-black border-primary shadow-2xl shadow-primary/20 scale-105' 
                                                      : 'bg-muted/10 border-primary/5 text-muted-foreground/60 hover:bg-primary/5'
                                                  }`}
                                                >
                                                  <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? 'border-black/20' : 'border-white/10'}`} style={{ backgroundColor: c.hex }} />
                                                  {c.name}
                                                </button>
                                              );
                                            })}
                                          </div>
                                       </div>

                                       <div className="flex justify-center pt-8">
                                          <Button 
                                            onClick={() => handleUpdateProductFields(p.id!)}
                                            className="h-16 px-16 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.3em] shadow-3xl shadow-primary/30 rounded-2xl animate-pulse-subtle active:scale-95 transition-all text-xs"
                                          >
                                            <Save className="w-5 h-5 mr-4" /> Aplicar Alterações no Modelo
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

            {/* Pagination Premium */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-6 p-8 bg-primary/5 border-t border-primary/10">
                <Button 
                    variant="ghost" 
                    disabled={currentPage <= 1} 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-12 px-8 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary/10 rounded-xl"
                >
                    Anterior
                </Button>
                <div className="flex items-center gap-1.5 p-2 bg-muted/20 rounded-2xl border border-primary/5 shadow-inner">
                    <span className="px-4 text-xs font-black text-primary">{currentPage} <span className="text-muted-foreground opacity-30 mx-1">/</span> {totalPages}</span>
                </div>
                <Button 
                    variant="ghost" 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-12 px-8 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary/10 rounded-xl"
                >
                    Próxima
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Novo Tamanho Global Premium */}
      <Dialog open={isNewSizeDialogOpen} onOpenChange={setIsNewSizeDialogOpen}>
        <DialogContent className="max-w-md bg-card border-primary/30 rounded-[3rem] p-12 border shadow-3xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-primary flex items-center justify-center gap-4">
              <PlusCircle className="w-8 h-8" /> Nova Grade Global
            </DialogTitle>
            <DialogDescription className="text-xs font-black tracking-[0.3em] uppercase opacity-40 pt-3">
              Engenharia de Variantes Sistemática
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Dimensão do SKU (Ex: XL, 44, GGG)</Label>
              <Input
                placeholder="DIGITE O NOME..."
                value={newSizeName}
                onChange={(e) => setNewSizeName(e.target.value.toUpperCase())}
                className="h-16 bg-background/50 border-primary/10 rounded-2xl text-2xl font-black px-8 focus:ring-primary/20 shadow-2xl"
                onKeyDown={(e) => e.key === "Enter" && handleCreateGlobalSize()}
              />
              <p className="text-[9px] text-muted-foreground font-medium italic opacity-40 ml-2">Este protocolo criará o tamanho para uso coletivo no painel.</p>
            </div>
          </div>

          <DialogFooter className="mt-12 gap-4">
            <Button variant="ghost" onClick={() => { setIsNewSizeDialogOpen(false); setNewSizeName(""); }} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Abortar</Button>
            <Button 
                onClick={handleCreateGlobalSize} 
                disabled={creatingSize || !newSizeName.trim()} 
                className="flex-[2] h-14 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
                {creatingSize ? "PROCESSANDO..." : "VALIDAR E CADASTRAR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTab;
