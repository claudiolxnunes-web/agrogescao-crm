import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Brain, Loader2, RefreshCw, TrendingUp, Target, AlertTriangle,
  Users, MapPin, Lightbulb, CheckCircle, XCircle, Clock,
  BarChart2, Zap, Star, ArrowRight, Trophy
} from "lucide-react";
import { Streamdown } from "streamdown";

type AnalysisType = "all" | "coverage" | "goals" | "performance" | "recommendations";

interface QuickInsight {
  type: string;
  title: string;
  description: string;
  priority: string;
  region: string;
}

interface AnalysisResult {
  analysis: string;
  dataSnapshot: {
    totalReps: number;
    atRiskGoals: number;
    lowPerformers: number;
    pipelineValue: number;
  };
  generatedAt: string;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    critical: { label: "Crítico", cls: "bg-red-100 text-red-700 border-red-200" },
    high: { label: "Alto", cls: "bg-orange-100 text-orange-700 border-orange-200" },
    medium: { label: "Médio", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    low: { label: "Baixo", cls: "bg-green-100 text-green-700 border-green-200" },
  };
  const c = cfg[priority] ?? cfg.medium;
  return <Badge className={`text-xs border ${c.cls}`}>{c.label}</Badge>;
}

function InsightIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    success_pattern: <Star className="w-5 h-5 text-yellow-500" />,
    risk_alert: <AlertTriangle className="w-5 h-5 text-red-500" />,
    opportunity: <TrendingUp className="w-5 h-5 text-blue-500" />,
    recommendation: <Lightbulb className="w-5 h-5 text-purple-500" />,
    trend: <BarChart2 className="w-5 h-5 text-green-500" />,
  };
  return <>{icons[type] ?? <Brain className="w-5 h-5 text-gray-500" />}</>;
}

