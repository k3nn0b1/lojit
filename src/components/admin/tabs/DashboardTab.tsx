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
  const [loading, setLoading] = useState(false);

  // Labels amigáveis para o seletor
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
           {/* Placeholder para os KPIs (Etapa 2) */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-[2rem] border border-dashed border-primary/10 bg-primary/5 animate-pulse flex items-center justify-center">
                   <span className="text-[10px] uppercase font-black tracking-widest opacity-20 text-primary">Carregando Unidade de Métrica {i}...</span>
                </div>
              ))}
           </div>

           {/* Placeholder para Gráficos (Etapa 4) */}
           <div className="mt-10 h-80 rounded-[3rem] border border-dashed border-primary/10 bg-primary/5 animate-pulse flex items-center justify-center">
              <div className="text-center space-y-4">
                <Clock className="w-12 h-12 mx-auto text-primary opacity-20" />
                <p className="text-[10px] uppercase font-black tracking-widest opacity-20 text-primary leading-relaxed">
                  Aguardando Validação de Período Chronos...<br/>
                  Sincronizando fluxo de dados do Supabase
                </p>
              </div>
           </div>
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
