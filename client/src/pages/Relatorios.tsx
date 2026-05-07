import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecção",
  qualification: "Qualificação",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Ganho",
  lost: "Perdido",
};

export default function Relatorios() {
  const [regionFilter, setRegionFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const element = document.getElementById("relatorios-content");
      if (!element) {
        toast.error("Conteúdo não encontrado");
        return;
      }

      // Capturar o conteúdo como imagem
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Criar PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210 - 20; // A4 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      // Adicionar título
      pdf.setFontSize(16);
      pdf.text("Relatórios e Análises", 10, 8);
      pdf.setFontSize(10);
      pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 10, 15);
      position = 20;

      // Adicionar imagem ao PDF
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= 277; // A4 height

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= 277;
      }

      // Download
      pdf.save(`relatorios-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };
  const { data: regions } = trpc.regions.list.useQuery();
  const regionId = regionFilter !== "all" ? regions?.find(r => r.code === regionFilter)?.id : undefined;

  const { data: repPerformance } = trpc.reports.repPerformance.useQuery({ regionId });
  const { data: salesTrend } = trpc.dashboard.salesTrend.useQuery({ regionId });
  const { data: pipelineByStage } = trpc.dashboard.pipelineByStage.useQuery({ regionId });
  const { data: regionSummary } = trpc.dashboard.regionSummary.useQuery();
  const { data: clientSegmentation } = trpc.reports.clientSegmentation.useQuery({ regionId });

  const MONTH_NAMES_R = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const trendData = (salesTrend || []).map(s => ({
    month: MONTH_NAMES_R[(Number(s.month) - 1) % 12] || String(s.month),
    receita: Math.round(Number((s as any).revenue ?? (s as any).value ?? 0) / 1000),
    clientes: Number((s as any).clientsServed ?? (s as any).clientsCount ?? 0),
  }));

  const repData = (repPerformance || []).slice(0, 10).map(r => ({
    name: (r.name || "").split(" ")[0],
    score: r.performanceScore || 0,
    vendas: Math.round((r.totalSales || 0) / 1000),
    clientes: r.totalClients || 0,
  }));

  const pipelineData = (pipelineByStage || []).map(p => ({
    name: STAGE_LABELS[p.stage || ""] || p.stage || "",
    value: Number(p.count),
    amount: Math.round(Number(p.totalValue) / 1000),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionData = (regionSummary || []).filter((r: any) => r?.region?.code).map((r: any) => ({
    name: r.region.code,
    clientes: Number(r.clientCount ?? 0),
    representantes: Number(r.repCount ?? 0),
    receita: Math.round(Number(r.totalRevenue ?? 0) / 1000),
    oportunidades: Number(r.oppCount ?? 0),
  }));

  const segData = (clientSegmentation || []).map((s: { segment: string | null; count: number }, i: number) => ({
    name: s.segment || "Sem segmento",
    value: Number(s.count),
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios e Análises</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Análise completa de performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExportPDF} disabled={isExporting} className="gap-2 h-11">
            <Download className="h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
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
      </div>

      <div id="relatorios-content" className="space-y-6">

      <Tabs defaultValue="performance">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          <TabsTrigger value="vendas" className="text-xs">Vendas</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
          <TabsTrigger value="clientes" className="text-xs">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Score por Representante</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={repData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Score"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                      {repData.map((entry: { score: number }, i: number) => (
                        <Cell key={i} fill={entry.score >= 80 ? "#22c55e" : entry.score >= 60 ? "#f59e0b" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Vendas por Representante (R$ mil)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={repData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v: number) => [`R$ ${v}K`, "Vendas"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="vendas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparativo Regional</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend formatter={(v: string) => <span style={{ fontSize: 11 }}>{v}</span>} />
                  <Bar dataKey="clientes" name="Clientes" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="representantes" name="Representantes" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="oportunidades" name="Oportunidades" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tendência de Receita — 12 meses</CardTitle>
              <CardDescription>Receita mensal em R$ mil</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}K`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v}K`, "Receita"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorReceita)" dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita por Região (R$ mil)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}K`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v}K`, "Receita"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="receita" name="Receita" radius={[4, 4, 0, 0]}>
                    {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Oportunidades por Estágio</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pipelineData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`} labelLine={false}>
                      {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Valor por Estágio (R$ mil)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}K`} />
                    <Tooltip formatter={(v: number) => [`R$ ${v}K`, "Valor"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="amount" name="Valor" radius={[4, 4, 0, 0]}>
                      {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Segmentação de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={segData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}>
                      {segData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Clientes por Região</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="clientes" name="Clientes" radius={[4, 4, 0, 0]}>
                      {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
