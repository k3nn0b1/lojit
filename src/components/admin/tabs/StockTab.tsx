import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, ChevronDown, ChevronUp, Package, Tag, Layers, Plus, X, Box, Save, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRL, sortSizes } from "@/lib/utils";
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

interface StockTabProps {
  tenantId?: string | null;
  storedProducts: any[];
  globalSizes: string[];
  globalColors?: any[];
  expandedProductId: number | null;
  setExpandedProductId: React.Dispatch<React.SetStateAction<number | null>>;
  handleStockBySizeChange: (id: number, size: string, newStock: number) => void;
  editFields: Record<number, any>;
  setEditFields: React.Dispatch<React.SetStateAction<Record<number, any>>>;
  handleUpdateProductFields: (id: number, manualFields?: any) => void;
  handleAddSizeToModel: (id: number, newSize: string) => void;
  handleRemoveSizeFromModel: (id: number, size: string) => void;
  stockQuery: string;
  setStockQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const StockTab = ({
  tenantId,
  storedProducts,
  globalSizes,
  globalColors = [],
  expandedProductId,
  setExpandedProductId,
  handleStockBySizeChange,
  editFields,
  setEditFields,
  handleUpdateProductFields,
  handleAddSizeToModel,
  handleRemoveSizeFromModel,
  stockQuery,
  setStockQuery,
  currentPage,
  setCurrentPage,
}: StockTabProps) => {
  const [pageSize, setPageSize] = useState(15);
  const [isNewSizeDialogOpen, setIsNewSizeDialogOpen] = useState(false);
  const [newSizeName, setNewSizeName] = useState("");
  const [creatingSize, setCreatingSize] = useState(false);
  const [targetProductForNewSize, setTargetProductForNewSize] = useState<number | null>(null);

  const filteredStock = storedProducts.filter((p) =>
    `${p.name} ${p.category || ""} ${String(p.id ?? "")}`
      .toLowerCase()
      .includes(stockQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStock.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleStock = filteredStock.slice(startIndex, startIndex + pageSize);

  const handleQueryChange = (val: string) => {
    setStockQuery(val);
    setCurrentPage(1);
  };

  const handleCreateGlobalSize = async () => {
    if (!newSizeName.trim() || !tenantId) return;
    
    setCreatingSize(true);
    try {
      // 1. Inserir no banco de tamanhos globais
      const { error: insertError } = await supabase
        .from('sizes')
        .insert({ name: newSizeName.trim().toUpperCase(), tenant_id: tenantId });
      
      if (insertError) throw insertError;

      // 2. Se houver um produto alvo, já adiciona a ele
      if (targetProductForNewSize) {
        await handleAddSizeToModel(targetProductForNewSize, newSizeName.trim().toUpperCase());
      }

      toast.success("Tamanho criado com sucesso!");
      setIsNewSizeDialogOpen(false);
      setNewSizeName("");
    } catch (e: any) {
      toast.error("Erro ao criar tamanho", { description: e.message });
    } finally {
      setCreatingSize(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-card/10 backdrop-blur-md overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
                <Box className="w-6 h-6" /> Controle de Estoque
              </CardTitle>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Gerencie as quantidades e variantes de cada item</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative group">
            <Input
              value={stockQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar por nome, categoria ou ID..."
              className="h-12 bg-muted/20 border-border/40 hover:border-primary/40 focus:border-primary/60 transition-all rounded-xl pl-12"
            />
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/20 backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6 text-primary">Produto</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-primary">Categoria</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-primary">Preço</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-primary">Estoque</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pr-6 text-right text-primary">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleStock.map((p) => {
                  const isExpanded = expandedProductId === p.id;
                  const fieldData = editFields[p.id];
                  const sizesLoaded = Array.isArray(p.sizes) ? p.sizes : [];
                  const sorted = sortSizes(sizesLoaded);

                  return (
                    <React.Fragment key={p.id}>
                      <TableRow 
                        className={`cursor-pointer transition-all ${isExpanded ? 'bg-primary/5 hover:bg-primary/5' : 'hover:bg-muted/40'}`} 
                        onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                      >
                        <TableCell className="font-bold py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border/30 overflow-hidden">
                              {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <span>{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-black border-primary/20 text-primary/80">
                            {p.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-foreground/80">{formatBRL(p.price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${p.stock > 10 ? 'bg-green-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-destructive'}`} />
                            <span className="font-bold">{p.stock || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="sm" className={isExpanded ? 'text-primary' : ''}>
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent border-none">
                          <TableCell colSpan={5} className="p-0">
                            <div className="p-8 border-t border-primary/10 bg-gradient-to-b from-primary/[0.02] to-transparent animate-in fade-in slide-in-from-top-2 duration-300">
                              <Tabs defaultValue="stock" className="w-full">
                                <TabsList className="bg-muted/30 p-1 rounded-2xl border border-border/40 mb-8 border-primary/20">
                                  <TabsTrigger value="stock" className="rounded-xl px-8 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px]">
                                    <Layers className="w-4 h-4 mr-2" /> Estoque & Variantes
                                  </TabsTrigger>
                                  <TabsTrigger value="edit" className="rounded-xl px-8 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px]">
                                    <Pencil className="w-4 h-4 mr-2" /> Dados do Produto
                                  </TabsTrigger>
                                </TabsList>

                                <TabsContent value="stock" className="mt-0 outline-none space-y-8">
                                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {sorted.map((s) => (
                                      <div key={s} className="group relative flex flex-col gap-2 p-4 rounded-3xl bg-card border border-border/50 hover:border-primary/40 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-black text-primary uppercase tracking-widest">{s}</span>
                                          <button 
                                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1" 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveSizeFromModel(p.id, s); }}
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                        <div className="mt-1">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 mb-1 block">Qtd em Loja</Label>
                                          <Input
                                            type="number"
                                            min={0}
                                            className="h-10 text-xl font-black bg-transparent border-none focus-visible:ring-0 p-0"
                                            value={Number((p.stockBySize || {})[s] || 0)}
                                            onChange={(e) => handleStockBySizeChange(p.id, s, parseInt(e.target.value) || 0)}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    
                                    {/* Slot de Adicionar */}
                                    <div className="flex flex-col gap-2 p-4 rounded-3xl bg-primary/5 border border-dashed border-primary/30 hover:bg-primary/10 transition-all justify-center items-center text-center group cursor-pointer min-h-[110px]">
                                      <Select
                                        onValueChange={(val) => {
                                          if (val) handleAddSizeToModel(p.id, val);
                                        }}
                                      >
                                        <SelectTrigger className="border-none bg-transparent focus:ring-0 shadow-none text-primary hover:text-primary transition-colors flex flex-col items-center gap-1 h-auto p-0">
                                          <PlusCircle className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                                          <span className="text-[10px] font-black uppercase tracking-tighter">Novo<br/>Tamanho</span>
                                        </SelectTrigger>
                                        <SelectContent className="bg-card w-[200px]">
                                          <div className="p-2 border-b border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                                            Escolha uma Opção
                                          </div>
                                          {globalSizes.filter(gs => !sizesLoaded.includes(gs)).map(gs => (
                                            <SelectItem key={gs} value={gs} className="font-bold py-2">{gs}</SelectItem>
                                          ))}
                                          <div 
                                            className="p-3 mt-2 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest text-center cursor-pointer hover:bg-primary/20 transition-all border border-primary/20 mx-1 mb-1"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              setIsNewSizeDialogOpen(true);
                                              setTargetProductForNewSize(p.id);
                                            }}
                                          >
                                            + Criar Novo Tamanho
                                          </div>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-card/60 border border-border/40 shadow-inner">
                                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                                      <Box className="w-8 h-8" />
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Disponibilidade Consolidada</h5>
                                      <p className="text-3xl font-black text-primary">{p.stock || 0} <span className="text-sm font-bold text-muted-foreground normal-case">unidades em estoque</span></p>
                                    </div>
                                  </div>
                                </TabsContent>

                                <TabsContent value="edit" className="mt-0 outline-none">
                                  <div className="bg-card/40 rounded-[2.5rem] border border-border/40 p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                      <div className="space-y-6">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1">Label de Exibição (Nome)</Label>
                                          <Input
                                            className="h-14 bg-background border-border/60 rounded-2xl focus-visible:border-primary/50 text-base font-bold pl-5 shadow-sm"
                                            value={fieldData?.name ?? p.name}
                                            onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), name: e.target.value } }))}
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1">Preço de Venda (R$)</Label>
                                            <Input
                                              type="number"
                                              className="h-14 bg-background border-border/60 rounded-2xl text-xl font-black text-primary pl-5"
                                              value={fieldData?.price ?? p.price}
                                              onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), price: parseFloat(e.target.value) || 0 } }))}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1">Referência (ID)</Label>
                                            <div className="h-14 bg-muted/30 border border-border/20 rounded-2xl flex items-center pl-5 font-mono text-xs opacity-50">
                                              #{p.id}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-6">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1">Descrição Detalhada</Label>
                                          <Textarea
                                            className="min-h-[148px] bg-background border-border/60 rounded-2xl focus-visible:border-primary/50 text-sm font-medium p-5 resize-none leading-relaxed"
                                            value={fieldData?.description ?? p.description ?? ""}
                                            onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), description: e.target.value } }))}
                                            placeholder="Descreva os materiais, tecnologias e destaques..."
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-border/40">
                                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1">Variantes de Cores Disponíveis</Label>
                                      <div className="flex flex-wrap gap-2">
                                        {globalColors.map((c) => {
                                          const currentColors = (editFields[p.id]?.colors || p.colors || []) as any[];
                                          const isSelected = currentColors.some(pc => pc.name === c.name);
                                          return (
                                            <button
                                              key={c.name}
                                              onClick={() => {
                                                const nextColors = isSelected
                                                  ? currentColors.filter(pc => pc.name !== c.name)
                                                  : [...currentColors, { name: c.name, hex: c.hex }];
                                                setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), colors: nextColors } }));
                                              }}
                                              className={`flex items-center gap-3 px-5 py-2.5 rounded-full border text-[11px] font-black uppercase tracking-widest transition-all ${
                                                isSelected 
                                                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_8px_20px_rgba(var(--primary),0.3)]' 
                                                  : 'bg-background hover:bg-muted border-border/60 text-muted-foreground'
                                              }`}
                                            >
                                              <div 
                                                className={`w-3 h-3 rounded-full border ${isSelected ? 'border-primary-foreground/30' : 'border-white/20'}`} 
                                                style={{ backgroundColor: c.hex }} 
                                              />
                                              {c.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                      <Button 
                                        onClick={() => handleUpdateProductFields(p.id)}
                                        className="h-14 px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl"
                                      >
                                        <Save className="w-5 h-5 mr-3" /> Aplicar Alterações
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredStock.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-border/40 shadow-sm">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            <Layers className="w-4 h-4" />
            <span>Exibir {pageSize} por página</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[75px] bg-background border-border/60 rounded-xl font-bold">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)} className="font-bold">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="h-10 rounded-xl px-4 border-border/60 hover:text-primary transition-all font-bold"
            >
              Anterior
            </Button>

            <div className="flex items-center gap-1.5">
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
                for (let n = adjustedStart; n <= end; n++) pages.push(n);
                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push("ellipsis");
                  pages.push(totalPages);
                }

                return pages.map((item, idx) =>
                  item === "ellipsis" ? (
                    <span key={`el-${idx}`} className="px-2 text-muted-foreground font-bold">...</span>
                  ) : (
                    <Button
                      key={item}
                      variant={currentPage === item ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(item as number)}
                      className={`h-10 w-10 p-0 rounded-xl font-black text-xs transition-all ${
                        currentPage === item
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "border-border/60 hover:border-primary/50"
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
              className="h-10 rounded-xl px-4 border-border/60 hover:text-primary transition-all font-bold"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal para criar novo tamanho global */}
      <Dialog open={isNewSizeDialogOpen} onOpenChange={setIsNewSizeDialogOpen}>
        <DialogContent className="max-w-md bg-card border-primary/20 rounded-[2rem] p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
              <PlusCircle className="w-6 h-6" /> Novo Tamanho
            </DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground pt-1">
              Cadastre um novo tamanho global no sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1">Nome do Tamanho</Label>
              <Input
                placeholder="Ex: GG, 42, 128GB, etc..."
                value={newSizeName}
                onChange={(e) => setNewSizeName(e.target.value)}
                className="h-14 bg-background border-border/60 rounded-2xl text-lg font-black uppercase pl-5"
                onKeyDown={(e) => e.key === "Enter" && handleCreateGlobalSize()}
              />
              <p className="text-[9px] text-muted-foreground italic ml-1">* Este tamanho ficará disponível para todos os produtos.</p>
            </div>
          </div>

          <DialogFooter className="mt-8 flex gap-3 flex-col sm:flex-row">
            <Button 
              variant="ghost" 
              onClick={() => { setIsNewSizeDialogOpen(false); setNewSizeName(""); }}
              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateGlobalSize}
              disabled={creatingSize || !newSizeName.trim()}
              className="flex-[2] h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              {creatingSize ? "Criando..." : "Criar e Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTab;
