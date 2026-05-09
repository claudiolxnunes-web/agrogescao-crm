import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Building2, TrendingUp, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";

// Mock data - depois conectar ao tRPC
const mockData = {
  representatives: 15,
  activeClients: 1217,
  revenue: 9400000,
  products: 57128,
  topReps: [
    { name: "ANESIO JUNIOR F. AGRO LTDA", value: 1900000, trend: "up" },
    { name: "BRUNO PEREIRA -RP REPRESENTACOES", value: 1700000, trend: "up" },
    { name: "GUSTAVO FARIA- TAGUEZE REPRESENTACOES", value: 1500000, trend: "down" },
  ],
  monthlyRevenue: [
    { month: "Jan", revenue: 650000 },
    { month: "Fev", revenue: 720000 },
    { month: "Mar", revenue: 890000 },
    { month: "Abr", revenue: 940000 },
    { month: "Mai", revenue: 1100000 },
    { month: "Jun", revenue: 1200000 },
  ],
  clientsBySegment: [
    { name: "A", value: 250, fill: "#3b82f6" },
    { name: "B", value: 450, fill: "#10b981" },
    { name: "C", value: 350, fill: "#f59e0b" },
    { name: "D", value: 167, fill: "#ef4444" },
  ],
};

const KPICard = ({ icon: Icon, label, value, unit, trend, color }: any) => (
  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">{value}</p>
            {unit && <p className="text-sm text-muted-foreground">{unit}</p>}
          </div>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Executivo</h1>
        <p className="text-muted-foreground mt-1">Visão geral de performance comercial</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="REPRESENTANTES"
          value={mockData.representatives}
          unit="Equipe ativa"
          color="bg-blue-500"
        />
        <KPICard
          icon={Building2}
          label="CLIENTES ATIVOS"
          value={mockData.activeClients}
          unit="Carteira atual"
          color="bg-green-500"
        />
        <KPICard
          icon={TrendingUp}
          label="FATURAMENTO IMPORTADO"
          value="R$ 9.4M"
          unit="468 notas fiscais"
          color="bg-amber-500"
        />
        <KPICard
          icon={Package}
          label="PRODUTOS VENDIDOS"
          value={mockData.products}
          unit="Volume: 1490100 t"
          color="bg-orange-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Evolução de Faturamento</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip formatter={(value) => `R$ ${(value / 1000000).toFixed(1)}M`} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Clients by Segment */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Clientes por Segmento</CardTitle>
            <CardDescription>Distribuição ABC</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={mockData.clientsBySegment} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {mockData.clientsBySegment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Representatives */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>🏆 Top Representantes por Faturamento</CardTitle>
          <CardDescription>Baseado nas notas fiscais importadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockData.topReps.map((rep, idx) => (
              <div key={idx} className="flex items-center justify-between pb-4 border-b last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium">{rep.name}</p>
                    <p className="text-sm text-muted-foreground">Faturamento acumulado</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">R$ {(rep.value / 1000000).toFixed(1)}M</p>
                  <div className="flex items-center gap-1 justify-end mt-1">
                    {rep.trend === "up" ? (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-500">+12%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                        <span className="text-xs text-red-500">-5%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}