import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, Check, X, Trash2, Palette, PlusCircle } from "lucide-react";
import { parseSupabaseError } from "@/lib/utils";
import { Color } from "@/lib/types";

interface ColorsTabProps {
  tenantId: string;
  globalColors: Color[];
  setGlobalColors: React.Dispatch<React.SetStateAction<Color[]>>;
  IS_SUPABASE_READY: boolean;
}

const ColorsTab = ({ tenantId, globalColors, setGlobalColors, IS_SUPABASE_READY }: ColorsTabProps) => {
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editHex, setEditHex] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddColor = async () => {
    const name = newColorName.trim();
    if (!name || !newColorHex) {
      toast.error("Preencha o nome e a cor");
      return;
    }

    if (globalColors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Esta cor já existe");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("colors")
        .insert([{ name, hex: newColorHex, tenant_id: tenantId }])
        .select("*")
        .single();

      if (error) throw error;

      setGlobalColors(prev => [...prev, data]);
      setNewColorName("");
      setNewColorHex("#000000");
      toast.success("Cor adicionada ao catálogo");
    } catch (e: any) {
      toast.error("Erro ao adicionar cor", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateColor = async (color: Color) => {
    if (!editName.trim() || !editHex) {
      toast.error("Preencha o nome e a cor");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("colors")
        .update({ name: editName, hex: editHex })
        .eq("id", color.id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      setGlobalColors(prev => prev.map(c => c.id === color.id ? { ...c, name: editName, hex: editHex } : c));
      setEditingId(null);
      toast.success("Cor atualizada com sucesso");
    } catch (e: any) {
      toast.error("Erro ao atualizar cor", { description: parseSupabaseError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveColor = async (id: number) => {
    if (!confirm("Deseja realmente remover esta cor?")) return;

    try {
      const { error } = await supabase
        .from("colors")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      setGlobalColors(prev => prev.filter(c => c.id !== id));
      toast.success("Cor removida");
    } catch (e: any) {
      toast.error("Erro ao remover cor");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/30 backdrop-blur-sm border-primary/10 overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 py-6 border-b border-primary/10 px-8">
          <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
            <Palette className="w-6 h-6" /> Paleta de Cores
          </CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Gerencie as variações cromáticas oficiais dos modelos</p>
        </CardHeader>
        <CardContent className="p-8 space-y-10">
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto bg-muted/20 p-4 rounded-3xl border border-primary/10 shadow-inner">
            <div className="flex-1 flex items-center gap-4">
                <div className="relative">
                    <Input
                        type="color"
                        className="w-12 h-12 p-1.5 bg-background border-primary/20 rounded-xl cursor-pointer shadow-lg"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                    />
                </div>
                <Input
                    placeholder="Nome da cor..."
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="h-12 bg-transparent border-none shadow-none text-base font-black uppercase px-2 focus-visible:ring-0"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddColor()}
                />
            </div>
            <Button 
                onClick={handleAddColor} 
                disabled={saving || !newColorName.trim()}
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20"
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {globalColors.map((c) => (
              <div key={c.id} className="group relative rounded-[2rem] border border-primary/10 p-6 bg-muted/10 hover:border-primary/40 hover:bg-muted/20 transition-all shadow-primary/5 flex flex-col items-center text-center gap-5">
                {editingId === c.id ? (
                  <div className="space-y-4 w-full">
                    <div className="flex items-center gap-3 bg-background/50 p-2 rounded-2xl border border-primary/10">
                        <Input type="color" className="w-10 h-10 p-1 bg-transparent border-none" value={editHex} onChange={(e) => setEditHex(e.target.value)} />
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 bg-transparent border-none text-[10px] font-black uppercase" />
                    </div>
                    <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleUpdateColor(c)} className="h-10 w-10 p-0 rounded-full hover:bg-green-500/10 hover:text-green-500">
                          <Check className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-10 w-10 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive">
                          <X className="h-5 w-5" />
                        </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-white/5 shadow-2xl transform group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: c.hex }} />
                        <div className="absolute -bottom-2 -right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity uppercase">{c.hex}</div>
                    </div>
                    <div>
                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-foreground mb-1">{c.name}</h4>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingId(c.id!); setEditName(c.name); setEditHex(c.hex); }}
                          className="h-10 w-10 p-0 rounded-full hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveColor(c.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColorsTab;
