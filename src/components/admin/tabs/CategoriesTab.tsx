import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, X, Loader2, PlusCircle, Tag, Search, Trash2 } from "lucide-react";
import { parseSupabaseError } from "@/lib/utils";
import { Label } from "@/components/ui/label";
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = categories.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

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
    <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-3xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <Tag className="w-8 h-8" /> Categorias Master
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Arquitetura de taxonomia do catálogo comercial</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Identificador de Categoria (Marketing Name)</Label>
               <div className="relative group">
                  <Tag className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                  <Input
                    placeholder="EX: CAMISAS RETRÔ, ACESSÓRIOS, LOTE VIP..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black uppercase text-base pl-16 pr-8 shadow-2xl focus:ring-primary/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
               </div>
            </div>
            <div className="lg:col-span-4">
               <Button
                  onClick={handleAddCategory}
                  disabled={saving || !newCategory.trim()}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PlusCircle className="w-6 h-6" /> Cadastrar Categoria</>}
                </Button>
            </div>
          </div>

          <div className="pt-10 border-t border-primary/5 space-y-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/40">Inventário de Taxonomias ({categories.length})</h4>
                <div className="relative w-full md:w-80">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40" />
                   <Input 
                      placeholder="PESQUISAR..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 bg-background/50 border-primary/5 pl-12 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner"
                   />
                </div>
             </div>

             {/* Mobile: lista vertical / Desktop: grid 3 colunas com altura uniforme */}
             <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {filteredCategories.map((c) => (
                  <div key={c} className="group relative rounded-2xl md:rounded-[2rem] border border-primary/5 px-4 md:px-6 h-16 md:h-20 bg-muted/5 hover:border-primary/40 hover:bg-muted/10 transition-all shadow-xl flex items-center justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10 group-hover:scale-150 transition-transform" />
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform shrink-0">
                            <Tag className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest text-foreground truncate">{c}</span>
                    </div>
                    <div className="flex gap-1 md:gap-2 md:opacity-0 group-hover:opacity-100 transition-all md:transform md:translate-x-4 md:group-hover:translate-x-0 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCat(c); setCatEditValue(c); }} className="h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl">
                            <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setCatToRemove(c)} className="h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                            <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                    </div>
                  </div>
                ))}
                
                {filteredCategories.length === 0 && (
                   <div className="md:col-span-full py-20 text-center opacity-20">
                      <Tag className="w-16 h-16 mx-auto mb-6 opacity-30" />
                      <p className="font-black uppercase tracking-[0.3em] text-[10px]">Nenhum registro encontrado</p>
                   </div>
                )}
             </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingCat} onOpenChange={(open) => !open && setEditingCat(null)}>
        <DialogContent className="bg-card border-primary/30 rounded-[3rem] p-12 max-w-md border shadow-3xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-primary">Editar Taxonomia</DialogTitle>
            <DialogDescription className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 pt-4">Protocolo de Redefinição Global</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2 mb-4 block text-center">Nova Etiqueta de Categoria</Label>
            <Input
              value={catEditValue}
              onChange={(e) => setCatEditValue(e.target.value)}
              placeholder="EX: NOVO NOME..."
              className="h-16 text-2xl font-black text-center uppercase border-primary/20 focus:ring-primary/20 bg-background/50 rounded-2xl shadow-2xl"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
            />
          </div>
          <DialogFooter className="mt-10 gap-4">
            <Button variant="ghost" onClick={() => setEditingCat(null)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Abandonar</Button>
            <Button onClick={handleUpdateCategory} disabled={saving} className="flex-[2] h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Validar Mudança"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!catToRemove} onOpenChange={(open) => !open && setCatToRemove(null)}>
        <AlertDialogContent className="bg-card border-primary/30 rounded-[3rem] p-12 border shadow-3xl text-center">
            <div className="absolute top-0 left-0 w-32 h-32 bg-destructive/10 blur-[50px] -z-10" />
            <AlertDialogHeader className="mb-8">
                <AlertDialogTitle className="text-3xl font-black uppercase tracking-tight text-destructive flex flex-col items-center gap-6">
                   <div className="w-20 h-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive">
                      <Trash2 className="w-10 h-10" />
                   </div>
                   EXTINGUIR CATEGORIA
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                   Você está prestes a remover <span className="text-foreground font-black">"{catToRemove}"</span>. 
                   Produtos vinculados perderão sua classificação sistemática.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-10 gap-4 justify-center">
                <AlertDialogCancel disabled={saving} className="flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-2xl border-primary/10 transition-all">Abortar Missão</AlertDialogCancel>
                <AlertDialogAction 
                  disabled={saving}
                  onClick={(e) => {
                    e.preventDefault();
                    if (catToRemove) handleRemoveCategory(catToRemove);
                  }}
                  className="flex-[2] h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/20 transition-all active:scale-95"
                >
                  {saving ? "PROCESSANDO..." : "SIM, EXCLUIR REGISTRO"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesTab;
