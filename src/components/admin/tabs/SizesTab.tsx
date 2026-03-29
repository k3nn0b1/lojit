import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, X, Loader2, PlusCircle, Ruler, Search, Trash2, Info } from "lucide-react";
import { parseSupabaseError, sortSizes } from "@/lib/utils";
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSizes = globalSizes.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

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
    <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-3xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <Ruler className="w-8 h-8" /> Grade
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Defina os tamanhos e escalas de estoque</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end p-8 rounded-[2rem] bg-muted/10 border border-primary/5 shadow-inner">
            <div className="lg:col-span-8 space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Identificador do Tamanho (Ex: G, 42, GG...)</Label>
               <div className="relative group">
                  <Ruler className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                  <Input
                    placeholder="DIGITE O IDENTIFICADOR..."
                    value={newGlobalSize}
                    onChange={(e) => setNewGlobalSize(e.target.value)}
                    className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black uppercase text-base pl-16 pr-8 shadow-2xl focus:ring-primary/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSize()}
                  />
               </div>
            </div>
            <div className="lg:col-span-4">
               <Button
                  onClick={handleAddSize}
                  disabled={saving || !newGlobalSize.trim()}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PlusCircle className="w-6 h-6" /> ADICIONAR TAMANHO</>}
                </Button>
            </div>
          </div>

          <div className="pt-10 border-t border-primary/5 space-y-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/40">Grades cadastradas ({globalSizes.length})</h4>
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

             {/* Mobile: lista vertical / Desktop: grid multi-colunas com altura uniforme */}
             <div className="flex flex-col md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {filteredSizes.map((s) => (
                  <div key={s} className="group relative rounded-2xl md:rounded-[1.5rem] border border-primary/5 px-4 h-14 md:h-16 bg-muted/5 hover:border-primary/40 hover:bg-muted/10 transition-all shadow-lg flex items-center justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-2xl -z-10 group-hover:scale-150 transition-transform" />
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/10 shrink-0">
                            <Ruler className="w-3.5 h-3.5 text-primary opacity-60" />
                        </div>
                        <span className="font-black text-[11px] uppercase tracking-widest text-foreground truncate">{s}</span>
                    </div>
                    <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setEditingSize(s); setSizeEditValue(s); }}
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSizeToRemove(s)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                  </div>
                ))}
                
                {filteredSizes.length === 0 && (
                   <div className="md:col-span-full py-20 text-center opacity-20">
                      <Ruler className="w-16 h-16 mx-auto mb-6 opacity-30 animate-pulse" />
                      <p className="font-black uppercase tracking-[0.3em] text-[10px]">Nenhuma grade detectada</p>
                   </div>
                )}
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-8 text-primary shadow-3xl">
         <div className="hidden md:block">
            <Info className="w-10 h-10 opacity-30" />
         </div>
         <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed text-center md:text-left">
            Estas grades são globais e servem como padrão sistemático para todo o inventário. Ao criar uma grade aqui, ela fica imediatamente disponível para ser acoplada a qualquer produto, facilitando o controle logístico de estoque por tamanho.
         </p>
      </div>

      <Dialog open={!!editingSize} onOpenChange={(open) => !open && setEditingSize(null)}>
        <DialogContent className="bg-card border-primary/30 rounded-[3rem] p-12 max-w-md border shadow-3xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-primary">Editar Tamanho</DialogTitle>
            <DialogDescription className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 pt-4">Atualize o identificador do tamanho</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Input
              value={sizeEditValue}
              onChange={(e) => setSizeEditValue(e.target.value)}
              placeholder="EX: NOVO IDENTIFICADOR..."
              className="h-16 text-3xl font-black text-center uppercase border-primary/20 focus:ring-primary/20 bg-background/50 rounded-2xl shadow-2xl"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateSize()}
            />
          </div>
          <DialogFooter className="mt-10 gap-4">
            <Button variant="ghost" onClick={() => setEditingSize(null)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Abortar</Button>
            <Button onClick={handleUpdateSize} disabled={saving} className="flex-[2] h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Validar Rescala"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!sizeToRemove} onOpenChange={(open) => !open && setSizeToRemove(null)}>
        <AlertDialogContent className="bg-card border-primary/30 rounded-[3rem] p-12 border shadow-3xl text-center">
            <div className="absolute top-0 left-0 w-32 h-32 bg-destructive/10 blur-[50px] -z-10" />
            <AlertDialogHeader className="mb-8">
                <AlertDialogTitle className="text-3xl font-black uppercase tracking-tight text-destructive flex flex-col items-center gap-6">
                   <div className="w-20 h-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive">
                      <Trash2 className="w-10 h-10" />
                   </div>
                   EXCLUIR TAMANHO
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                   Você está prestes a remover <span className="text-foreground font-black">"{sizeToRemove}"</span>. 
                   Esta ação é irreversível e afetará todos os produtos vinculados a este tamanho.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-10 gap-4 justify-center">
                <AlertDialogCancel disabled={saving} className="flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-2xl border-primary/10 transition-all">Abortar</AlertDialogCancel>
                <AlertDialogAction 
                  disabled={saving}
                  onClick={(e) => {
                    e.preventDefault();
                    if (sizeToRemove) handleRemoveSize(sizeToRemove);
                  }}
                  className="flex-[2] h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/20 transition-all active:scale-95"
                >
                  {saving ? "PROCESSANDO..." : "SIM, EXCLUIR GRADE"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SizesTab;
