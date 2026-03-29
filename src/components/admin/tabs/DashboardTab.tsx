import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface DashboardTabProps {
  tenantId: string;
  IS_SUPABASE_READY: boolean;
}

type Period = "today" | "7d" | "30d" | "all";

const DashboardTab = ({ tenantId, IS_SUPABASE_READY }: DashboardTabProps) => {
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    ticket: 0,
    growth: 5.2 // Placeholder de crescimento por enquanto
  });

  const fetchStats = async () => {
    if (!IS_SUPABASE_READY || !tenantId) return;
    setLoading(true);

    try {
      let query = supabase.from("pedidos").select("valor_total, status, data_criacao").eq("tenant_id", tenantId);

      // Filtro Cronológico Chronos
      const now = new Date();
      if (period === "today") {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        query = query.gte("data_criacao", startOfDay);
      } else if (period === "7d") {
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte("data_criacao", sevenDaysAgo);
      } else if (period === "30d") {
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString();
        query = query.gte("data_criacao", thirtyDaysAgo);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const concluded = data.filter(p => p.status === "concluido");
        const totalRevenue = concluded.reduce((sum, p) => sum + (p.valor_total || 0), 0);
        const totalOrders = data.length;
        const avgTicket = concluded.length > 0 ? totalRevenue / concluded.length : 0;

        setStats({
          revenue: totalRevenue,
          orders: totalOrders,
          ticket: avgTicket,
          growth: 8.4 // Calcularemos real na Etapa 5
        });
      }
    } catch (e) {
      toast.error("Erro ao sincronizar inteligência comercial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period, tenantId]);

  const formatBRL = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const StatsCard = ({ title, value, sub, icon: Icon, trend }: any) => (
    <Card className="bg-background/40 backdrop-blur-md border-primary/5 hover:border-primary/20 transition-all p-8 rounded-[2rem] shadow-2xl group overflow-hidden relative">
       <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:scale-150 transition-transform" />
       <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10 group-hover:scale-110 transition-all group-hover:bg-primary/20">
             <Icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-end">
             <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trend >= 0 ? 'text-green-400' : 'text-destructive'}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {trend >= 0 ? `+${trend}%` : `${trend}%`}
             </div>
             <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-40">vs anterior</span>
          </div>
       </div>
       <div className="space-y-1">
          <h4 className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{title}</h4>
          <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
          <p className="text-[9px] text-primary/40 uppercase font-black tracking-widest">{sub}</p>
       </div>
    </Card>
  );

  const periodLabels = {
    today: "Hoje",
    "7d": "Últimos 7 Dias",
    "30d": "Últimos 30 Dias",
    all: "Todo o Período"
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
      {/* Header de Comando */}
      <Card className="bg-card/20 backdrop-blur-md border-primary/10 overflow-hidden shadow-3xl rounded-[2.5rem]">
        <CardHeader className="bg-primary/5 py-8 border-b border-primary/10 px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase tracking-[0.2em] text-primary flex items-center gap-4">
                <BarChart3 className="w-8 h-8" /> Central de Inteligência
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Métricas comerciais e análise sistemática de performance</p>
            </div>

            {/* Seletor de Período Premium */}
            <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-2xl border border-primary/10 shadow-inner">
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  onClick={() => setPeriod(p)}
                  className={`h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                    period === p 
                    ? "bg-primary text-black shadow-lg shadow-primary/20 scale-105" 
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {periodLabels[p]}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-10">
           {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 rounded-[2rem] border border-dashed border-primary/10 bg-primary/5 animate-pulse flex items-center justify-center">
                     <span className="text-[10px] uppercase font-black tracking-widest opacity-20 text-primary">Sincronizando...</span>
                  </div>
                ))}
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                   title="Faturamento Bruto" 
                   value={formatBRL(stats.revenue)} 
                   sub="Liquidez de vendas concluídas"
                   icon={TrendingUp}
                   trend={stats.growth}
                />
                <StatsCard 
                   title="Volume de Pedidos" 
                   value={stats.orders} 
                   sub="Total de ordens geradas"
                   icon={Calendar}
                   trend={2.1}
                />
                <StatsCard 
                   title="Ticket Médio" 
                   value={formatBRL(stats.ticket)} 
                   sub="Valor médio por checkout"
                   icon={ArrowUpRight}
                   trend={0.5}
                />
                <StatsCard 
                   title="Conversão CRM" 
                   value="88%" 
                   sub="Taxa de fechamento global"
                   icon={ArrowUpRight}
                   trend={1.2}
                />
             </div>
           )}

           {/* Placeholder para Gráficos (Etapa 4) */}
           {!loading && (
             <div className="mt-10 h-80 rounded-[3rem] border border-dashed border-primary/10 bg-primary/5 flex items-center justify-center overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <div className="text-center space-y-4">
                  <Clock className="w-12 h-12 mx-auto text-primary opacity-20 animate-spin-slow" />
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-20 text-primary leading-relaxed px-10">
                    Mapeamento Visual de Fluxo Chronos em desenvolvimento...<br/>
                    Aguardando ativação da Etapa 4 do protocolo de implantação.
                  </p>
                </div>
             </div>
           )}
        </CardContent>
      </Card>

      {/* Informativo de Rodapé */}
      <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-8 text-primary shadow-3xl">
         <div className="hidden md:block">
            <TrendingUp className="w-10 h-10 opacity-30" />
         </div>
         <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed text-center md:text-left">
            O painel de relatórios consolida dados brutos em inteligência comercial. 
            Métricas de faturamento, volume e comportamento de compra são processadas em tempo real para otimizar a tomada de decisão estratégica da loja.
         </p>
      </div>
    </div>
  );
};

export default DashboardTab;
