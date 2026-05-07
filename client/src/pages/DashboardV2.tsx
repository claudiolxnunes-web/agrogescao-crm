import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";
import { AlertCircle, TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";

export function DashboardV2() {
  const [selectedRep, setSelectedRep] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Fetch sales metrics
  const salesSummary = trpc.analytics.sales.getSummary.useQuery();
  const salesByRegion = trpc.analytics.sales.getByRegion.useQuery();
  const salesByRep = trpc.analytics.sales.getByRep.useQuery();
  const salesByClient = trpc.analytics.sales.getByClient.useQuery();
  const salesByProduct = trpc.analytics.sales.getByProduct.useQuery();

  // Fetch client metrics
  const clientsByRep = trpc.analytics.clients.getByRepWithStatus.useQuery({ repId: selectedRep });
  const inactiveAlerts = trpc.analytics.clients.getInactiveAlerts.useQuery({ limit: 20 });
  const clientsByABC = trpc.analytics.clients.getByABCClass.useQuery();

  // Fetch ABC metrics
  const productsByABC = trpc.analytics.products.getByABCClass.useQuery();
  const repsByABC = trpc.analytics.representatives.getByABCClass.useQuery();

  // Fetch goals
  const goalsByRep = trpc.analytics.goals.getTotalByRep.useQuery();

  const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

  if (salesSummary.isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  const summary = salesSummary.data;
  const regions = salesByRegion.data || [];
  const reps = salesByRep.data || [];
  const clients = salesByClient.data || [];
  const products = salesByProduct.data || [];
  const goals = goalsByRep.data || [];

  return (
    <div className="space-y-8 p-8">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(summary?.totalRevenue || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.invoicedSales || 0} notas fiscais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Carteira (Aberta)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.openOrders || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pedidos em carteira</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(summary?.avgTicket || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Min: R$ {(summary?.minTicket || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Desconto Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.avgDiscount || 0).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Média de desconto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Preço Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(summary?.avgPrice || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por saco</p>
          </CardContent>
        </Card>
      </div>

      {/* Abas de Análise */}
      <Tabs defaultValue="regions" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="regions">Regiões</TabsTrigger>
          <TabsTrigger value="representatives">Representantes</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        {/* Regiões */}
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Região</CardTitle>
              <CardDescription>Distribuição de vendas por região geográfica</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="regiao" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toLocaleString("pt-BR")}`} />
                  <Bar dataKey="totalRevenue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regions.map((region: any) => (
              <Card key={region.regiao}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{region.regiao}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="text-lg font-bold">
                      R$ {(region.totalRevenue || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendas / Clientes / Representantes</p>
                    <p className="text-sm">{region.totalSales} / {region.uniqueClients} / {region.uniqueReps}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Representantes */}
        <TabsContent value="representatives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Representante</CardTitle>
              <CardDescription>Top representantes por volume de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reps.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="repName" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toLocaleString("pt-BR")}`} />
                  <Bar dataKey="totalRevenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reps.slice(0, 6).map((rep: any) => (
              <Card key={rep.representativeId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{rep.repName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="text-lg font-bold">
                      R$ {(rep.totalRevenue || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Vendas</p>
                      <p className="font-semibold">{rep.totalSales}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Desconto Médio</p>
                      <p className="font-semibold">{(rep.avgDiscount || 0).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clientes</p>
                      <p className="font-semibold">{rep.uniqueClients}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Produtos</p>
                      <p className="font-semibold">{rep.uniqueProducts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Clientes */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Clientes por Faturamento</CardTitle>
              <CardDescription>Maiores clientes em volume de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.slice(0, 10).map((client: any) => (
                  <div key={client.clientId} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{client.clientName}</p>
                      <p className="text-xs text-muted-foreground">{client.clientCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        R$ {(client.totalRevenue || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{client.totalSales} vendas</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produtos */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Produtos por Faturamento</CardTitle>
              <CardDescription>Produtos mais vendidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.slice(0, 10).map((product: any) => (
                  <div key={product.productId} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">{product.productCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        R$ {(product.totalRevenue || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{product.totalSales} vendas</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Clientes Inativos (6+ meses)
              </CardTitle>
              <CardDescription>
                {inactiveAlerts.data?.length || 0} clientes sem compras há mais de 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {inactiveAlerts.data?.slice(0, 20).map((alert: any) => (
                  <div key={alert.id} className="flex items-start justify-between border-b pb-2">
                    <div>
                      <p className="font-medium text-sm">{alert.clientName}</p>
                      <p className="text-xs text-muted-foreground">{alert.clientCode}</p>
                      <p className="text-xs text-orange-600 mt-1">
                        {alert.daysInactive} dias sem compra
                        {alert.repName && ` • Rep: ${alert.repName}`}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">
                        Última compra: {alert.lastPurchaseDate ? new Date(alert.lastPurchaseDate).toLocaleDateString("pt-BR") : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
