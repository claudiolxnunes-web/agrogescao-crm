import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area,
  FunnelChart, Funnel, LabelList, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { TrendingUp, Target, Clock, DollarSign, Activity, BarChart2 } from "lucide-react";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecção",
  qualification: "Qualificação",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Ganho",
  lost: "Perdido",
};

const ACTIVITY_LABELS: Record<string, string> = {
  visit: "Visitas",
  call: "Ligações",
  email: "E-mails",
  proposal: "Propostas",
  meeting: "Reuniões",
};

function formatCurrency(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

export default function Analytics() {
  const [regionFilter, setRegionFilter] = useState("all");
  const { data: regions } = trpc.regions.list.useQuery();
  const regionId = regionFilter !== "all" ? regions?.find(r => r.code === regionFilter)?.id : undefined;

  const forecast: any[] = [];
const funnel: any[] = [];
const heatmap: any[] = [];
  const { data: salesTrend } = trpc.dashboard.salesTrend.useQuery({ regionId });
  const { data: repRanking } = trpc.dashboard.repRanking.useQuery({ regionId, limit: 8 });

  const funnelData = (funnel || [])
    .filter((f: any) => f.stage !== null && !["won", "lost"].includes(f.stage!))
    .map((f, i: number) => ({
      name: STAGE_LABELS[f.stage || ""] || f.stage || "",
      value: Number(f.count),
      amount: Math.round(Number(f.totalValue) / 1000),
      fill: COLORS[i % COLORS.length],
    }));

  const heatmapData = (heatmap || []).map((h: any) => ({
    name: ACTIVITY_LABELS[h.type || ""] || h.type || "",
    value: Number(h.count),
    fill: COLORS[Object.keys(ACTIVITY_LABELS).indexOf(h.type || "") % COLORS.length],
  }));

  const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const trendData = (salesTrend || []).map(s => ({
    month: MONTH_NAMES[(Number(s.month) - 1) % 12] || String(s.month),
    receita: Math.round(Number((s as any).revenue ?? (s as any).value ?? 0) / 1000),
    opp: Number((s as any).opportunitiesWon ?? (s as any).opportunitiesCount ?? 0),
  }));

  const radarData = (repRanking || []).filter(r => r?.rep?.name).slice(0, 6).map(r => ({
    rep: (r.rep.name || "").split(" ")[0],
    score: r.rep.performanceScore || 0,
  }));

  const kpiCards = [
    {
      label: "Projeção 90 dias",
      value: formatCurrency(Number(forecast?.forecast90Days || 0)),
      sub: "Pipeline ponderado",
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Taxa de Conversão",
      value: `${Math.round((forecast?.conversionRate || 0.42) * 100)}%`,
      sub: "Média histórica",
      icon: Target,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Ciclo Médio",
      value: `${forecast?.avgCycleDays || 45} dias`,
      sub: "Prospecção → Fechamento",
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(forecast?.avgTicket || 31500),
      sub: "Por oportunidade ganha",
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-primary" />
            Analytics Avançada
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Forecast, funil de vendas e análise de atividades</p>
        </div>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas as regiões" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as regiões</SelectItem>
            {(regions || []).map(r => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Forecast */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendência de Receita</CardTitle>
            <CardDescription>Receita mensal em R$ mil — últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}K`} />
                <Tooltip
                  formatter={(v: number, name: string) => [name === "receita" ? `R$ ${v}K` : v, name === "receita" ? "Receita" : "Oport. Ganhas"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funil de Vendas</CardTitle>
            <CardDescription>Distribuição de oportunidades por estágio</CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <FunnelChart>
                  <Tooltip
                    formatter={(v: number, name: string) => [v, "Oportunidades"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" style={{ fontSize: 11 }} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Carregando funil...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Heatmap de Atividades</CardTitle>
            <CardDescription>Volume de atividades por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" name="Atividades" radius={[4, 4, 0, 0]}>
                  {heatmapData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rep Performance Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Performance dos Representantes</CardTitle>
            <CardDescription>Score de performance por representante</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={radarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="rep" tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Score"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  {radarData.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 80 ? "#22c55e" : entry.score >= 60 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stage Analysis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Análise do Pipeline por Estágio</CardTitle>
          <CardDescription>Valor total e quantidade de oportunidades em cada estágio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(funnel || []).map((stage, i) => {
              const label = STAGE_LABELS[stage.stage || ""] || stage.stage || "";
              const count = Number(stage.count);
              const value = Number(stage.totalValue);
              const maxCount = Math.max(...(funnel || []).map(f => Number(f.count)));
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const isWon = stage.stage === "won";
              const isLost = stage.stage === "lost";

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-xs font-medium text-right shrink-0">{label}</div>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isWon ? "#22c55e" : isLost ? "#ef4444" : COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <div className="w-12 text-xs font-bold text-right shrink-0">{count}</div>
                  <div className="w-20 text-xs text-muted-foreground text-right shrink-0">
                    {formatCurrency(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
