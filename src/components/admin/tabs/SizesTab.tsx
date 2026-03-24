import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { parseSupabaseError, sortSizes } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface SizesTabProps {
  tenantId?: string | null;
  globalSizes: string[];
  setGlobalSizes: React.Dispatch<React.SetStateAction<string[]>>;
  IS_SUPABASE_READY: boolean;
}

const SizesTab = ({ tenantId, globalSizes, setGlobalSizes, IS_SUPABASE_READY }: SizesTabProps) => {
  const [newGlobalSize, setNewGlobalSize] = useState("");
  const [editingSize, setEditingSize] = useState<string | null>(null);
  const [sizeEditValue, setSizeEditValue] = useState("");
  const [saving, setSaving] = useState(false);

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
      toast.success("Tamanho adicionado");
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
    if (!IS_SUPABASE_READY || !tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("sizes")
        .update({ name: raw })
        .eq("name", editingSize)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      toast.success("Tamanho atualizado");
      setEditingSize(null);
    } catch (e: any) {
      toast.error("Erro ao atualizar", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSize = async (name: string) => {
    if (!IS_SUPABASE_READY || !tenantId) return;
    if (!confirm(`Deseja remover o tamanho "${name}"?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("sizes")
        .delete()
        .eq("name", name)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      toast.success("Tamanho removido");
    } catch (e: any) {
      toast.error("Erro ao remover", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Tamanhos (Global)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="Novo tamanho (Ex: PP, P, M, G, GG, XG, U...)"
            value={newGlobalSize}
            onChange={(e) => setNewGlobalSize(e.target.value)}
          />
          <Button
            onClick={handleAddSize}
            disabled={saving}
          >
            Adicionar
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
          {globalSizes.map((s) => (
            <div key={s} className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3 bg-card hover:border-primary/30 transition-all group">
              <span className="truncate flex-1 font-bold text-sm tracking-wide">{s}</span>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingSize(s);
                    setSizeEditValue(s);
                  }}
                  title="Editar"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleRemoveSize(s)}
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={!!editingSize} onOpenChange={(open) => !open && setEditingSize(null)}>
          <DialogContent className="bg-card text-primary/90 border border-primary sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-foreground text-xl">Editar Tamanho</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Altere o nome do tamanho global. Isso afetará todos os produtos que usam este tamanho.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <Input
                value={sizeEditValue}
                onChange={(e) => setSizeEditValue(e.target.value)}
                placeholder="Ex: PP, P, M, G..."
                className="h-14 text-lg font-bold text-center uppercase border-primary/20 focus:border-primary bg-muted/20"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateSize()}
              />
            </div>
            <DialogFooter className="flex flex-row gap-2">
              <Button variant="outline" onClick={() => setEditingSize(null)} className="flex-1 h-12">Cancelar</Button>
              <Button onClick={handleUpdateSize} disabled={saving} className="flex-1 h-12 font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Alteração"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SizesTab;
