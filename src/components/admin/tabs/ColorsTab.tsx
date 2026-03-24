import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, Check, X, Trash2 } from "lucide-react";
import { parseSupabaseError } from "@/lib/utils";

interface Color {
  id?: number;
  name: string;
  hex: string;
}

interface ColorsTabProps {
  tenantId?: string | null;
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

    if (IS_SUPABASE_READY && tenantId) {
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
        toast.success("Cor adicionada com sucesso!");
      } catch (e: any) {
        toast.error("Erro ao adicionar cor", { description: parseSupabaseError(e) });
      }
    }
  };

  const handleUpdateColor = async (color: Color) => {
    if (!editName.trim() || !editHex) {
      toast.error("Preencha o nome e a cor");
      return;
    }

    if (IS_SUPABASE_READY && tenantId && color.id) {
      try {
        const { error } = await supabase
          .from("colors")
          .update({ name: editName, hex: editHex })
          .eq("id", color.id)
          .eq("tenant_id", tenantId);

        if (error) throw error;

        setGlobalColors(prev => prev.map(c => c.id === color.id ? { ...c, name: editName, hex: editHex } : c));
        setEditingId(null);
        toast.success("Cor atualizada com sucesso!");
      } catch (e: any) {
        toast.error("Erro ao atualizar cor", { description: parseSupabaseError(e) });
      }
    }
  };

  const handleRemoveColor = async (id: number) => {
    if (!confirm("Deseja realmente remover esta cor?")) return;

    if (IS_SUPABASE_READY && tenantId) {
      try {
        const { error } = await supabase
          .from("colors")
          .delete()
          .eq("id", id)
          .eq("tenant_id", tenantId);

        if (error) throw error;

        setGlobalColors(prev => prev.filter(c => c.id !== id));
        toast.success("Cor removida com sucesso!");
      } catch (e: any) {
        toast.error("Erro ao remover cor");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Cores (Global)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Nome da cor (Ex: Azul Marinho, Vermelho...)"
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              className="w-12 h-10 p-1 bg-card border-border cursor-pointer"
              value={newColorHex}
              onChange={(e) => setNewColorHex(e.target.value)}
            />
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded min-w-[80px] text-center">{newColorHex}</code>
          </div>
          <Button onClick={handleAddColor} className="whitespace-nowrap">
            Adicionar Cor
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {globalColors.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border p-3 bg-muted group hover:border-primary transition-all shadow-sm">
              {editingId === c.id ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome da cor"
                    />
                    <Input
                      type="color"
                      className="w-12 h-10 p-1 bg-card border-border cursor-pointer"
                      value={editHex}
                      onChange={(e) => setEditHex(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleUpdateColor(c)}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full border border-white/20 shadow-sm" 
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(c.id!);
                        setEditName(c.name);
                        setEditHex(c.hex);
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveColor(c.id!)}
                      title="Excluir"
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
  );
};

export default ColorsTab;
