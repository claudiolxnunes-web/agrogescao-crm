import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Info, FileText, Database, X, Sparkles, CheckCheck, AlertTriangle, Trash2, TrendingUp, Package, Users, ShoppingCart, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type ImportStatus = "idle" | "analyzing" | "mapping" | "processing" | "success" | "error";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
};

type AnalysisResult = {
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  mapping: Record<string, string | null>;
  confidence: string;
  aiNotes: string;
  availableFields: Array<{ field: string; label: string; required?: boolean }>;
};

// ============================================================
// Faturamento Import State Types
// ============================================================
type FaturamentoStatus = "idle" | "processing" | "success" | "error";

type FaturamentoResult = {
  totalRows: number;
  clients: { created: number; skipped: number };
  representatives: { created: number; skipped: number };
  products: { created: number; skipped: number };
  invoices: { created: number; skipped: number };
  openOrders: { created: number; skipped: number };
  message: string;
  errors?: string[];
};

const TEMPLATES = [
  {
    name: "Clientes",
    description: "Importar fazendas de ruminantes, fábricas de ração e revendas",
    fields: ["nome", "tipo", "cnpj", "estado", "cidade", "representante", "potencial"],
    icon: Database,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-900/20",
    importType: "clients" as const,
  },
  {
    name: "Representantes",
    description: "Importar representantes comerciais — usa código como chave (upsert)",
    fields: ["codigo", "nome", "email", "telefone", "estado", "regiao"],
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    importType: "representatives" as const,
  },
  {
    name: "Histórico de Vendas",
    description: "Importar dados de vendas realizadas",
    fields: ["cliente", "representante", "produto", "quantidade", "valor", "data", "região"],
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    importType: "purchases" as const,
  },
  {
    name: "Pedidos em Aberto",
    description: "Importar arquivo de tracking de pedidos (data__72_ formato)",
    fields: ["pedido", "cliente", "produto", "representante", "valor", "volume", "status"],
    icon: ClipboardList,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    importType: "openOrders" as const,
  },
];

