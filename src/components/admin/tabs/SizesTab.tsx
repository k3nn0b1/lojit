import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, X, Loader2, PlusCircle, Ruler } from "lucide-react";
import { parseSupabaseError, sortSizes } from "@/lib/utils";
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

interface SizesTabProps {
  tenantId: string;
  globalSizes: string[];
  setGlobalSizes: React.Dispatch<React.SetStateAction<string[]>>;
  IS_SUPABASE_READY: boolean;
}

const SizesTab = ({ tenantId, globalSizes, setGlobalSizes, IS_SUPABASE_READY }: SizesTabProps) => {
  const [newGlobalSize, setNewGlobalSize] = useState("");
  const [editingSize, setEditingSize] = useState<string | null>(null);
  const [sizeEditValue, setSizeEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [sizeToRemove, setSizeToRemove] = useState<string | null>(null);

  const handleAddSize = async () => {
    const raw = newGlobalSize.trim().toUpperCase();
    if (!raw) return;
    if (globalSizes.includes(raw)) {
      toast.error("Tamanho já existe");
      return;
    }
    if (!IS_SUPABASE_READY || !tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("sizes").insert({ name: raw, tenant_id: tenantId });
      if (error) throw error;
      setGlobalSizes(prev => sortSizes([...prev, raw]));
      toast.success("Tamanho adicionado com sucesso!");
      setNewGlobalSize("");
    } catch (e: any) {
      toast.error("Erro ao adicionar", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSize = async () => {
    if (!editingSize) return;
    const raw = sizeEditValue.trim().toUpperCase();
    if (!raw || raw === editingSize) {
      setEditingSize(null);
      return;
    }
    if (globalSizes.includes(raw)) {
      toast.error("Tamanho já existe");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("sizes")
        .update({ name: raw })
        .eq("name", editingSize)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      setGlobalSizes(prev => sortSizes(prev.map(s => s === editingSize ? raw : s)));
      toast.success("Tamanho atualizado");
      setEditingSize(null);
    } catch (e: any) {
      toast.error("Erro ao atualizar", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSize = async (name: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("sizes")
        .delete()
        .eq("name", name)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      setGlobalSizes(prev => prev.filter(s => s !== name));
      toast.success("Tamanho removido");
      setSizeToRemove(null);
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
            <Ruler className="w-6 h-6" /> Grade de Tamanhos
          </CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Define os tamanhos globais disponíveis para os modelos</p>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex gap-4 max-w-xl mx-auto bg-muted/20 p-2 rounded-2xl border border-primary/10 shadow-inner">
            <Input
              placeholder="Ex: PP, G, 42, 128GB..."
              value={newGlobalSize}
              onChange={(e) => setNewGlobalSize(e.target.value)}
              className="h-12 bg-transparent border-none shadow-none text-base font-black uppercase px-6 focus-visible:ring-0"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSize()}
            />
            <Button
              onClick={handleAddSize}
              disabled={saving || !newGlobalSize.trim()}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {globalSizes.map((s) => (
              <div key={s} className="group relative flex items-center justify-between rounded-2xl border border-primary/10 px-6 py-4 bg-muted/10 hover:border-primary/40 transition-all hover:bg-muted/20 hover:translate-y-[-2px] hover:shadow-xl shadow-primary/5">
                <span className="truncate flex-1 font-black text-xs uppercase tracking-widest text-foreground">{s}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingSize(s);
                      setSizeEditValue(s);
                    }}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full"
                    onClick={() => setSizeToRemove(s)}
                    disabled={saving}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={!!editingSize} onOpenChange={(open) => !open && setEditingSize(null)}>
            <DialogContent className="bg-card border-primary/30 rounded-[2.5rem] p-10 max-w-md border shadow-2xl">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">Editar Tamanho</DialogTitle>
                <DialogDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Altera o identificador global deste tamanho</DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Input
                  value={sizeEditValue}
                  onChange={(e) => setSizeEditValue(e.target.value)}
                  placeholder="EX: M..."
                  className="h-16 text-2xl font-black text-center uppercase border-primary/20 focus:ring-primary/20 bg-muted/20 rounded-2xl shadow-xl"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateSize()}
                />
              </div>
              <DialogFooter className="gap-3">
                <Button variant="ghost" onClick={() => setEditingSize(null)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancelar</Button>
                <Button onClick={handleUpdateSize} disabled={saving} className="flex-[2] h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-black rounded-2xl shadow-xl shadow-primary/20">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Mudanças"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!sizeToRemove} onOpenChange={(open) => !open && setSizeToRemove(null)}>
            <AlertDialogContent className="bg-card border-primary/30 rounded-[2.5rem] p-10 border shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-widest text-destructive">Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-muted-foreground">
                  Deseja remover <span className="text-foreground font-black">"{sizeToRemove}"</span>? 
                  Esta ação afetará todos os produtos vinculados a este tamanho.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 gap-3">
                <AlertDialogCancel disabled={saving} className="flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-2xl border-primary/10">
                  Voltar
                </AlertDialogCancel>
                <AlertDialogAction 
                  disabled={saving}
                  onClick={(e) => {
                    e.preventDefault();
                    if (sizeToRemove) handleRemoveSize(sizeToRemove);
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

export default SizesTab;