function fmt(v: number) {
  if (v >= 1000000) return "R$ " + (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return "R$ " + (v / 1000).toFixed(0) + "K";
  return "R$ " + v.toFixed(0);
}

export default function IAInsights() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("quick");

  const regionsQ = trpc.regions.list.useQuery();
  const quickQ = trpc.aiInsightsV2.quickInsights.useQuery(
    { regionId: selectedRegion !== "all" ? parseInt(selectedRegion) : undefined },
    { refetchOnWindowFocus: false }
  );
  const forecastQ = trpc.analytics.forecast.useQuery(
    { regionId: selectedRegion !== "all" ? parseInt(selectedRegion) : undefined },
    { refetchOnWindowFocus: false }
  );

  const analyzeMutation = trpc.aiInsightsV2.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data as AnalysisResult);
      setIsAnalyzing(false);
      toast.success("Análise IA concluída com sucesso!");
    },
    onError: (err) => {
      setIsAnalyzing(false);
      toast.error("Erro na análise: " + err.message);
    },
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setActiveTab("ai");
    analyzeMutation.mutate({
      regionId: selectedRegion !== "all" ? parseInt(selectedRegion) : undefined,
      analysisType,
    });
  };

  const regions = (regionsQ.data as Array<{ id: number; name: string; code: string }>) || [];
  const quick = quickQ.data;
  const forecast = forecastQ.data;

  const analysisLabels: Record<AnalysisType, string> = {
    all: "Análise Completa",
    coverage: "Cobertura de Área",
    goals: "Metas e Resultados",
    performance: "Desempenho por Representante",
    recommendations: "Recomendações Estratégicas",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-7 h-7 text-purple-600" />
              IA Insights
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Análises inteligentes com GPT-4.1-mini baseadas nos dados reais do CRM
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Regiões</SelectItem>
                {regions.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={analysisType} onValueChange={v => setAnalysisType(v as AnalysisType)}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Análise Completa</SelectItem>
                <SelectItem value="coverage">Cobertura de Área</SelectItem>
                <SelectItem value="goals">Metas e Resultados</SelectItem>
                <SelectItem value="performance">Desempenho por Rep.</SelectItem>
                <SelectItem value="recommendations">Recomendações</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
              ) : (
                <><Zap className="w-4 h-4" /> Gerar Análise IA</>
              )}
            </Button>
          </div>
        </div>

        {/* Forecast KPIs */}
        {forecast && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-50/50 border-purple-200">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Projeção 90 dias</p>
                <p className="text-2xl font-bold mt-1 text-purple-700">{fmt(Number(forecast.forecast90Days))}</p>
                <p className="text-xs text-gray-500 mt-0.5">Baseado no pipeline atual</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-50/50 border-green-200">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Taxa de Conversão</p>
                <p className="text-2xl font-bold mt-1 text-green-700">{Math.round(forecast.conversionRate * 100)}%</p>
                <p className="text-xs text-gray-500 mt-0.5">Média histórica</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Ciclo Médio</p>
                <p className="text-2xl font-bold mt-1 text-blue-700">{forecast.avgCycleDays} dias</p>
                <p className="text-xs text-gray-500 mt-0.5">Tempo até fechamento</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-50/50 border-orange-200">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Ticket Médio</p>
                <p className="text-2xl font-bold mt-1 text-orange-700">{fmt(forecast.avgTicket)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Por oportunidade</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick" className="gap-2">
              <Lightbulb className="w-4 h-4" /> Insights Rápidos
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Brain className="w-4 h-4" /> Análise IA
              {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="reps" className="gap-2">
              <Users className="w-4 h-4" /> Top Representantes
            </TabsTrigger>
          </TabsList>

          {/* Quick Insights Tab */}
          <TabsContent value="quick" className="space-y-4 mt-4">
            {quickQ.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {((quick?.insights as QuickInsight[]) || []).map((insight, i) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                            <InsightIcon type={insight.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-sm">{insight.title}</h3>
                              <PriorityBadge priority={insight.priority} />
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{insight.description}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                              <MapPin className="w-3 h-3" />
                              <span>{insight.region}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* High Value Opportunities */}
                {quick && (quick.highValueOpps as unknown[]).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Oportunidades de Alto Valor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(quick.highValueOpps as Array<{
                          id: number;
                          title: string;
                          value: number | null;
                          probability: number | null;
                          stage: string | null;
                          clientName: string | null;
                          repName: string | null;
                        }>).map((opp) => (
                          <div key={opp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{opp.title}</p>
                              <p className="text-xs text-gray-500">{opp.clientName} • {opp.repName}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className="text-sm font-bold text-green-700">{fmt(opp.value ?? 0)}</span>
                              <span className="text-xs text-gray-500">{opp.probability ?? 0}%</span>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* At Risk Goals */}
                {quick && (quick.atRiskGoals as unknown[]).length > 0 && (
                  <Card className="border-red-100">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        Metas em Risco
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(quick.atRiskGoals as Array<{
                          id: number;
                          period: string | null;
                          targetValue: number | null;
                          currentValue: number | null;
                          status: string | null;
                          regionName: string | null;
                        }>).map((goal) => {
                          const pct = goal.targetValue ? Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100) : 0;
                          return (
                            <div key={goal.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium text-sm">{goal.regionName ?? "Região"} — {goal.period}</p>
                                  <p className="text-xs text-gray-500">
                                    {fmt(goal.currentValue ?? 0)} / {fmt(goal.targetValue ?? 0)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-red-700">{pct}%</span>
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </div>
                              </div>
                              <div className="w-full h-2 bg-red-100 rounded-full">
                                <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* CTA to generate AI analysis */}
                <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <CardContent className="p-6 text-center">
                    <Brain className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                    <h3 className="font-bold text-lg mb-2">Análise Profunda com IA</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Gere uma análise detalhada com GPT-4.1-mini baseada nos dados reais do seu CRM.
                      Inclui cobertura de área, metas em risco, desempenho por representante e recomendações estratégicas.
                    </p>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-700 gap-2">
                      {isAnalyzing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Analisando dados...</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Gerar {analysisLabels[analysisType]}</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            {isAnalyzing ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <Brain className="w-16 h-16 text-purple-300" />
                      <Loader2 className="w-8 h-8 text-purple-600 animate-spin absolute -bottom-1 -right-1" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Analisando dados com GPT-4.1-mini...</h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Processando {analysisLabels[analysisType].toLowerCase()} dos dados do CRM
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-400 items-center">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Coletando dados de representantes, clientes e oportunidades...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : analysisResult ? (
              <div className="space-y-4">
                {/* Analysis metadata */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Gerado em {new Date(analysisResult.generatedAt).toLocaleString("pt-BR")}</span>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 ml-2">GPT-4.1-mini</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAnalyze} className="gap-2">
                    <RefreshCw className="w-3 h-3" /> Atualizar Análise
                  </Button>
                </div>

                {/* Data Snapshot */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{analysisResult.dataSnapshot.totalReps}</p>
                    <p className="text-xs text-blue-600">Representantes</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{analysisResult.dataSnapshot.atRiskGoals}</p>
                    <p className="text-xs text-red-600">Metas em Risco</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-700">{analysisResult.dataSnapshot.lowPerformers}</p>
                    <p className="text-xs text-orange-600">Baixa Performance</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{fmt(analysisResult.dataSnapshot.pipelineValue)}</p>
                    <p className="text-xs text-green-600">Pipeline Ativo</p>
                  </div>
                </div>

                {/* AI Analysis Content */}
                <Card className="border-purple-100">
                  <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      {analysisLabels[analysisType]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <Streamdown>{analysisResult.analysis}</Streamdown>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Brain className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="font-bold text-lg text-gray-600 mb-2">Nenhuma análise gerada ainda</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Clique em "Gerar Análise IA" para obter insights inteligentes baseados nos dados reais do CRM
                  </p>
                  <Button onClick={handleAnalyze} className="bg-purple-600 hover:bg-purple-700 gap-2">
                    <Zap className="w-4 h-4" /> Gerar Análise Agora
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Top Representatives Tab */}
          <TabsContent value="reps" className="space-y-4 mt-4">
            {quickQ.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Ranking de Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {((quick?.topReps as Array<{
                        id: number;
                        name: string;
                        performanceScore: number | null;
                        activeClients?: number | null;
                        totalSales?: number | null;
                      }>) || []).map((rep, idx) => (
                        <div key={rep.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                            idx === 0 ? "bg-yellow-400" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-orange-400" : "bg-blue-400"
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{rep.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-32">
                                <div
                                  className={`h-full rounded-full ${(rep.performanceScore ?? 0) >= 80 ? "bg-green-500" : (rep.performanceScore ?? 0) >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                                  style={{ width: `${rep.performanceScore ?? 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{rep.performanceScore ?? 0}%</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-green-700">{fmt(rep.totalSales ?? 0)}</p>
                            <p className="text-xs text-gray-500">{rep.activeClients ?? 0} clientes</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                            (rep.performanceScore ?? 0) >= 80 ? "bg-green-100 text-green-700" :
                            (rep.performanceScore ?? 0) >= 60 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {(rep.performanceScore ?? 0) >= 80 ? "Excelente" : (rep.performanceScore ?? 0) >= 60 ? "Regular" : "Atenção"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis CTA for performance */}
                <Card className="border-blue-100 bg-blue-50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Target className="w-10 h-10 text-blue-500 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Análise Detalhada de Performance</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Gere análise IA com pontos fortes, fracos e recomendações personalizadas para cada representante
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { setAnalysisType("performance"); handleAnalyze(); }}
                      disabled={isAnalyzing}
                      className="bg-blue-600 hover:bg-blue-700 shrink-0 gap-2"
                    >
                      {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Analisar
                    </Button>
                  </CardContent>
                </Card>

                {/* Coverage Analysis CTA */}
                <Card className="border-green-100 bg-green-50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <MapPin className="w-10 h-10 text-green-500 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Análise de Cobertura Geográfica</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Identifique regiões sub-atendidas, concentração de clientes e oportunidades de expansão
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { setAnalysisType("coverage"); handleAnalyze(); }}
                      disabled={isAnalyzing}
                      className="bg-green-600 hover:bg-green-700 shrink-0 gap-2"
                    >
                      {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Analisar
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
