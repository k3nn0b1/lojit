import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Pencil, Check, X, Trash2, Palette, PlusCircle, Search, Droplets, Info } from "lucide-react";
import { parseSupabaseError } from "@/lib/utils";
import { Color } from "@/lib/types";
import { Label } from "@/components/ui/label";

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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredColors = globalColors.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.hex.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddColor = async () => {
    const name = newColorName.trim().toUpperCase();
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
        .update({ name: editName.toUpperCase(), hex: editHex })
        .eq("id", color.id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      setGlobalColors(prev => prev.map(c => c.id === color.id ? { ...c, name: editName.toUpperCase(), hex: editHex } : c));
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
    <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-3xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <Droplets className="w-8 h-8" /> Paleta de SKUS
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Protocolação cromática oficial dos lotes comerciais</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end p-8 rounded-[2rem] bg-muted/10 border border-primary/5 shadow-inner">
            <div className="lg:col-span-2 space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">HEX MASTER</Label>
               <div className="relative group">
                  <Input
                    type="color"
                    className="h-16 w-full p-2 bg-background border-none rounded-2xl cursor-pointer shadow-2xl hover:scale-105 transition-transform"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                  />
               </div>
            </div>
            <div className="lg:col-span-7 space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 ml-2">Label Cromática (EX: AZUL MARINHO)</Label>
               <Input
                  placeholder="DIGITE O NOME DA COR..."
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  className="h-16 bg-background/50 border-primary/5 rounded-2xl font-black uppercase text-base px-8 shadow-2xl focus:ring-primary/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColor()}
               />
            </div>
            <div className="lg:col-span-3">
               <Button
                  onClick={handleAddColor}
                  disabled={saving || !newColorName.trim()}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PlusCircle className="w-6 h-6" /> ACOPLAR COR</>}
                </Button>
            </div>
          </div>

          <div className="pt-10 border-t border-primary/5 space-y-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/40">Inventário de Matizes ({globalColors.length})</h4>
                <div className="relative w-full md:w-80">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40" />
                   <Input 
                      placeholder="FILTRAR PALETA..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 bg-background/50 border-primary/5 pl-12 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner"
                   />
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredColors.map((c) => {
                  const isEditing = editingId === c.id;
                  return (
                    <div key={c.id} className={`group relative rounded-[2.5rem] border transition-all p-6 flex flex-col items-center gap-4 text-center overflow-hidden shadow-2xl ${isEditing ? 'bg-primary/10 border-primary scale-[1.05] z-10' : 'bg-muted/5 border-primary/5 hover:border-primary/20 hover:bg-muted/10'}`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10 group-hover:scale-150 transition-transform" />
                      
                      {isEditing ? (
                        <div className="space-y-6 w-full animate-in fade-in duration-300">
                           <div className="flex items-center gap-3 bg-background/40 p-2 rounded-2xl border border-primary/10">
                              <Input type="color" className="w-12 h-12 p-0 bg-transparent border-none shrink-0 cursor-pointer" value={editHex} onChange={(e) => setEditHex(e.target.value)} />
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-12 bg-transparent border-none text-[10px] font-black uppercase tracking-widest flex-1 px-2" />
                           </div>
                           <div className="flex gap-2 justify-center">
                              <Button variant="ghost" size="icon" onClick={() => handleUpdateColor(c)} className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black shadow-xl shadow-green-500/10 transition-all">
                                 <Check className="h-6 w-6" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white shadow-xl shadow-destructive/10 transition-all">
                                 <X className="h-6 w-6" />
                              </Button>
                           </div>
                        </div>
                      ) : (
                        <>
                           <div className="relative group/color">
                              <div className="w-20 h-20 rounded-[2rem] border-4 border-white/5 shadow-2xl transition-all group-hover/color:rotate-12 group-hover/color:scale-110" style={{ backgroundColor: c.hex }} />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none">
                                 <Droplets className="w-6 h-6 text-white drop-shadow-lg" />
                              </div>
                           </div>
                           <div className="space-y-1 flex-1 min-w-0">
                              <h5 className="font-black text-xs uppercase tracking-[0.2em] text-foreground truncate">{c.name}</h5>
                              <code className="text-[9px] font-mono text-primary font-black opacity-60 uppercase">{c.hex}</code>
                           </div>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 pt-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => { setEditingId(c.id!); setEditName(c.name); setEditHex(c.hex); }}
                                className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemoveColor(c.id!)}
                                className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                           </div>
                        </>
                      )}
                    </div>
                  );
                })}
                
                {filteredColors.length === 0 && (
                   <div className="col-span-full py-20 text-center opacity-20">
                      <Droplets className="w-16 h-16 mx-auto mb-6 opacity-30 animate-pulse" />
                      <p className="font-black uppercase tracking-[0.3em] text-[10px]">Nenhum matiz registrado nesta visualização</p>
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
            Estas cores formam o Atlas Cromático Global do seu painel. Toda cor cadastrada aqui fica imediatamente disponível para seleção rápida em qualquer ficha técnica de produto, permitindo filtros harmônicos no layout comercial.
         </p>
      </div>
    </div>
  );
};

export default ColorsTab;
