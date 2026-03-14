import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, Check, X } from "lucide-react";
import { parseSupabaseError, sortSizes } from "@/lib/utils";

interface SizesTabProps {
  globalSizes: string[];
  setGlobalSizes: React.Dispatch<React.SetStateAction<string[]>>;
  IS_SUPABASE_READY: boolean;
}

const SizesTab = ({ globalSizes, setGlobalSizes, IS_SUPABASE_READY }: SizesTabProps) => {
  const [newGlobalSize, setNewGlobalSize] = useState("");
  const [editingSize, setEditingSize] = useState<string | null>(null);
  const [sizeEditValue, setSizeEditValue] = useState("");

  const saveGlobalSizes = async (next: string[]) => {
    const removed = globalSizes.filter((s) => !next.includes(s));
    const normalized = sortSizes(next);
    setGlobalSizes(normalized);
    if (IS_SUPABASE_READY) {
      try {
        const rows = normalized.map((name) => ({ name }));
        const { error: upsertErr } = await supabase.from("sizes").upsert(rows, { onConflict: "name" });
        if (upsertErr) throw upsertErr;

        if (removed.length > 0) {
          const { error: delErr } = await supabase.from("sizes").delete().in("name", removed);
          if (delErr) throw delErr;
        }

        toast.success("Tamanhos atualizados");
      } catch (e: any) {
        toast.error("Falha ao salvar tamanhos no Supabase", { description: parseSupabaseError(e) });
      }
    } else {
      toast.error("Supabase não configurado.");
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
            onClick={() => {
              const raw = newGlobalSize.trim().toUpperCase();
              if (!raw) return;
              if (globalSizes.includes(raw)) {
                toast.error("Tamanho já existe");
                return;
              }
              const next = sortSizes([...globalSizes, raw]);
              saveGlobalSizes(next);
              setNewGlobalSize("");
              toast.success("Tamanho adicionado");
            }}
          >
            Adicionar
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
          {globalSizes.map((s) => (
            <div key={s} className="flex items-center justify-between rounded-md border px-3 py-2 bg-background">
              {editingSize === s ? (
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={sizeEditValue}
                    onChange={(e) => setSizeEditValue(e.target.value)}
                    placeholder="Editar tamanho"
                  />
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const raw = sizeEditValue.trim().toUpperCase();
                      if (!raw) return;
                      if (raw === s) {
                        setEditingSize(null);
                        setSizeEditValue("");
                        return;
                      }
                      if (globalSizes.includes(raw)) {
                        toast.error("Tamanho já existe");
                        return;
                      }
                      const next = sortSizes([...globalSizes.filter((x) => x !== s), raw]);
                      saveGlobalSizes(next);
                      setEditingSize(null);
                      setSizeEditValue("");
                      toast.success("Tamanho atualizado");
                    }}
                    title="Salvar"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingSize(null);
                      setSizeEditValue("");
                    }}
                    title="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span>{s}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingSize(s);
                        setSizeEditValue(s);
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Deseja remover o tamanho "${s}"?`)) {
                          const next = globalSizes.filter((x) => x !== s);
                          saveGlobalSizes(next);
                        }
                      }}
                    >
                      Remover
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

export default SizesTab;
