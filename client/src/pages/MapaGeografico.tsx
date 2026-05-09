import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Building2, Users, TrendingUp, Wheat, Factory } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

function formatCurrency(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

const REGION_COLORS: Record<string, string> = {
  SP: "#22c55e",
  MG: "#3b82f6",
  RJ: "#f59e0b",
  Outras: "#8b5cf6",
};

const BRAZIL_REGIONS = [
  { code: "SP", name: "São Paulo", x: 42, y: 62, clients: 52, reps: 18, revenue: 1200000 },
  { code: "MG", name: "Minas Gerais", x: 48, y: 52, clients: 38, reps: 8, revenue: 850000 },
  { code: "RJ", name: "Rio de Janeiro", x: 52, y: 60, clients: 28, reps: 6, revenue: 620000 },
  { code: "Outras", name: "Outras Regiões", x: 35, y: 40, clients: 38, reps: 12, revenue: 780000 },
];

export default function MapaGeografico() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: regions } = trpc.regions.list.useQuery();
  const { data: mapData } = trpc.clients.getMapData.useQuery();
  const { data: regionSummary } = trpc.dashboard.regionSummary.useQuery();

  const regionId = selectedRegion ? regions?.find(r => r.code === selectedRegion)?.id : undefined;
  const { data: clients } = trpc.clients.list.useQuery({
    regionId,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  const regionBarData = (regionSummary || []).filter((r: any) => r?.region?.code).map((r: any) => ({
    name: r.region.code,
    clientes: Number(r.clientCount ?? 0),
    receita: Math.round(Number(r.totalRevenue ?? 0) / 1000),
    color: REGION_COLORS[r.region.code] || "#6b7280",
  }));

  const stateGroups = clients?.reduce((acc: Record<string, number>, c) => {
    const state = c.state || "N/A";
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {}) || {};

  const stateData = Object.entries(stateGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([state, count]) => ({ state, count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mapa Geográfico</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Distribuição de clientes e representantes por região</p>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tipo de cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="fazenda_ruminantes">Fazenda de Ruminantes</SelectItem>
            <SelectItem value="fabrica_racao">Fábrica de Ração</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Region Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {BRAZIL_REGIONS.map(region => (
          <Card
            key={region.code}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedRegion === region.code ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedRegion(selectedRegion === region.code ? null : region.code)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: REGION_COLORS[region.code] || "#6b7280" }}
                >
                  {region.code}
                </div>
                {selectedRegion === region.code && (
                  <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Selecionado</Badge>
                )}
              </div>
              <p className="font-semibold text-sm">{region.name}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />Clientes
                  </span>
                  <span className="font-semibold">{region.clients}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />Representantes
                  </span>
                  <span className="font-semibold">{region.reps}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />Receita
                  </span>
                  <span className="font-semibold text-primary">{formatCurrency(region.revenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Map */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Distribuição Regional — Brasil
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* SVG Map of Brazil (simplified) */}
            <div className="relative bg-blue-50 dark:bg-blue-900/20 rounded-xl overflow-hidden" style={{ height: 380 }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Background */}
                <rect width="100" height="100" fill="transparent" />

                {/* Simplified Brazil outline */}
                <path
                  d="M 20 15 L 35 10 L 55 8 L 70 12 L 78 20 L 80 30 L 75 40 L 78 50 L 72 60 L 65 70 L 55 78 L 45 82 L 35 78 L 25 70 L 18 60 L 15 50 L 12 38 L 15 25 Z"
                  fill="hsl(var(--muted))"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />

                {/* Region dots */}
                {BRAZIL_REGIONS.map(region => (
                  <g key={region.code}>
                    <circle
                      cx={region.x}
                      cy={region.y}
                      r={Math.sqrt(region.clients) * 0.8 + 3}
                      fill={REGION_COLORS[region.code] || "#6b7280"}
                      fillOpacity={selectedRegion === region.code ? 0.9 : 0.7}
                      stroke={selectedRegion === region.code ? "white" : "transparent"}
                      strokeWidth="1"
                      className="cursor-pointer transition-all hover:fill-opacity-100"
                      onClick={() => setSelectedRegion(selectedRegion === region.code ? null : region.code)}
                    />
                    <text
                      x={region.x}
                      y={region.y + 0.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="2.5"
                      fill="white"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {region.code}
                    </text>
                    <text
                      x={region.x}
                      y={region.y + Math.sqrt(region.clients) * 0.8 + 6}
                      textAnchor="middle"
                      fontSize="2"
                      fill="hsl(var(--foreground))"
                      className="pointer-events-none"
                    >
                      {region.clients} clientes
                    </text>
                  </g>
                ))}
              </svg>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-card/90 rounded-lg p-2 shadow-sm">
                <p className="text-xs font-semibold mb-1">Legenda</p>
                {BRAZIL_REGIONS.map(r => (
                  <div key={r.code} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REGION_COLORS[r.code] }} />
                    <span>{r.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Clientes por Região</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={regionBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="clientes" name="Clientes" radius={[4, 4, 0, 0]}>
                    {regionBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client List by State */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Clientes por Estado
                {selectedRegion && <span className="text-primary ml-1">— {selectedRegion}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {stateData.map(({ state, count }) => (
                  <div key={state} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{state}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{count}</Badge>
                  </div>
                ))}
                {stateData.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Type Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tipos de Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Wheat className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-semibold">Fazendas de Ruminantes</p>
                  <p className="text-xl font-bold text-green-600">
                    {clients?.filter(c => c.type === "fazenda_ruminantes").length || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Factory className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold">Fábricas de Ração</p>
                  <p className="text-xl font-bold text-blue-600">
                    {clients?.filter(c => c.type === "fabrica_racao").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
