import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Users, Building2, Briefcase, TrendingUp,
  ArrowUpRight, Award, DollarSign, Package
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecção",
  qualification: "Qualificação",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Ganho",
  lost: "Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: "#6366f1",
  qualification: "#f59e0b",
  proposal: "#3b82f6",
  negotiation: "#8b5cf6",
  won: "#22c55e",
  lost: "#ef4444",
};

function formatCurrency(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

function KPICard({
  title, value, subtitle, icon: Icon, trend, trendValue, color
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{title}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-foreground">{value}</p>
            {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>}
          </div>
          <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${color.replace("bg-", "bg-").replace("-500", "-100")} dark:bg-opacity-20`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color.replace("bg-", "text-")}`} />
          </div>
        </div>
        {trendValue && (
          <div className="flex items-center gap-1 mt-2 sm:mt-3">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span className="text-[10px] sm:text-xs font-medium text-green-500">{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  const { data: regions } = trpc.regions.list.useQuery();
  const regionId = selectedRegion !== "all" ? regions?.find(r => r.code === selectedRegion)?.id : undefined;

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery(
    { regionId },
    { refetchInterval: 60000 }
  );
  const { data: salesTrend, isLoading: trendLoading } = trpc.dashboard.salesTrend.useQuery({ regionId });
  const { data: repRanking } = trpc.dashboard.repRanking.useQuery({ regionId, limit: 8 });
  const { data: pipelineByStage } = trpc.dashboard.pipelineByStage.useQuery({ regionId });
  const { data: regionSummary } = trpc.dashboard.regionSummary.useQuery();

  // Dados de faturamento real da tabela sales_invoices
  const { data: fatTotals } = trpc.vendas.getTotals.useQuery({});
  const { data: fatByRep } = trpc.vendas.getByRepresentative.useQuery({ limit: 6 } as any);

  const MONTH_NAMES_D = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const salesData = salesTrend?.map(s => ({
    month: MONTH_NAMES_D[(Number(s.month) - 1) % 12] || String(s.month),
    receita: Math.round(Number((s as any).revenue ?? (s as any).value ?? 0) / 1000),
    clientes: Number((s as any).clientsServed ?? (s as any).clientsCount ?? 0),
  })) || [];

  const pipelineData = pipelineByStage?.map(p => ({
    name: STAGE_LABELS[p.stage || ""] || p.stage,
    value: Number(p.count),
    amount: Number(p.totalValue),
    color: STAGE_COLORS[p.stage || ""] || "#6b7280",
  })).filter(p => p.value > 0) || [];

  const regionData = (regionSummary || []).filter(r => r?.region?.code).map(r => ({
    name: r.region.code,
    clientes: Number(r.clientCount ?? 0),
    representantes: Number(r.repCount ?? 0),
    receita: Math.round(Number(r.totalRevenue ?? 0) / 1000),
  })).filter(r => r.clientes > 0 || r.representantes > 0);

  const hasFaturamento = fatTotals && Number(fatTotals.totalFaturamento) > 0;
  const hasPipeline = pipelineData.length > 0;
  const hasSalesTrend = salesData.some(s => s.receita > 0);
  const hasRegionData = regionData.length > 0;
  const hasRepRanking = repRanking && repRanking.filter(item => item?.rep?.id).length > 0;
  const hasRegionSummary = (regionSummary || []).filter(r => r?.region?.code && (Number(r.clientCount) > 0 || Number(r.repCount) > 0)).length > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Visão geral da performance comercial</p>
        </div>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full sm:w-48 h-11">
            <SelectValue placeholder="Todas as regiões" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as regiões</SelectItem>
            {regions?.map(r => (
              <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            {(kpis?.totalRepresentatives ?? 0) > 0 && (
              <KPICard
                title="Representantes"
                value={kpis?.totalRepresentatives || 0}
                subtitle="Equipe ativa"
                icon={Users}
                color="bg-blue-500"
              />
            )}
            {(kpis?.totalActiveClients ?? 0) > 0 && (
              <KPICard
                title="Clientes Ativos"
                value={kpis?.totalActiveClients || 0}
                subtitle="Carteira atual"
                icon={Building2}
                color="bg-green-500"
              />
            )}
            {hasFaturamento && (
              <KPICard
                title="Faturamento Importado"
                value={formatCurrency(Number(fatTotals?.totalFaturamento ?? 0))}
                subtitle={`${fatTotals?.totalNFs ?? 0} notas fiscais`}
                icon={DollarSign}
                color="bg-emerald-500"
              />
            )}
            {hasFaturamento && (
              <KPICard
                title="Produtos Vendidos"
                value={`${Number(fatTotals?.totalQtdSacos ?? 0).toLocaleString("pt-BR")} sc`}
                subtitle={`Volume: ${Number(fatTotals?.totalVolume ?? 0).toFixed(0)} t`}
                icon={Package}
                color="bg-orange-500"
              />
            )}
            {(kpis?.totalOpportunities ?? 0) > 0 && (
              <KPICard
                title="Oportunidades"
                value={kpis?.totalOpportunities || 0}
                subtitle="Em andamento"
                icon={Briefcase}
                color="bg-purple-500"
              />
            )}
            {(kpis?.pipelineValue ?? 0) > 0 && (
              <KPICard
                title="Pipeline Total"
                value={formatCurrency(kpis?.pipelineValue || 0)}
                subtitle="Valor em negociação"
                icon={TrendingUp}
                color="bg-violet-500"
              />
            )}
          </>
        )}
      </div>

      {/* Faturamento por representante (se houver dados) */}
      {hasFaturamento && fatByRep && fatByRep.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              Top Representantes por Faturamento
            </CardTitle>
            <CardDescription>Baseado nas notas fiscais importadas</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {fatByRep.slice(0, 6).map((item: any, index: number) => {
                const fat = Number(item.totalFaturamento ?? 0);
                const maxFat = Number(fatByRep[0]?.totalFaturamento ?? 1);
                const pct = maxFat > 0 ? (fat / maxFat) * 100 : 0;
                return (
                  <div key={item.repCode ?? index} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`text-xs font-bold w-5 text-center ${
                      index === 0 ? "text-yellow-500" :
                      index === 1 ? "text-gray-400" :
                      index === 2 ? "text-orange-400" : "text-muted-foreground"
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.repName ?? item.repCode ?? "—"}</p>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-[120px]">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600">{formatCurrency(fat)}</p>
                      <p className="text-[10px] text-muted-foreground">{item.totalNFs ?? 0} NFs</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts: Tendência + Pipeline (só se tiver dados) */}
      {(hasSalesTrend || hasPipeline) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {hasSalesTrend && (
            <Card className={hasPipeline ? "lg:col-span-2" : "lg:col-span-3"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tendência de Receita (12 meses)</CardTitle>
                <CardDescription>Receita mensal em R$ mil</CardDescription>
              </CardHeader>
              <CardContent>
                {trendLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}K`} />
                      <Tooltip
                        formatter={(v: number) => [`R$ ${v}K`, "Receita"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="receita"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {hasPipeline && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pipeline por Estágio</CardTitle>
                <CardDescription>Distribuição de oportunidades</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pipelineData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string, props: any) => [
                        `${v} oportunidades`,
                        props.payload.name
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Performance por Região + Ranking (só se tiver dados) */}
      {(hasRegionData || hasRepRanking) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {hasRegionData && (
            <Card className={hasRepRanking ? "lg:col-span-2" : "lg:col-span-3"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Performance por Região</CardTitle>
                <CardDescription>Clientes e representantes por região</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                    <Bar dataKey="clientes" name="Clientes" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="representantes" name="Representantes" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {hasRepRanking && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  Ranking de Representantes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {(repRanking || []).filter(item => item?.rep?.id).slice(0, 6).map((item, index) => (
                    <div key={item.rep.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`text-xs font-bold w-5 text-center ${
                        index === 0 ? "text-yellow-500" :
                        index === 1 ? "text-gray-400" :
                        index === 2 ? "text-orange-400" : "text-muted-foreground"
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.rep.name}</p>
                        <p className="text-xs text-muted-foreground">{item.regionName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-primary">{item.rep.performanceScore}%</p>
                        <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${item.rep.performanceScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Region Summary Cards (só se tiver dados) */}
      {hasRegionSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {(regionSummary || [])
            .filter(r => r?.region?.code && (Number(r.clientCount) > 0 || Number(r.repCount) > 0))
            .map(r => (
              <Card key={r.region.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="font-bold text-primary border-primary/30 bg-primary/5">
                      {r.region.code}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{r.region.name}</span>
                  </div>
                  <div className="space-y-1.5">
                    {Number(r.clientCount) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Clientes</span>
                        <span className="font-semibold">{Number(r.clientCount)}</span>
                      </div>
                    )}
                    {Number(r.repCount) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Representantes</span>
                        <span className="font-semibold">{Number(r.repCount)}</span>
                      </div>
                    )}
                    {Number(r.oppCount) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Oportunidades</span>
                        <span className="font-semibold">{Number(r.oppCount)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
