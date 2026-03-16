import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { formatBRL, sortSizes, rankSize } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StockTabProps {
  storedProducts: any[];
  globalSizes: string[];
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
  storedProducts,
  globalSizes,
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
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Ajuste de Estoque por Tamanho */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm">Quantidades por Tamanho</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {sorted.map((s) => (
                                  <div key={s} className="flex flex-col gap-1 border p-2 rounded bg-background">
                                    <Label className="text-[10px] uppercase font-bold opacity-70 flex justify-between">
                                      {s}
                                      <button 
                                        className="text-destructive hover:text-foreground" 
                                        onClick={(e) => { e.stopPropagation(); handleRemoveSizeFromModel(p.id, s); }}
                                        title="Remover tamanho"
                                      >
                                        ×
                                      </button>
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-8 text-sm"
                                      value={Number((p.stockBySize || {})[s] || 0)}
                                      onChange={(e) => handleStockBySizeChange(p.id, s, parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                ))}
                                {/* Adicionar novo tamanho a este modelo */}
                                <div className="flex flex-col gap-1 border p-1 rounded bg-muted/40">
                                  <Label className="text-[10px] uppercase font-bold opacity-70">Add Tam</Label>
                                  <Select
                                    onValueChange={(val) => {
                                      if (val) handleAddSizeToModel(p.id, val);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs bg-background">
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

                            {/* Editar Campos Básicos */}
                            <div className="space-y-3 border-l md:pl-6 border-muted">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Pencil className="h-3 w-3" /> Editar Produto
                              </h4>
                              <div className="grid gap-3">
                                <div className="grid gap-1">
                                  <Label className="text-xs">Nome</Label>
                                  <Input
                                    className="h-8 text-sm"
                                    value={fieldData?.name ?? p.name}
                                    onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), name: e.target.value } }))}
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label className="text-xs">Descrição / Detalhes</Label>
                                  <Textarea
                                    className="text-sm min-h-[60px] resize-y"
                                    value={fieldData?.description ?? p.description ?? ""}
                                    onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), description: e.target.value } }))}
                                    placeholder="Detalhes do produto"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label className="text-xs">Preço</Label>
                                    <Input
                                      type="number"
                                      className="h-8 text-sm"
                                      value={fieldData?.price ?? p.price}
                                      onChange={(e) => setEditFields(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || { ...p }), price: parseFloat(e.target.value) || 0 } }))}
                                    />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label className="text-xs">Estoque Total</Label>
                                    <Input
                                      type="number"
                                      className="h-8 text-sm bg-muted"
                                      disabled
                                      value={p.stock || 0}
                                    />
                                  </div>
                                </div>
                                <Button size="sm" onClick={() => handleUpdateProductFields(p.id)}>
                                  Salvar Alterações
                                </Button>
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
