import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { normalizePhone, formatPhoneMask, parseSupabaseError } from "@/lib/utils";

interface CustomersTabProps {
  IS_SUPABASE_READY: boolean;
}

const CustomersTab = ({ IS_SUPABASE_READY }: CustomersTabProps) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientesQuery, setClientesQuery] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [editingClienteId, setEditingClienteId] = useState<number | null>(null);
  const [editingClienteNome, setEditingClienteNome] = useState("");
  const [editingClienteTelefone, setEditingClienteTelefone] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const clientesFiltered = clientes.filter((c) => {
    const term = clientesQuery.toLowerCase().trim();
    return term === "" || c.nome?.toLowerCase().includes(term) || String(c.telefone || "").toLowerCase().includes(term);
  });

  const totalPages = Math.ceil(clientesFiltered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleClientes = clientesFiltered.slice(startIndex, startIndex + pageSize);

  const handleQueryChange = (val: string) => {
    setClientesQuery(val);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!IS_SUPABASE_READY) return;
    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setClientes(data as any[]);
    };
    void fetchClientes();

    const channel = supabase
      .channel("clientes-realtime-tab")
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, async () => {
        const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
        if (data) setClientes(data as any[]);
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [IS_SUPABASE_READY]);

  const handleAddCliente = async () => {
    try {
      const nome = clienteNome.trim();
      const telRaw = clienteTelefone.trim();
      if (nome === "" || telRaw === "") {
        toast.error("Informe nome e telefone");
        return;
      }
      const tel = normalizePhone(telRaw);
      if (tel.length < 10) {
        toast.error("Telefone inválido");
        return;
      }
      if (!IS_SUPABASE_READY) {
        toast.error("Supabase não configurado");
        return;
      }
      const { error } = await supabase
        .from("clientes")
        .insert({ nome, telefone: tel });
      if (error) throw error;

      toast.success("Cliente salvo!");
      setClienteNome("");
      setClienteTelefone("");
    } catch (e: any) {
      toast.error("Falha ao salvar cliente", { description: parseSupabaseError(e) });
    }
  };

  const handleSaveCliente = async () => {
    try {
      const id = editingClienteId;
      if (id == null) return;
      const nome = editingClienteNome.trim();
      const telRaw = editingClienteTelefone.trim();
      if (nome === "" || telRaw === "") {
        toast.error("Informe nome e contato");
        return;
      }
      const tel = normalizePhone(telRaw);
      if (tel.length < 10) {
        toast.error("Contato inválido");
        return;
      }
      if (!IS_SUPABASE_READY) {
        toast.error("Supabase não configurado");
        return;
      }
      const { error } = await supabase
        .from("clientes")
        .update({ nome, telefone: tel })
        .eq("id", id);
      if (error) throw error;

      toast.success("Cliente atualizado");
      setEditingClienteId(null);
      setEditingClienteNome("");
      setEditingClienteTelefone("");
    } catch (e: any) {
      toast.error("Falha ao atualizar cliente", { description: parseSupabaseError(e) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <Label>Nome</Label>
            <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className="flex-1">
            <Label>Contato</Label>
            <Input value={clienteTelefone} onChange={(e) => setClienteTelefone(formatPhoneMask(e.target.value))} placeholder="(XX) XXXXX-XXXX" />
          </div>
          <Button onClick={handleAddCliente}>Adicionar</Button>
        </div>
        <div className="flex items-center gap-2">
          <Input value={clientesQuery} onChange={(e) => handleQueryChange(e.target.value)} placeholder="Buscar cliente por nome ou telefone" />
          <Button variant="outline" onClick={() => handleQueryChange("")}>Limpar</Button>
        </div>
        <div className="rounded-md border">
          {clientesFiltered.length === 0 ? (
            <p className="p-4 text-muted-foreground">Nenhum cliente encontrado</p>
          ) : (
            <>
              <div className="divide-y">
                {visibleClientes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex-1">
                      {editingClienteId === c.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Nome</Label>
                            <Input value={editingClienteNome} onChange={(e) => setEditingClienteNome(e.target.value)} />
                          </div>
                          <div>
                            <Label>Contato</Label>
                            <Input value={editingClienteTelefone} onChange={(e) => setEditingClienteTelefone(formatPhoneMask(e.target.value))} placeholder="(XX) XXXXX-XXXX" />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{c.nome}</div>
                          <div className="text-sm text-muted-foreground">{c.telefone}</div>
                        </div>
                      )}
                    </div>
                    {editingClienteId === c.id ? (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => { setEditingClienteId(null); setEditingClienteNome(""); setEditingClienteTelefone(""); }}>Cancelar</Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveCliente}>Salvar</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" onClick={() => { setEditingClienteId(c.id); setEditingClienteNome(c.nome || ""); setEditingClienteTelefone(c.telefone || ""); }}>Editar</Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination UI */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-muted/20 border-t">
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                  <span>Mostrando {pageSize} por página</span>
                  <select
                    className="bg-background border rounded px-2 py-1 outline-none text-foreground focus:border-primary transition-colors h-8 text-xs"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {[15, 30, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
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
                                ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,230,118,0.3)]"
                                : ""
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomersTab;
