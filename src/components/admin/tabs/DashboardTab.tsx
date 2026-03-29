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
  Clock,
  Package, 
  ShoppingBag, 
  AlertTriangle, 
  Layers,
  Activity
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AdminProduct, Color, Pedido } from "@/lib/types";

interface DashboardTabProps {
  tenantId: string;
  IS_SUPABASE_READY: boolean;
  storedProducts: AdminProduct[];
}

type Period = "today" | "7d" | "30d" | "all";

const DashboardTab = ({ tenantId, IS_SUPABASE_READY, storedProducts }: DashboardTabProps) => {
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    ticket: 0,
    growth: 5.2,
    topProducts: [] as { id: number; name: string; image: string; amount: number; qty: number }[],
    lowStock: [] as AdminProduct[],
    chartData: [] as { date: string; amount: number }[],
    statusCounts: { pendente: 0, concluido: 0, outros: 0 }
  });

  const fetchStats = async () => {
    if (!IS_SUPABASE_READY || !tenantId) return;
    setLoading(true);

    try {
      let query = supabase.from("pedidos").select("*").eq("tenant_id", tenantId);

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
        const pedidos = data as Pedido[];
        const concluded = pedidos.filter(p => p.status === "concluido");
        
        // Faturamento e Contagem
        const totalRevenue = concluded.reduce((sum, p) => sum + (p.valor_total || 0), 0);
        const totalOrders = data.length;
        const avgTicket = concluded.length > 0 ? totalRevenue / concluded.length : 0;

        // Processar Ranking de Produtos
        const prodMap: Record<number, { amount: number; qty: number }> = {};
        pedidos.forEach(p => {
           p.itens.forEach(item => {
              if (!prodMap[item.product_id]) prodMap[item.product_id] = { amount: 0, qty: 0 };
              prodMap[item.product_id].amount += (item.preco_unitario * item.quantidade);
              prodMap[item.product_id].qty += item.quantidade;
           });
        });

        const topProducts = Object.entries(prodMap)
           .map(([id, s]) => {
              const p = storedProducts.find(prod => prod.id === Number(id));
              return {
                 id: Number(id),
                 name: p?.name || "Prod. Descontinuado",
                 image: p?.imageUrl || "",
                 amount: s.amount,
                 qty: s.qty
              };
           })
           .sort((a, b) => b.amount - a.amount)
           .slice(0, 5);

        // Radar de Estoque (Produtos com estoque total < 5)
        const lowStock = storedProducts.filter(p => (p.stock || 0) < 5).slice(0, 5);

        // Dados do Gráfico (Últimos dias selecionados)
        const dateMap: Record<string, number> = {};
        concluded.forEach(p => {
           const d = new Date(p.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
           dateMap[d] = (dateMap[d] || 0) + (p.valor_total || 0);
        });

        const chartData = Object.entries(dateMap)
           .map(([date, amount]) => ({ date, amount }))
           .sort((a, b) => {
              const [da, ma] = a.date.split('/').map(Number);
              const [db, mb] = b.date.split('/').map(Number);
              return ma === mb ? da - db : ma - mb;
           })
           .slice(-15); // Mostrar últimos 15 dias de dados para clareza

        // Contagem de Status
        const statusCounts = {
           pendente: pedidos.filter(p => p.status === 'pendente').length,
           concluido: pedidos.filter(p => p.status === 'concluido').length,
           outros: pedidos.filter(p => p.status !== 'pendente' && p.status !== 'concluido').length
        };

        setStats({
          revenue: totalRevenue,
          orders: totalOrders,
          ticket: avgTicket,
          growth: 8.4,
          topProducts,
          lowStock,
          chartData: chartData.length > 0 ? chartData : [{ date: '--/--', amount: 0 }],
          statusCounts
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

    // Sincronização Alpha Realtime (Etapa 5)
    if (!IS_SUPABASE_READY || !tenantId) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'pedidos',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          // Atualiza as métricas silenciosamente quando algo muda no banco
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [period, tenantId, storedProducts]);

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
             <>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-white">
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

               {/* Gráfico de Fluxo de Caixa */}
               <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 space-y-8 bg-muted/5 border border-primary/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                     <div className="flex items-center justify-between mb-2">
                        <div className="space-y-1">
                           <h5 className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground flex items-center gap-3">
                              <Activity className="w-5 h-5 text-primary" /> Fluxo de Caixa Digital
                           </h5>
                           <p className="text-[9px] text-muted-foreground uppercase opacity-60">Histórico de liquidez base dia</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[20px] font-black text-primary tracking-tighter">{formatBRL(stats.revenue)}</p>
                           <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Total no Período</p>
                        </div>
                     </div>
                     
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                 <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#23e7e3" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#23e7e3" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#23e7e3" opacity={0.05} vertical={false} />
                              <XAxis 
                                 dataKey="date" 
                                 stroke="#23e7e3" 
                                 opacity={0.3} 
                                 fontSize={10} 
                                 tickLine={false} 
                                 axisLine={false}
                                 tick={{ fill: '#23e7e3', fontWeight: 'bold' }}
                              />
                              <YAxis 
                                 stroke="#23e7e3" 
                                 opacity={0.3} 
                                 fontSize={10} 
                                 tickLine={false} 
                                 axisLine={false}
                                 tickFormatter={(val) => `R$${val}`}
                              />
                              <Tooltip 
                                 contentStyle={{ backgroundColor: '#000', border: '1px solid #23e7e3', borderRadius: '12px' }}
                                 itemStyle={{ color: '#23e7e3', fontWeight: 'bold', fontSize: '10px' }}
                                 labelStyle={{ color: '#fff', fontSize: '10px', marginBottom: '4px' }}
                                 formatter={(value: number) => [formatBRL(value), 'Faturamento']}
                              />
                              <Area 
                                 type="monotone" 
                                 dataKey="amount" 
                                 stroke="#23e7e3" 
                                 strokeWidth={4}
                                 fillOpacity={1} 
                                 fill="url(#colorRevenue)" 
                              />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Distribuição Logística */}
                  <div className="lg:col-span-4 space-y-8 bg-muted/5 border border-primary/10 p-10 rounded-[3rem] shadow-2xl">
                     <h5 className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground flex items-center gap-3 mb-6">
                         <Layers className="w-5 h-5 text-primary" /> Distribuição Logística
                     </h5>
                     <div className="space-y-8">
                        <div className="space-y-3">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-muted-foreground">Concluídos</span>
                              <span className="text-primary">{stats.statusCounts.concluido} de {stats.orders}</span>
                           </div>
                           <div className="w-full h-3 bg-primary/10 rounded-full overflow-hidden border border-white/5">
                              <div 
                                 className="h-full bg-primary shadow-[0_0_10px_rgba(35,231,227,0.5)] transition-all duration-1000" 
                                 style={{ width: `${(stats.statusCounts.concluido / (stats.orders || 1)) * 100}%` }}
                              />
                           </div>
                        </div>

                        <div className="space-y-3">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-muted-foreground">Pendentes / Em Aberto</span>
                              <span className="text-amber-400">{stats.statusCounts.pendente}</span>
                           </div>
                           <div className="w-full h-3 bg-amber-400/10 rounded-full overflow-hidden border border-white/5">
                              <div 
                                 className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all duration-1000" 
                                 style={{ width: `${(stats.statusCounts.pendente / (stats.orders || 1)) * 100}%` }}
                              />
                           </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                           <div className="text-center p-4 bg-background/40 rounded-2xl border border-white/5">
                              <p className="text-xl font-black text-foreground">{stats.orders}</p>
                              <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">PEDIDOS TOTAL</p>
                           </div>
                           <div className="text-center p-4 bg-background/40 rounded-2xl border border-white/5">
                              <p className="text-xl font-black text-primary">{((stats.statusCounts.concluido / (stats.orders || 1)) * 100).toFixed(0)}%</p>
                              <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">EFICIÊNCIA</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Seção de Inteligência Complementar */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-14">
                  {/* Top 5 Produtos */}
                  <div className="space-y-6">
                     <div className="flex items-center gap-4 px-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        <h5 className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Best Sellers do Escopo</h5>
                     </div>
                     <div className="space-y-4">
                        {stats.topProducts.map((p, i) => (
                           <div key={p.id} className="bg-muted/5 border border-primary/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-muted/10 transition-colors">
                              <div className="w-12 h-12 rounded-xl bg-background flex-shrink-0 overflow-hidden border border-white/5">
                                 {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 opacity-20" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-[10px] font-black uppercase tracking-widest truncate">{p.name}</p>
                                 <div className="flex items-center justify-between mt-1">
                                    <span className="text-[9px] text-muted-foreground uppercase">{p.qty} vendas</span>
                                    <span className="text-[10px] font-bold text-primary">{formatBRL(p.amount)}</span>
                                 </div>
                                 <div className="w-full bg-primary/10 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div 
                                       className="bg-primary h-full rounded-full transition-all duration-1000" 
                                       style={{ width: `${(p.amount / (stats.topProducts[0]?.amount || 1)) * 100}%` }}
                                    />
                                 </div>
                              </div>
                              <div className="text-[14px] font-black text-primary/10 select-none">#0{i+1}</div>
                           </div>
                        ))}
                        {stats.topProducts.length === 0 && (
                           <div className="py-20 text-center opacity-20 border border-dashed border-primary/10 rounded-3xl">
                              <p className="text-[10px] uppercase font-black tracking-widest">Nenhuma transação no período</p>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Radar de Estoque Crítico */}
                  <div className="space-y-6">
                     <div className="flex items-center gap-4 px-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        <h5 className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Radar de Estoque Crítico</h5>
                     </div>
                     <div className="space-y-4">
                        {stats.lowStock.map((p) => (
                           <div key={p.id} className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 flex items-center gap-4 group">
                              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex-shrink-0 flex items-center justify-center text-destructive border border-destructive/20">
                                 <Package className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-[10px] font-black uppercase tracking-widest truncate">{p.name}</p>
                                 <p className="text-[9px] text-destructive/60 uppercase font-black tracking-widest mt-1">ESTOQUE ATUAL: {p.stock || 0} UNIDADES</p>
                              </div>
                              <Button variant="ghost" className="h-10 px-4 rounded-xl bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all">
                                 Repor
                              </Button>
                           </div>
                        ))}
                        {stats.lowStock.length === 0 && (
                           <div className="py-20 text-center opacity-20 border border-dashed border-green-500/20 rounded-3xl">
                              <p className="text-[10px] uppercase font-black tracking-widest text-green-500">Fluxo de Inventário Estável</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
             </>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardTab;
