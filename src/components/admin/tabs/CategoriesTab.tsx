import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, Check, X } from "lucide-react";
import { parseSupabaseError } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoriesTabProps {
  tenantId?: string | null;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  IS_SUPABASE_READY: boolean;
}

const CategoriesTab = ({ tenantId, categories, setCategories, IS_SUPABASE_READY }: CategoriesTabProps) => {
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryEditValue, setCategoryEditValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.ceil(categories.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleCategories = categories.slice(startIndex, startIndex + pageSize);

  const handleAddCategory = async () => {
    const val = newCategory.trim();
    if (!val) return;
    if (categories.includes(val)) {
      toast.error("Categoria já existe");
      return;
    }
    if (!IS_SUPABASE_READY || !tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("categories").insert({ name: val, tenant_id: tenantId });
      if (error) throw error;
      
      // Update state manually for instant feedback
      setCategories(prev => [...prev, val].sort());
      
      toast.success("Categoria adicionada");
      setNewCategory("");
    } catch (e: any) {
      toast.error("Erro ao adicionar", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategory = async (oldName: string) => {
    const val = categoryEditValue.trim();
    if (!val || val === oldName) {
      setEditingCategory(null);
      return;
    }
    if (categories.includes(val)) {
      toast.error("Categoria já existe");
      return;
    }
    if (!IS_SUPABASE_READY || !tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: val })
        .eq("name", oldName)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      // Update state manually for instant feedback
      setCategories(prev => prev.map(c => c === oldName ? val : c).sort());

      toast.success("Categoria atualizada");
      setEditingCategory(null);
    } catch (e: any) {
      toast.error("Erro ao atualizar", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCategory = async (name: string) => {
    if (!IS_SUPABASE_READY || !tenantId) return;
    if (!confirm(`Deseja remover a categoria "${name}"?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("name", name)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      // Update state manually for instant feedback
      setCategories(prev => prev.filter(c => c !== name));

      toast.success("Categoria removida");
    } catch (e: any) {
      toast.error("Erro ao remover", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Categorias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="Nova categoria" 
            value={newCategory} 
            onChange={(e) => setNewCategory(e.target.value)} 
          />
          <Button
            onClick={handleAddCategory}
            disabled={saving}
          >
            Adicionar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {visibleCategories.map((c) => (
            <div key={c} className="flex items-center justify-between rounded-md border px-3 py-2 bg-background">
              {editingCategory === c ? (
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={categoryEditValue}
                    onChange={(e) => setCategoryEditValue(e.target.value)}
                    placeholder="Editar categoria"
                    className="h-8"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary"

                      onClick={() => handleEditCategory(c)}
                      title="Salvar"
                      disabled={saving}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryEditValue("");
                      }}
                      title="Cancelar"
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="truncate flex-1">{c}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingCategory(c);
                        setCategoryEditValue(c);
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-foreground"
                      onClick={() => handleRemoveCategory(c)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {categories.length > 0 && (
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
                  {[12, 24, 48, 96].map((size) => (
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

export default CategoriesTab;