export default function Importacao() {
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedType, setSelectedType] = useState("Clientes");
  const [fileBase64, setFileBase64] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearConfirmPhrase, setClearConfirmPhrase] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Faturamento/Vendas state
  const [fatStatus, setFatStatus] = useState<FaturamentoStatus>("idle");
  const [fatResult, setFatResult] = useState<FaturamentoResult | null>(null);
  const [fatFileName, setFatFileName] = useState("");
  const fatFileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const analyzeFileMutation = trpc.import.analyzeFile.useMutation();
  const importClientsMutation = trpc.import.importClients.useMutation();
  const importPurchasesMutation = trpc.import.importPurchases.useMutation();
  const importRepsMutation = importClientsMutation;
  const clearDatabaseMutation = trpc.admin.clearDatabase.useMutation();
  const importFaturamentoMutation = trpc.importFaturamento.importFaturamento.useMutation();

  const template = TEMPLATES.find(t => t.name === selectedType);
  const importType = (template?.importType || "clients") as "clients" | "purchases" | "representatives" | "openOrders";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Formato inválido. Use CSV, XLSX ou XLS");
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(",")[1] || "";
      setFileBase64(base64);
      setFileName(file.name);

      // Analyze file
      setImportStatus("analyzing");
    try {
  const result = await analyzeFileMutation.mutateAsync({
    fileBase64: base64,
    fileName: file.name,
    importType: importType === "purchases" ? "purchases" : "clients",
  });

  setAnalysis(result);
        setMapping(result.mapping);
        setImportStatus("mapping");
        setShowMappingDialog(true);
      } catch (error: any) {
        toast.error(`Erro ao analisar arquivo: ${error.message}`);
        setImportStatus("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmMapping = async () => {
    if (!analysis) return;

    setShowMappingDialog(false);
    setImportStatus("processing");
    setProgress(0);

    try {
      let importResult;
      if (importType === "purchases") {
        importResult = await importPurchasesMutation.mutateAsync({
          fileBase64,
          fileName,
          mapping,
        });
      } else if (importType === "representatives") {
        // Usa Faturamento router que já faz upsert de representantes
        const fatResult = await importFaturamentoMutation.mutateAsync({ fileBase64, fileName });
        importResult = {
          imported: fatResult.summary?.representatives?.created ?? 0,
          skipped: fatResult.summary?.representatives?.skipped ?? 0,
          errors: [],
          total: (fatResult.summary?.representatives?.created ?? 0) + (fatResult.summary?.representatives?.skipped ?? 0),
        };
      } else if (importType === "openOrders") {
        // Usa Faturamento router que detecta pedidos sem NF automaticamente
        const fatResult = await importFaturamentoMutation.mutateAsync({ fileBase64, fileName });
        importResult = {
          imported: fatResult.summary?.openOrders?.created ?? 0,
          skipped: fatResult.summary?.openOrders?.skipped ?? 0,
          errors: [],
          total: (fatResult.summary?.openOrders?.created ?? 0) + (fatResult.summary?.openOrders?.skipped ?? 0),
        };
      } else {
        importResult = await importClientsMutation.mutateAsync({
          fileBase64,
          fileName,
          mapping,
          defaultType: "fazenda_ruminantes",
        });
      }

      setProgress(100);
      setImportStatus("success");
      setResult(importResult);
      toast.success("Importação concluída com sucesso!");

      // Atualizar automaticamente todas as listas relevantes
      void utils.clients.list.invalidate();
      void utils.dashboard.kpis.invalidate();
      void utils.dashboard.salesTrend.invalidate();
      void utils.dashboard.repRanking.invalidate();
      void utils.dashboard.pipelineByStage.invalidate();
      void utils.dashboard.regionSummary.invalidate();
      void utils.purchasesData.list.invalidate();
      void utils.opportunities.list.invalidate();
      void utils.analytics.forecast.invalidate();
      void utils.analytics.conversionFunnel.invalidate();
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
      setImportStatus("error");
    }
  };

  const downloadTemplate = (type: string) => {
    const template = TEMPLATES.find(t => t.name === type);
    if (!template) return;

    const headers = template.fields.join(",");
    const example = template.fields.map(f => `exemplo_${f}`).join(",");
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template_${type.toLowerCase().replace(" ", "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Template de ${type} baixado!`);
  };

  const resetImport = () => {
    setImportStatus("idle");
    setResult(null);
    setAnalysis(null);
    setMapping({});
    setFileBase64("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" />
          Importação de Dados
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Importe clientes, vendas e representantes via CSV, XLSX ou XLS — sem limite de registros
        </p>
      </div>

      <Tabs value={selectedType} onValueChange={(v) => { setSelectedType(v); resetImport(); }}>
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          {TEMPLATES.map(t => (
            <TabsTrigger key={t.name} value={t.name}>{t.name}</TabsTrigger>
          ))}
          <TabsTrigger value="Faturamento/Vendas">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Faturamento/Vendas
          </TabsTrigger>
        </TabsList>

        {/* Aba Faturamento/Vendas */}
        <TabsContent value="Faturamento/Vendas" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Upload Area */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  Importar Faturamento / Vendas
                </CardTitle>
                <CardDescription>
                  Importa automaticamente clientes, representantes, produtos e vendas a partir da planilha de faturamento. Duplicatas são ignoradas automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fatStatus === "idle" && (
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors"
                    onClick={() => fatFileRef.current?.click()}
                  >
                    <div className="h-14 w-14 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="h-7 w-7 text-orange-600" />
                    </div>
                    <p className="font-semibold text-sm">Clique para selecionar a planilha de faturamento</p>
                    <p className="text-xs text-muted-foreground mt-1">XLSX ou XLS — Planilha com cabeçalhos: Nota Fiscal, Cód. Cliente, Nome do Cliente, Cód. Produto, etc.</p>
                    <input
                      ref={fatFileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setFatFileName(file.name);
                        setFatStatus("processing");
                        setFatResult(null);
                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                          const base64 = (evt.target?.result as string).split(",")[1] || "";
                          try {
                            const res = await importFaturamentoMutation.mutateAsync({ fileBase64: base64, fileName: file.name });
                            setFatResult(res.summary ? { ...res.summary, message: res.message, errors: res.errors } : null);
                            setFatStatus("success");
                            toast.success(res.message);
                            // Invalidar queries relevantes
                            void utils.clients.list.invalidate();
                            void utils.dashboard.kpis.invalidate();
                            void utils.dashboard.salesTrend.invalidate();
                            void utils.dashboard.repRanking.invalidate();
                            void utils.importFaturamento.listInvoices.invalidate();
                            void utils.importFaturamento.listProducts.invalidate();
                            void utils.importFaturamento.listOpenOrders.invalidate();
                          } catch (err: any) {
                            toast.error(`Erro na importação: ${err.message}`);
                            setFatStatus("error");
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                )}

                {fatStatus === "processing" && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="h-12 w-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                    <div className="text-center">
                      <p className="font-semibold text-sm">Processando planilha...</p>
                      <p className="text-xs text-muted-foreground mt-1">Cadastrando clientes, representantes, produtos e vendas</p>
                    </div>
                  </div>
                )}

                {fatStatus === "success" && fatResult && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold text-sm">Importação concluída com sucesso!</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{fatResult.message}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-lg font-bold">{fatResult.totalRows}</p>
                        <p className="text-xs text-muted-foreground">Total linhas</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                        <Users className="h-4 w-4 text-green-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-green-600">{fatResult.clients.created}</p>
                        <p className="text-xs text-muted-foreground">Clientes novos</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                        <Package className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-blue-600">{fatResult.products.created}</p>
                        <p className="text-xs text-muted-foreground">Produtos novos</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                        <ShoppingCart className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-orange-600">{fatResult.invoices.created}</p>
                        <p className="text-xs text-muted-foreground">Vendas importadas</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                        <ClipboardList className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-purple-600">{fatResult.openOrders.created}</p>
                        <p className="text-xs text-muted-foreground">Pedidos abertos</p>
                      </div>
                    </div>

                    {/* Detalhes de duplicatas ignoradas */}
                    <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                      <p className="font-semibold text-muted-foreground">Duplicatas ignoradas:</p>
                      <div className="grid grid-cols-2 gap-1">
                        <span>Clientes: {fatResult.clients.skipped}</span>
                        <span>Representantes: {fatResult.representatives.skipped}</span>
                        <span>Produtos: {fatResult.products.skipped}</span>
                        <span>Vendas: {fatResult.invoices.skipped}</span>
                      </div>
                    </div>

                    {fatResult.errors && fatResult.errors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400">Erros ({fatResult.errors.length})</p>
                        {fatResult.errors.map((e, i) => (
                          <p key={i} className="text-xs text-red-700 dark:text-red-400">• {e}</p>
                        ))}
                      </div>
                    )}

                    <Button variant="outline" size="sm" onClick={() => { setFatStatus("idle"); setFatResult(null); setFatFileName(""); if (fatFileRef.current) fatFileRef.current.value = ""; }}>
                      Nova Importação
                    </Button>
                  </div>
                )}

                {fatStatus === "error" && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <p className="font-semibold text-sm">Erro na importação</p>
                    <Button variant="outline" size="sm" onClick={() => { setFatStatus("idle"); if (fatFileRef.current) fatFileRef.current.value = ""; }}>
                      Tentar novamente
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    O que é importado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Users className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Clientes</strong>: Cód., Nome, Categoria, Município, UF, Região</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Representantes</strong>: Cód. RC, Nome</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package className="h-3.5 w-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Produtos</strong>: Cód., Nome, Grupo, Solução, Linha</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShoppingCart className="h-3.5 w-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Vendas</strong>: NF, Pedido, Qtd, Preço, Faturamento, Margens, Comissão</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ClipboardList className="h-3.5 w-3.5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Pedidos em aberto</strong>: Linhas sem Nota Fiscal</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCheck className="h-4 w-4 text-green-600" />
                    Controle de duplicidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>✓ Clientes: por Cód. Cliente</p>
                  <p>✓ Representantes: por Cód. RC</p>
                  <p>✓ Produtos: por Cód. Produto</p>
                  <p>✓ Vendas: por NF + Cód. Cliente + Cód. Produto</p>
                  <p className="text-green-600 font-medium mt-1">Registros duplicados são ignorados automaticamente</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {TEMPLATES.map(template => {
          const Icon = template.icon;
          return (
            <TabsContent key={template.name} value={template.name} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Upload Area */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Importar {template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Drop Zone */}
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      <div className={`h-14 w-14 rounded-xl ${template.bg} flex items-center justify-center mx-auto mb-3`}>
                        <Icon className={`h-7 w-7 ${template.color}`} />
                      </div>
                      <p className="font-semibold text-sm">Clique para selecionar arquivo</p>
                      <p className="text-xs text-muted-foreground mt-1">CSV, XLSX ou XLS — sem limite de tamanho</p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={importStatus !== "idle" && importStatus !== "success" && importStatus !== "error"}
                      />
                    </div>

                    {/* Progress */}
                    {importStatus === "processing" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Processando...</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    {/* Result */}
                    {importStatus === "success" && result && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-semibold text-sm">Importação concluída!</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-xl font-bold">{result.total}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-green-600">{result.imported}</p>
                            <p className="text-xs text-muted-foreground">Importados</p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-red-600">{result.skipped}</p>
                            <p className="text-xs text-muted-foreground">Erros</p>
                          </div>
                        </div>
                        {result.errors.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                            <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Erros ({result.errors.length})
                            </p>
                            {result.errors.map((e, i) => (
                              <p key={i} className="text-xs text-red-700 dark:text-red-400">• {e}</p>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetImport}
                        >
                          Nova Importação
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Template Info */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Download className="h-4 w-4 text-primary" />
                        Template
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Baixe o template com os campos necessários
                      </p>
                      <div className="space-y-1">
                        {template.fields.map(f => (
                          <div key={f} className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-xs font-mono text-muted-foreground">{f}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => downloadTemplate(template.name)}
                      >
                        <Download className="h-4 w-4" />
                        Baixar Template
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        Informações
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs text-muted-foreground">
                      <p>✓ Sem limite de registros</p>
                      <p>✓ Processamento em lotes</p>
                      <p>✓ Mapeamento inteligente via IA</p>
                      <p>✓ Preview antes de importar</p>
                      <p>✓ Ajuste manual de colunas</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Zona Perigosa - Limpar Base de Dados */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona Perigosa
          </CardTitle>
          <CardDescription>
            Ações irreversíveis que afetam toda a base de dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div>
              <p className="font-semibold text-sm">Limpar Base de Dados</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Remove todos os clientes, oportunidades, metas, atividades e histórico de vendas. Usuários e configurações são mantidos.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="ml-4 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação para limpar base */}
      <Dialog open={showClearDialog} onOpenChange={(open) => { setShowClearDialog(open); if (!open) setClearConfirmPhrase(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Limpeza da Base de Dados
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os registros de clientes, oportunidades, metas, atividades, compras e histórico de vendas serão permanentemente apagados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-destructive">Para confirmar, digite exatamente:</p>
              <p className="text-sm font-mono font-bold mt-1">LIMPAR TUDO</p>
            </div>
            <input
              type="text"
              value={clearConfirmPhrase}
              onChange={(e) => setClearConfirmPhrase(e.target.value)}
              placeholder="Digite LIMPAR TUDO para confirmar"
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowClearDialog(false); setClearConfirmPhrase(""); }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={clearConfirmPhrase !== "LIMPAR TUDO" || clearDatabaseMutation.isPending}
                onClick={() => {
                  clearDatabaseMutation.mutate({ confirmPhrase: clearConfirmPhrase }, {
                    onSuccess: (data) => {
                      toast.success(data.message);
                      setShowClearDialog(false);
                      setClearConfirmPhrase("");
                      // Invalidar todas as queries
                      void utils.clients.list.invalidate();
                      void utils.opportunities.list.invalidate();
                      void utils.dashboard.kpis.invalidate();
                      void utils.dashboard.salesTrend.invalidate();
                      void utils.dashboard.repRanking.invalidate();
                      void utils.dashboard.pipelineByStage.invalidate();
                      void utils.dashboard.regionSummary.invalidate();
                      void utils.purchasesData.list.invalidate();
                      void utils.analytics.forecast.invalidate();
                      void utils.analytics.conversionFunnel.invalidate();
                    },
                    onError: (error) => {
                      toast.error(`Erro: ${error.message}`);
                    },
                  });
                }}
              >
                {clearDatabaseMutation.isPending ? "Limpando..." : "Confirmar e Limpar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mapping Dialog */}
      {showMappingDialog && analysis && (() => {
        // Calcular estatísticas do mapeamento
        const mappedCount = Object.values(mapping).filter(v => v !== null).length;
        const totalHeaders = analysis.headers.length;
        const requiredFields = analysis.availableFields.filter(f => f.required).map(f => f.field);
        const mappedRequiredFields = requiredFields.filter(rf => Object.values(mapping).includes(rf));
        const missingRequired = requiredFields.filter(rf => !Object.values(mapping).includes(rf));
        const confidenceColor = analysis.confidence === "high" ? "text-green-600" : analysis.confidence === "medium" ? "text-yellow-600" : "text-red-600";
        const confidenceBg = analysis.confidence === "high" ? "bg-green-50 border-green-200 dark:bg-green-900/20" : analysis.confidence === "medium" ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20" : "bg-red-50 border-red-200 dark:bg-red-900/20";

        return (
          <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Mapeamento de Colunas — Revise e Confirme
                </DialogTitle>
                <DialogDescription>
                  A IA analisou seu arquivo e sugeriu o mapeamento abaixo. Ajuste qualquer coluna antes de importar.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Resumo IA */}
                <div className={`rounded-lg p-3 border space-y-2 ${confidenceBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className={`h-4 w-4 ${confidenceColor}`} />
                      <span className="text-xs font-semibold">Análise da IA</span>
                      <Badge variant="outline" className={`text-xs ${confidenceColor}`}>
                        Confiânça: {analysis.confidence === "high" ? "Alta" : analysis.confidence === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{fileName} &bull; {analysis.totalRows} registros</span>
                  </div>
                  {analysis.aiNotes && (
                    <p className="text-xs text-muted-foreground italic">{analysis.aiNotes}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                      <span>{mappedCount} de {totalHeaders} colunas mapeadas</span>
                    </span>
                    {missingRequired.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Campo obrigatório ausente: {missingRequired.map(rf => analysis.availableFields.find(f => f.field === rf)?.label || rf).join(", ")}</span>
                      </span>
                    )}
                    {missingRequired.length === 0 && mappedRequiredFields.length > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Campos obrigatórios mapeados</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview dos dados (primeiras linhas)</p>
                  <div className="bg-muted rounded-lg p-3 overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="border-b">
                          {analysis.headers.map(h => (
                            <th key={h} className="text-left px-2 py-1 font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.sampleRows.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            {analysis.headers.map(h => (
                              <td key={h} className="px-2 py-1 truncate max-w-[150px] text-muted-foreground">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mapeamento interativo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mapeamento de colunas</p>
                    <p className="text-xs text-muted-foreground">Coluna do arquivo → Campo do sistema</p>
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {analysis.headers.map(header => {
                      const isMapped = mapping[header] !== null && mapping[header] !== undefined;
                      const mappedField = analysis.availableFields.find(f => f.field === mapping[header]);
                      const isRequired = mappedField?.required;
                      return (
                        <div key={header} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                          isMapped
                            ? isRequired
                              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                              : "bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30"
                            : "bg-muted/50 border-transparent"
                        }`}>
                          {/* Status icon */}
                          <div className="flex-shrink-0 w-4">
                            {isMapped ? (
                              <CheckCircle className={`h-3.5 w-3.5 ${isRequired ? "text-green-600" : "text-blue-500"}`} />
                            ) : (
                              <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                          </div>
                          {/* Nome da coluna do arquivo */}
                          <span className="text-xs font-mono bg-background/80 px-2 py-0.5 rounded border flex-shrink-0 max-w-[160px] truncate" title={header}>
                            {header}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">→</span>
                          {/* Select de campo destino */}
                          <Select
                            value={mapping[header] ?? "__NONE__"}
                            onValueChange={(value) => setMapping({ ...mapping, [header]: value === "__NONE__" ? null : value })}
                          >
                            <SelectTrigger className="flex-1 h-7 text-xs">
                              <SelectValue placeholder="Não mapear" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__NONE__">Não mapear (ignorar coluna)</SelectItem>
                              {analysis.availableFields.map(field => (
                                <SelectItem key={field.field} value={field.field}>
                                  {field.label}{field.required ? " *" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">* Campo obrigatório &bull; Colunas sem mapeamento serão ignoradas na importação</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-between items-center pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {mappedCount} coluna{mappedCount !== 1 ? "s" : ""} serão importadas
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowMappingDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirmMapping}
                      disabled={importClientsMutation.isPending || importPurchasesMutation.isPending || missingRequired.length > 0}
                      title={missingRequired.length > 0 ? `Mapeie o campo obrigatório: ${missingRequired.join(", ")}` : undefined}
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Confirmar e Importar
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
