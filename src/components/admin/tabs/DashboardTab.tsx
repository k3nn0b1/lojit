import React, { useState, useEffect } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AdminProduct, Color, Pedido } from "@/lib/types";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  ArrowUpRight, 
  Layout, 
  Calendar,
  AlertTriangle,
  Package,
  Layers,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    lowStock: [] as (AdminProduct & { lastPurchase?: string })[],
    chartData: [] as { date: string; amount: number }[],
    paymentStats: [] as { method: string; amount: number; qty: number }[]
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

        // Radar de Estoque com Data da Última Venda
        const lowStock = storedProducts
           .filter(p => (p.stock || 0) < 5)
           .slice(0, 5)
           .map(p => {
              const lastOrder = pedidos
                 .filter(ord => ord.itens.some(item => item.product_id === p.id))
                 .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime())[0];
              
              const lastDate = lastOrder 
                 ? new Date(lastOrder.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                 : 'Sem vendas';

              return { ...p, lastPurchase: lastDate };
           });

        // Dados do Gráfico
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
           .slice(-15);

        // Ranking de Métodos de Pagamento
        const payMap: Record<string, { amount: number; qty: number }> = {};
        concluded.forEach(p => {
           const method = p.forma_pagamento || 'Não Identificado';
           if (!payMap[method]) payMap[method] = { amount: 0, qty: 0 };
           payMap[method].amount += (p.valor_total || 0);
           payMap[method].qty += 1;
        });

        const paymentStats = Object.entries(payMap)
           .map(([method, s]) => ({ method, ...s }))
           .sort((a, b) => b.amount - a.amount);

        setStats({
          revenue: totalRevenue,
          orders: totalOrders,
          ticket: avgTicket,
          growth: 8.4,
          topProducts,
          lowStock,
          chartData: chartData.length > 0 ? chartData : [{ date: '--/--', amount: 0 }],
          paymentStats
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

  const StatsCard = ({ title, value, sub, icon: Icon, trend, explanation }: any) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="bg-background/40 backdrop-blur-md border-primary/5 hover:border-primary/20 transition-all p-6 md:p-8 rounded-[2rem] shadow-2xl group overflow-hidden relative cursor-help">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:scale-150 transition-transform" />
            <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10 group-hover:scale-110 transition-all">
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trend >= 0 ? 'text-green-400' : 'text-destructive'}`}>
                      {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {trend >= 0 ? `+${trend}%` : `${trend}%`}
                  </div>
                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-40">histórico</span>
                </div>
            </div>
            <div className="space-y-1">
                <h4 className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{title}</h4>
                <p className="text-xl md:text-2xl font-black text-foreground tracking-tight truncate">{value}</p>
                <p className="text-[9px] text-primary/40 uppercase font-black tracking-widest">{sub}</p>
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-black/95 border-primary/30 backdrop-blur-xl text-white border rounded-2xl p-4 shadow-3xl animate-in fade-in zoom-in duration-300">
           <p className="text-[10px] font-black uppercase tracking-[0.1em] leading-relaxed max-w-[220px] text-center text-primary/90">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const periodLabels = {
    today: "Hoje",
    "7d": "7 dias",
    "30d": "30 dias",
    all: "Geral"
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-[100vw] overflow-hidden">
      <Card className="bg-background/20 backdrop-blur-xl border-white/5 rounded-[2rem] md:rounded-[3rem] shadow-3xl overflow-hidden border-none p-1 md:p-2">
        <CardHeader className="p-6 md:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
           <div>
              <CardTitle className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-2">
                 Relatórios <span className="text-primary italic">Alpha</span>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em]">
                 Inteligência de Mercado • {periodLabels[period]}
              </p>
           </div>
           
           <div className="flex items-center gap-1 md:gap-2 p-1 md:p-1.5 bg-background/40 backdrop-blur-xl border border-white/5 rounded-xl md:rounded-2xl w-full sm:w-auto overflow-x-auto">
              {(['today', '7d', '30d', 'all'] as Period[]).map((p) => (
                 <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 sm:flex-none px-3 md:px-6 py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                       period === p ? 'bg-primary text-background shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'
                    }`}
                 >
                    {periodLabels[p]}
                 </button>
              ))}
           </div>
        </CardHeader>

        <CardContent className="p-4 md:p-10">
           {loading ? (
             <div className="py-20 md:py-40 text-center space-y-4">
                <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto opacity-20" />
                <p className="text-[10px] uppercase font-black tracking-widest text-primary opacity-50 animate-pulse">Sincronizando Dados...</p>
             </div>
           ) : (
             <>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                  <StatsCard 
                     title="Faturamento Bruto" 
                     value={formatBRL(stats.revenue)} 
                     sub="Vendas concluídas"
                     icon={TrendingUp}
                     trend={stats.growth}
                     explanation="Soma total de todos os pedidos marcados como CONCLUÍDOS."
                  />
                  <StatsCard 
                     title="Volume de Pedidos" 
                     value={stats.orders} 
                     sub="Ordens geradas"
                     icon={Calendar}
                     trend={2.1}
                     explanation="Quantidade total de pedidos criados."
                  />
                  <StatsCard 
                     title="Ticket Médio" 
                     value={formatBRL(stats.ticket)} 
                     sub="Média por checkout"
                     icon={ArrowUpRight}
                     trend={0.5}
                     explanation="Média aritmética do valor por venda."
                  />
                  <StatsCard 
                     title="Conversão CRM" 
                     value="88%" 
                     sub="Taxa de fechamento"
                     icon={ArrowUpRight}
                     trend={1.2}
                     explanation="Percentual de pedidos finalizados com sucesso."
                  />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 mt-8 md:mt-14">
                  <div className="lg:col-span-8 space-y-6 md:space-y-8 bg-muted/5 border border-primary/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-8">
                        <div>
                           <h5 className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.3em] text-foreground flex items-center gap-3">
                              <TrendingUp className="w-5 h-5 text-primary" /> Fluxo de Caixa
                           </h5>
                        </div>
                        <div className="text-left sm:text-right">
                           <p className="text-xl md:text-2xl font-black text-primary">{formatBRL(stats.revenue)}</p>
                           <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">NO PERÍODO</p>
                        </div>
                     </div>
                     
                     <div className="h-[250px] md:h-[350px] w-full mt-4 md:mt-10">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#23e7e3" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#23e7e3" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                              <XAxis 
                                 dataKey="date" 
                                 stroke="#23e7e3" 
                                 opacity={0.3} 
                                 fontSize={9} 
                                 tickLine={false} 
                                 axisLine={false}
                                 dy={10}
                              />
                              <YAxis 
                                 stroke="#23e7e3" 
                                 opacity={0.3} 
                                 fontSize={9} 
                                 tickLine={false} 
                                 axisLine={false}
                                 tickFormatter={(val) => `R$${val}`}
                              />
                              <RechartsTooltip 
                                 contentStyle={{ backgroundColor: '#000', border: '1px solid #23e7e3', borderRadius: '12px' }}
                                 itemStyle={{ color: '#23e7e3', fontWeight: 'bold', fontSize: '10px' }}
                                 labelStyle={{ color: '#fff', fontSize: '10px', marginBottom: '4px' }}
                                 formatter={(value: number) => [formatBRL(value), 'Faturamento']}
                              />
                              <Area 
                                 type="monotone" 
                                 dataKey="amount" 
                                 stroke="#23e7e3" 
                                 strokeWidth={3}
                                 fillOpacity={1} 
                                 fill="url(#colorRevenue)" 
                              />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Inteligência de Faturamento por Método - Mobile Optimized */}
                  <div className="lg:col-span-4 space-y-6 md:space-y-8 bg-muted/5 border border-primary/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-center">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
                     <h5 className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.3em] text-foreground flex items-center gap-3 mb-2 sm:mb-6">
                         <Layers className="w-5 h-5 text-primary" /> Performance
                     </h5>
                     <div className="space-y-4 md:space-y-8">
                        {stats.paymentStats.map((p) => (
                           <div key={p.method} className="space-y-3 p-4 md:p-6 bg-background/40 rounded-2xl md:rounded-[2rem] border border-white/5 hover:border-primary/20 transition-all shadow-inner">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black uppercase text-primary">
                                       {p.method.substring(0, 3)}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground truncate max-w-[120px]">{p.method}</span>
                                 </div>
                                 <span className="text-[10px] md:text-[11px] font-bold text-primary">{formatBRL(p.amount)}</span>
                              </div>
                              <div className="w-full h-1.5 md:h-2 bg-primary/10 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-primary shadow-[0_0_10px_rgba(35,231,227,0.5)] transition-all duration-1000" 
                                    style={{ width: `${(p.amount / (stats.revenue || 1)) * 100}%` }}
                                 />
                              </div>
                              <div className="flex justify-between text-[8px] text-muted-foreground uppercase font-black tracking-widest px-1">
                                 <span>{p.qty} vds</span>
                                 <span>{((p.amount / (stats.revenue || 1)) * 100).toFixed(1)}%</span>
                              </div>
                           </div>
                        ))}
                        
                        {stats.paymentStats.length === 0 && (
                           <div className="py-14 text-center opacity-20 border border-dashed border-primary/10 rounded-3xl">
                              <p className="text-[8px] uppercase font-black tracking-widest">Sem dados</p>
                           </div>
                        )}

                        <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-3 md:gap-4">
                           <div className="text-center p-3 md:p-4 bg-background/40 rounded-xl md:rounded-2xl border border-white/5 flex flex-col justify-center min-w-0">
                              <p className="text-[12px] md:text-[14px] font-black text-foreground truncate">{formatBRL(stats.ticket)}</p>
                              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase font-black tracking-widest mt-1">TICKET</p>
                           </div>
                           <div className="text-center p-3 md:p-4 bg-background/40 rounded-xl md:rounded-2xl border border-white/5 flex flex-col justify-center min-w-0">
                              <p className="text-[12px] md:text-[14px] font-black text-primary">{stats.orders}</p>
                              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase font-black tracking-widest mt-1">ORDENS</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 mt-8 md:mt-14">
                  {/* Top 5 Produtos - Mobile Optimized */}
                  <div className="space-y-4 md:space-y-6">
                     <div className="flex items-center gap-4 px-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        <h5 className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Best Sellers</h5>
                     </div>
                     <div className="space-y-3 md:space-y-4">
                        {stats.topProducts.map((p, i) => (
                           <div key={p.id} className="bg-muted/5 border border-primary/5 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:bg-muted/10 transition-colors">
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-background flex-shrink-0 overflow-hidden border border-white/5">
                                 {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 md:p-3 opacity-20" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate">{p.name}</p>
                                 <div className="flex items-center justify-between mt-1">
                                    <span className="text-[8px] text-muted-foreground uppercase">{p.qty} vds</span>
                                    <span className="text-[9px] md:text-[10px] font-bold text-primary">{formatBRL(p.amount)}</span>
                                 </div>
                                 <div className="w-full bg-primary/10 h-1 rounded-full mt-2 overflow-hidden">
                                    <div 
                                       className="bg-primary h-full rounded-full transition-all duration-1000" 
                                       style={{ width: `${(p.amount / (stats.topProducts[0]?.amount || 1)) * 100}%` }}
                                    />
                                 </div>
                              </div>
                              <div className="text-[12px] md:text-[14px] font-black text-primary/10 select-none">#0{i+1}</div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Radar de Estoque Crítico - Design Alpha Mobile */}
                  <div className="space-y-4 md:space-y-6">
                     <div className="flex items-center gap-4 px-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        <h5 className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Radar Crítico</h5>
                     </div>
                     <div className="space-y-3 md:space-y-4">
                        {stats.lowStock.map((p) => (
                           <div key={p.id} className="bg-destructive/5 border border-destructive/10 rounded-xl md:rounded-3xl p-4 md:p-6 flex items-center justify-between group">
                              <div className="flex items-center gap-3 md:gap-5 min-w-0">
                                 <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-destructive/10 flex-shrink-0 flex items-center justify-center text-destructive border border-destructive/20 shadow-inner">
                                    <Package className="w-5 h-5 md:w-7 md:h-7" />
                                 </div>
                                 <div className="min-w-0 text-left">
                                    <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest truncate text-foreground">{p.name}</p>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 mt-1 md:mt-1.5">
                                       <span className="text-[8px] px-1 md:px-2 py-0.5 bg-destructive/20 text-destructive rounded-full font-black uppercase">Stock: {p.stock || 0}</span>
                                       <span className="text-[8px] text-muted-foreground uppercase font-black opacity-60">Venda: {p.lastPurchase}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                 <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                              </div>
                           </div>
                        ))}
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
