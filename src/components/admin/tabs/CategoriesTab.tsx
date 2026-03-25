import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, X, Loader2, PlusCircle, Tag } from "lucide-react";
import { parseSupabaseError } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

interface CategoriesTabProps {
  tenantId: string;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  IS_SUPABASE_READY: boolean;
}

const CategoriesTab = ({ tenantId, categories, setCategories, IS_SUPABASE_READY }: CategoriesTabProps) => {
  const [newCategory, setNewCategory] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [catEditValue, setCatEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [catToRemove, setCatToRemove] = useState<string | null>(null);

  const handleAddCategory = async () => {
    const raw = newCategory.trim().toUpperCase();
    if (!raw) return;
    if (categories.includes(raw)) {
      toast.error("Categoria já existe");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("categories").insert({ name: raw, tenant_id: tenantId });
      if (error) throw error;
      setCategories(prev => [...prev, raw].sort());
      toast.success("Categoria adicionada");
      setNewCategory("");
    } catch (e: any) {
      toast.error("Erro ao adicionar", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCat) return;
    const raw = catEditValue.trim().toUpperCase();
    if (!raw || raw === editingCat) {
      setEditingCat(null);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: raw })
        .eq("name", editingCat)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      setCategories(prev => prev.map(c => c === editingCat ? raw : c).sort());
      toast.success("Categoria atualizada");
      setEditingCat(null);
    } catch (e: any) {
      toast.error("Erro ao atualizar", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCategory = async (name: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("name", name)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      setCategories(prev => prev.filter(c => c !== name));
      toast.success("Categoria removida");
      setCatToRemove(null);
    } catch (e: any) {
      toast.error("Erro ao remover", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 py-6 border-b border-primary/10 px-8">
          <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
            <Tag className="w-6 h-6" /> Categorias de Produtos
          </CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Organize seu catálogo por tipos de mercadoria</p>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex gap-4 max-w-xl mx-auto bg-muted/20 p-2 rounded-2xl border border-primary/10 shadow-inner">
            <Input
              placeholder="Ex: CAMISA TAILANDESA, CHAIR, RETRÔ..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-12 bg-transparent border-none shadow-none text-base font-black uppercase px-6 focus-visible:ring-0"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button
              onClick={handleAddCategory}
              disabled={saving || !newCategory.trim()}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {categories.map((c) => (
              <div key={c} className="group relative border border-primary/10 rounded-2xl p-4 bg-muted/10 hover:border-primary/40 hover:bg-muted/20 transition-all shadow-primary/5 flex items-center gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary group-hover:text-black transition-all">
                    <Tag className="w-5 h-5" />
                </div>
                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-foreground flex-1 truncate">{c}</h4>
                <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingCat(c); setCatEditValue(c); }} className="h-10 w-10 p-0 rounded-full hover:bg-primary/10 hover:text-primary">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCatToRemove(c)} className="h-10 w-10 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={!!editingCat} onOpenChange={(open) => !open && setEditingCat(null)}>
            <DialogContent className="bg-card border-primary/30 rounded-[2.5rem] p-10 max-w-md border shadow-2xl">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">Editar Categoria</DialogTitle>
                <DialogDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Altere o nome global desta categoria</DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Input
                  value={catEditValue}
                  onChange={(e) => setCatEditValue(e.target.value)}
                  placeholder="EX: RETRÔ..."
                  className="h-16 text-xl font-black text-center uppercase border-primary/20 focus:ring-primary/20 bg-muted/20 rounded-2xl shadow-xl"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
                />
              </div>
              <DialogFooter className="gap-3">
                <Button variant="ghost" onClick={() => setEditingCat(null)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Abandonar</Button>
                <Button onClick={handleUpdateCategory} disabled={saving} className="flex-[2] h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-black rounded-2xl shadow-xl shadow-primary/20">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Alteração"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!catToRemove} onOpenChange={(open) => !open && setCatToRemove(null)}>
            <AlertDialogContent className="bg-card border-primary/30 rounded-[2.5rem] p-10 border shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-widest text-destructive">Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-muted-foreground">
                  Deseja remover a categoria <span className="text-foreground font-black">"{catToRemove}"</span>? 
                  Produtos vinculados a ela ficarão sem categoria definida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 gap-3">
                <AlertDialogCancel disabled={saving} className="flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-2xl border-primary/10">Voltar</AlertDialogCancel>
                <AlertDialogAction 
                  disabled={saving}
                  onClick={(e) => {
                    e.preventDefault();
                    if (catToRemove) handleRemoveCategory(catToRemove);
                  }}
                  className="flex-[2] h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/20"
                >
                  {saving ? "Processando..." : "Sim, Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoriesTab;
