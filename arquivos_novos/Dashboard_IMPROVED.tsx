import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, TrendingUp, DollarSign, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";

// Mock data - DEPOIS CONECTAR AO tRPC
const mockMetrics = {
  totalRepresentatives: 15,
  totalActiveClients: 1217,
  totalRevenue: 9400000,
  totalProducts: 57128,
  monthlyRevenue: [
    { month: "Jan", revenue: 650000 },
    { month: "Fev", revenue: 720000 },
    { month: "Mar", revenue: 890000 },
    { month: "Abr", revenue: 940000 },
    { month: "Mai", revenue: 1100000 },
    { month: "Jun", revenue: 1200000 },
  ],
  clientsBySegment: [
    { name: "Segmento A", value: 250, fill: "#10b981" },
    { name: "Segmento B", value: 450, fill: "#3b82f6" },
    { name: "Segmento C", value: 350, fill: "#f59e0b" },
    { name: "Segmento D", value: 167, fill: "#ef4444" },
  ],
  topRepresentatives: [
    { id: 1, name: "ANESIO JUNIOR F. AGRO LTDA", revenue: 1900000, trend: "up" },
    { id: 2, name: "BRUNO PEREIRA -RP REPRESENTACOES", revenue: 1700000, trend: "up" },
    { id: 3, name: "GUSTAVO FARIA- TAGUEZE REPRESENTACOES", revenue: 1500000, trend: "down" },
  ],
  revenueBySegment: [
    { segment: "Segmento A", value: 1200000 },
    { segment: "Segmento B", value: 2800000 },
    { segment: "Segmento C", value: 2400000 },
    { segment: "Segmento D", value: 1000000 },
  ],
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

interface KPICardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}

const KPICard = ({ icon: Icon, label, value, subtitle, color }: KPICardProps) => (
  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {typeof value === "number" && value > 1000
          ? (value / 1000000).toFixed(1) + "M"
          : value}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const totalRevenue = mockMetrics.totalRevenue;
  const totalOpportunities = mockMetrics.clientsBySegment.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Executivo</h1>
        <p className="text-muted-foreground">Visão geral de performance comercial</p>
      </div>

      {/* KPI Cards - 4 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="REPRESENTANTES"
          value={mockMetrics.totalRepresentatives}
          subtitle="Equipe ativa"
          color="bg-blue-500"
        />
        <KPICard
          icon={Users}
          label="CLIENTES ATIVOS"
          value={mockMetrics.totalActiveClients}
          subtitle="Carteira atual"
          color="bg-green-500"
        />
        <KPICard
          icon={DollarSign}
          label="FATURAMENTO"
          value={(mockMetrics.totalRevenue / 1000000).toFixed(1)}
          subtitle="Em milhões (R$)"
          color="bg-amber-500"
        />
        <KPICard
          icon={Package}
          label="PRODUTOS VENDIDOS"
          value={mockMetrics.totalProducts}
          subtitle="Volume total"
          color="bg-orange-500"
        />
      </div>

      {/* Charts Grid - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Evolução de Faturamento</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockMetrics.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    formatter={(value) =>
                      `R$ ${(value as number / 1000000).toFixed(1)}M`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Segment */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Faturamento por Segmento</CardTitle>
            <CardDescription>Distribuição de receita</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockMetrics.revenueBySegment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="segment" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    formatter={(value) =>
                      `R$ ${(value as number / 1000000).toFixed(1)}M`
                    }
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients by Segment */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Clientes por Segmento</CardTitle>
            <CardDescription>Distribuição ABC</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockMetrics.clientsBySegment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {mockMetrics.clientsBySegment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Métricas Principais</CardTitle>
            <CardDescription>KPIs de performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  R$ {(totalRevenue / 200000).toFixed(0)}K
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Cliente por Rep</p>
                <p className="text-2xl font-bold">
                  {Math.round(mockMetrics.totalActiveClients / mockMetrics.totalRepresentatives)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                <p className="text-2xl font-bold">
                  {((mockMetrics.totalActiveClients / 1500) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-purple-200 flex items-center justify-center">
                <span className="text-purple-600 font-bold">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Representatives */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>🏆 Top 3 Representantes</CardTitle>
          <CardDescription>Por faturamento acumulado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockMetrics.topRepresentatives.map((rep, idx) => (
              <div
                key={rep.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/20 transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{rep.name}</p>
                    <p className="text-xs text-muted-foreground">Faturamento acumulado</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    R$ {(rep.revenue / 1000000).toFixed(1)}M
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {rep.trend === "up" ? (
                      <>
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-500 font-medium">+12%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-500 font-medium">-5%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Segment Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Resumo por Segmento</CardTitle>
          <CardDescription>Distribuição de clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockMetrics.clientsBySegment.map((segment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: segment.fill }}
                  ></div>
                  <span className="text-sm font-medium">{segment.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{segment.value}</span>
                  <span className="text-xs text-muted-foreground">
                    ({((segment.value / totalOpportunities) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
