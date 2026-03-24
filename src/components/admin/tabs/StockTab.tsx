import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRL, sortSizes, rankSize } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controle de Estoque</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            value={stockQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar por nome, categoria ou ID..."
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => setExpandedProductId(isExpanded ? null : p.id)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell>{formatBRL(p.price)}</TableCell>
                      <TableCell>{p.stock || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30 border-b-2 border-primary/10">
                        <TableCell colSpan={5} className="p-0">
                          <div className="p-6 md:p-8 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                              
                              {/* Lado Esquerdo: Gestão de Estoque Fina */}
                              <div className="lg:col-span-5 space-y-6">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Estoque por Tamanho</h4>
                                    <Badge variant="outline" className="text-[10px] border-primary/20 text-primary/70">{sorted.length} Slots</Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {sorted.map((s) => (
                                      <div key={s} className="group relative flex flex-col gap-2 p-3 rounded-2xl bg-background/50 border border-border/40 hover:border-primary/40 transition-all hover:bg-background/80 shadow-sm">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-black text-foreground uppercase">{s}</span>
                                          <button 
                                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveSizeFromModel(p.id, s); }}
                                            title="Remover tamanho"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                        <div className="relative">
                                          <Input
                                            type="number"
                                            min={0}
                                            className="h-10 text-base font-bold bg-transparent border-none focus-visible:ring-0 p-0"
                                            value={Number((p.stockBySize || {})[s] || 0)}
                                            onChange={(e) => handleStockBySizeChange(p.id, s, parseInt(e.target.value) || 0)}
                                          />
                                          <div className="absolute bottom-[-2px] left-0 w-full h-[1px] bg-border group-hover:bg-primary/30" />
                                        </div>
                                      </div>
                                    ))}
                                    
                                    {/* Slot de Adicionar */}
                                    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-primary/5 border border-dashed border-primary/30 hover:bg-primary/10 transition-all">
                                      <span className="text-[10px] font-black text-primary/70 uppercase">Novo Tamanho</span>
                                      <Select
                                        onValueChange={(val) => {
                                          if (val) handleAddSizeToModel(p.id, val);
                                        }}
                                      >
                                        <SelectTrigger className="h-10 border-none bg-transparent focus:ring-0 shadow-none text-sm font-bold p-0">
                                          <SelectValue placeholder="+" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {globalSizes.filter(gs => !sizesLoaded.includes(gs)).map(gs => (
                                            <SelectItem key={gs} value={gs}>{gs}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">Disponibilidade Total</span>
                                    <div className="text-xl font-black text-foreground">{p.stock || 0} unidades</div>
                                  </div>
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${ (p.stock || 0) > 5 ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                                    {p.stock || 0}
                                  </div>
                                </div>
                              </div>

                              {/* Lado Direito: Formulário de Edição Profissional */}
                              <div className="lg:col-span-7 bg-card/40 rounded-[2rem] border border-border/40 p-6 md:p-8 space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
                                
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                    <Pencil className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-lg text-foreground leading-none">Dados do Produto</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Ajuste os campos básicos deste item</p>
                                  </div>
                                </div>

                                <div className="grid gap-6">
                                  <div className="grid gap-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Nome de Exibição</Label>
                                    <Input
                                      className="h-12 bg-background/50 border-border/60 focus-visible:border-primary/50 text-sm font-bold"
                                      value={fieldData?.name ?? p.name}
                                      onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), name: e.target.value } }))}
                                    />
                                  </div>

                                  <div className="grid gap-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Descrição / Detalhes Curvos</Label>
                                    <Textarea
                                      className="text-sm min-h-[100px] bg-background/50 border-border/60 focus-visible:border-primary/50 resize-none"
                                      value={fieldData?.description ?? p.description ?? ""}
                                      onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), description: e.target.value } }))}
                                      placeholder="Ex: Tecido 100% algodão, pronta entrega..."
                                    />
                                  </div>

                                  <div className="grid gap-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Paleta de Cores</Label>
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
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
                                              isSelected 
                                                ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10' 
                                                : 'bg-background/40 border-border/40 text-muted-foreground hover:bg-background/60'
                                            }`}
                                          >
                                            <div className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: c.hex }} />
                                            {c.name}
                                          </button>
                                        );
                                      })}
                                      {globalColors.length === 0 && (
                                        <p className="text-[10px] text-muted-foreground italic">Cadastre cores nas configurações primeiro.</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Preço (R$)</Label>
                                      <Input
                                        type="number"
                                        className="h-12 bg-background/50 border-border/60 text-lg font-black text-primary"
                                        value={fieldData?.price ?? p.price}
                                        onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), price: parseFloat(e.target.value) || 0 } }))}
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Button 
                                        onClick={() => handleUpdateProductFields(p.id)}
                                        className="h-full mt-auto bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                                      >
                                        Salvar Dados
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
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
        {filteredStock.length > 0 && (
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
                  {[15, 30, 50, 100].map((size) => (
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
  );
};

export default StockTab;
