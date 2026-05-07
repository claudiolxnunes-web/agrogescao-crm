import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, DollarSign, Package, Users, FileText,
  ChevronLeft, BarChart3, ShoppingCart, AlertCircle
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────
function fmtBRL(val: number | null | undefined): string {
  if (val == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}
function fmtNum(val: number | null | undefined, decimals = 0): string {
  if (val == null) return "0";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
}
function fmtPct(val: number | null | undefined): string {
  if (val == null) return "0,0%";
  return `${fmtNum(val, 1)}%`;
}

// ── Componente principal ────────────────────────────────────────
export default function Vendas() {
  const [selectedMesAno, setSelectedMesAno] = useState<string>("__all__");
  const [selectedRep, setSelectedRep] = useState<string>("__all__");
  const [selectedTipo, setSelectedTipo] = useState<string>("__all__");
  const [selectedUF, setSelectedUF] = useState<string>("__all__");
  const [detailRepCode, setDetailRepCode] = useState<string | null>(null);
  const [detailRepName, setDetailRepName] = useState<string>("");
  const [detailTab, setDetailTab] = useState<"client" | "product" | "invoice">("client");

  const filters = {
    mesAno: selectedMesAno !== "__all__" ? selectedMesAno : undefined,
    repCode: selectedRep !== "__all__" ? selectedRep : undefined,
    tipoOperacao: selectedTipo !== "__all__" ? selectedTipo : undefined,
  };

  const { data: filterOptions, isLoading: loadingFilters } = trpc.vendas.getFilterOptions.useQuery();
  const { data: totals, isLoading: loadingTotals } = trpc.vendas.getTotals.useQuery(filters);
  const { data: byRep, isLoading: loadingByRep } = trpc.vendas.getByRepresentative.useQuery(filters);
  const { data: byProduct, isLoading: loadingByProduct } = trpc.vendas.getByProduct.useQuery(filters);
  const { data: byUF, isLoading: loadingByUF } = trpc.vendas.getByUF.useQuery(filters);
  const { data: ufOptions } = trpc.vendas.getUFOptions.useQuery();
  const { data: monthly, isLoading: loadingMonthly } = trpc.vendas.getMonthlyEvolution.useQuery({
    repCode: filters.repCode,
    tipoOperacao: filters.tipoOperacao,
  });

  // Detalhamento por representante
  const { data: detailData, isLoading: loadingDetail } = trpc.vendas.getDetailByRep.useQuery(
    { repCode: detailRepCode ?? "", mesAno: filters.mesAno, tipoOperacao: filters.tipoOperacao, groupBy: detailTab },
    { enabled: !!detailRepCode }
  );

  // Pedidos em aberto
  const { data: openOrders, isLoading: loadingOpenOrders } = trpc.vendas.getOpenOrders.useQuery({
    repCode: filters.repCode,
  });

  const totalFaturamento = Number(totals?.totalFaturamento ?? 0);
  const totalVolume = Number(totals?.totalVolume ?? 0);
  const totalQtd = Number(totals?.totalQtdSacos ?? 0);
  const totalNFs = Number(totals?.totalNFs ?? 0);
  const totalClientes = Number(totals?.totalClientes ?? 0);
  const totalReps = Number(totals?.totalRepresentantes ?? 0);
  const mediaMb = Number(totals?.mediaMbCbPct ?? 0);

  // ── Vista de detalhamento ────────────────────────────────────
  if (detailRepCode) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetailRepCode(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{detailRepName}</h1>
            <p className="text-sm text-muted-foreground">Detalhamento de vendas do representante</p>
          </div>
        </div>

        <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as any)}>
          <TabsList>
            <TabsTrigger value="client">Por Cliente</TabsTrigger>
            <TabsTrigger value="product">Por Produto</TabsTrigger>
            <TabsTrigger value="invoice">Notas Fiscais</TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Vendas por Cliente</CardTitle></CardHeader>
              <CardContent className="p-0">
                {loadingDetail ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                        <TableHead className="text-right">Volume (t)</TableHead>
                        <TableHead className="text-right">Qtd Sacos</TableHead>
                        <TableHead className="text-right">NFs</TableHead>
                        <TableHead className="text-right">MB%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detailData as any[])?.map((row: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">{row.clientCode}</TableCell>
                          <TableCell className="font-medium">{row.clientName}</TableCell>
                          <TableCell className="text-right font-mono">{fmtBRL(row.totalFaturamento)}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.totalVolume, 1)}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.totalQtdSacos)}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.totalNFs)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Number(row.mediaMbCbPct) >= 20 ? "default" : "secondary"}>
                              {fmtPct(row.mediaMbCbPct)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!detailData || (detailData as any[]).length === 0) && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum dado encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="product" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Vendas por Produto</CardTitle></CardHeader>
              <CardContent className="p-0">
                {loadingDetail ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                        <TableHead className="text-right">Volume (t)</TableHead>
                        <TableHead className="text-right">Qtd Sacos</TableHead>
                        <TableHead className="text-right">Clientes</TableHead>
                        <TableHead className="text-right">MB%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detailData as any[])?.map((row: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">{row.productCode}</TableCell>
                          <TableCell className="font-medium">{row.productName}</TableCell>
                          <TableCell className="text-right font-mono">{fmtBRL(row.totalFaturamento)}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.totalVolume, 1)}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.totalQtdSacos)}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.totalClientes)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Number(row.mediaMbCbPct) >= 20 ? "default" : "secondary"}>
                              {fmtPct(row.mediaMbCbPct)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!detailData || (detailData as any[]).length === 0) && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum dado encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Notas Fiscais</CardTitle></CardHeader>
              <CardContent className="p-0">
                {loadingDetail ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NF</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                        <TableHead className="text-right">MB%</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detailData as any[])?.map((row: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.invoiceNumber}</TableCell>
                          <TableCell className="text-xs">{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("pt-BR") : "-"}</TableCell>
                          <TableCell className="text-sm">{row.clientName}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{row.productName}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.qtdSacos)}</TableCell>
                          <TableCell className="text-right font-mono">{fmtBRL(row.faturamentoRealizado)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Number(row.mbCbPct) >= 20 ? "default" : "secondary"}>
                              {fmtPct(row.mbCbPct)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{row.tipoOperacao}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!detailData || (detailData as any[]).length === 0) && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum dado encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── Vista principal ──────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Vendas & Faturamento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Análise completa de faturamento por representante, produto e período</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedMesAno} onValueChange={setSelectedMesAno}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mês/Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os períodos</SelectItem>
              {filterOptions?.meses?.map((m) => (
                <SelectItem key={m.mesAno!} value={m.mesAno!}>{m.mesAno}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRep} onValueChange={setSelectedRep}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Representante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os representantes</SelectItem>
              {filterOptions?.reps?.map((r) => (
                <SelectItem key={r.repCode!} value={r.repCode!}>{r.repName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTipo} onValueChange={setSelectedTipo}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os tipos</SelectItem>
              {filterOptions?.tiposOp?.map((t) => (
                <SelectItem key={t.tipoOperacao!} value={t.tipoOperacao!}>{t.tipoOperacao}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(selectedMesAno !== "__all__" || selectedRep !== "__all__" || selectedTipo !== "__all__") && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedMesAno("__all__"); setSelectedRep("__all__"); setSelectedTipo("__all__"); }}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Faturamento</span>
            </div>
            {loadingTotals ? <Skeleton className="h-7 w-full" /> : (
              <p className="text-xl font-bold text-green-600">{fmtBRL(totalFaturamento)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Volume (t)</span>
            </div>
            {loadingTotals ? <Skeleton className="h-7 w-full" /> : (
              <p className="text-xl font-bold text-blue-600">{fmtNum(totalVolume, 1)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Qtd Sacos</span>
            </div>
            {loadingTotals ? <Skeleton className="h-7 w-full" /> : (
              <p className="text-xl font-bold text-purple-600">{fmtNum(totalQtd)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Notas Fiscais</span>
            </div>
            {loadingTotals ? <Skeleton className="h-7 w-full" /> : (
              <p className="text-xl font-bold text-orange-600">{fmtNum(totalNFs)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-teal-600" />
              <span className="text-xs text-muted-foreground">Clientes</span>
            </div>
            {loadingTotals ? <Skeleton className="h-7 w-full" /> : (
              <p className="text-xl font-bold text-teal-600">{fmtNum(totalClientes)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <span className="text-xs text-muted-foreground">Margem MB%</span>
            </div>
            {loadingTotals ? <Skeleton className="h-7 w-full" /> : (
              <p className="text-xl font-bold text-indigo-600">{fmtPct(mediaMb)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="representantes">
        <TabsList className="mb-4">
          <TabsTrigger value="representantes">Por Vendedor</TabsTrigger>
          <TabsTrigger value="produtos">Por Produto</TabsTrigger>
          <TabsTrigger value="estados">Por Estado</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução Mensal</TabsTrigger>
          <TabsTrigger value="pedidos">
            Pedidos em Aberto
            {openOrders && openOrders.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{openOrders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Por Representante ── */}
        <TabsContent value="representantes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Faturamento por Representante
                <span className="text-xs text-muted-foreground font-normal ml-1">— clique para ver detalhes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingByRep ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Representante</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Volume (t)</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Qtd Sacos</TableHead>
                      <TableHead className="text-right hidden md:table-cell">NFs</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Clientes</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Produtos</TableHead>
                      <TableHead className="text-right">MB%</TableHead>
                      <TableHead className="text-right hidden xl:table-cell">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byRep?.map((row, i) => {
                      const fat = Number(row.totalFaturamento);
                      const maxFat = Number(byRep[0]?.totalFaturamento ?? 1);
                      const pct = maxFat > 0 ? (fat / maxFat) * 100 : 0;
                      return (
                        <TableRow
                          key={row.repCode}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => { setDetailRepCode(row.repCode!); setDetailRepName(row.repName ?? row.repCode ?? ""); }}
                        >
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.repName}</p>
                              <p className="text-xs text-muted-foreground">{row.repCode}</p>
                              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-[120px]">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-700">{fmtBRL(fat)}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{fmtNum(row.totalVolume, 1)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">{fmtNum(row.totalQtdSacos)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">{fmtNum(row.totalNFs)}</TableCell>
                          <TableCell className="text-right hidden lg:table-cell">{fmtNum(row.totalClientes)}</TableCell>
                          <TableCell className="text-right hidden lg:table-cell">{fmtNum(row.totalProdutos)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Number(row.mediaMbCbPct) >= 20 ? "default" : "secondary"}>
                              {fmtPct(row.mediaMbCbPct)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right hidden xl:table-cell text-muted-foreground">{fmtBRL(row.totalComissao)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(!byRep || byRep.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum dado de vendas encontrado.</p>
                          <p className="text-xs mt-1">Importe uma planilha de faturamento na aba "Importar Dados".</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Por Estado (UF) ── */}
        <TabsContent value="estados">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Faturamento por Estado (UF)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingByUF ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : byUF && byUF.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Estado (UF)</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Volume (t)</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Qtd Sacos</TableHead>
                      <TableHead className="text-right hidden md:table-cell">NFs</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Clientes</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Representantes</TableHead>
                      <TableHead className="text-right">MB%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byUF.map((row, i) => {
                      const fat = Number(row.totalFaturamento);
                      const maxFat = Number(byUF[0]?.totalFaturamento ?? 1);
                      const pct = maxFat > 0 ? (fat / maxFat) * 100 : 0;
                      return (
                        <TableRow key={row.uf ?? i}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-bold text-base">{row.uf}</p>
                              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-[120px]">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-700">{fmtBRL(fat)}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{fmtNum(row.totalVolume, 1)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">{fmtNum(row.totalQtdSacos)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">{fmtNum(row.totalNFs)}</TableCell>
                          <TableCell className="text-right hidden lg:table-cell">{fmtNum(row.totalClientes)}</TableCell>
                          <TableCell className="text-right hidden lg:table-cell">{fmtNum(row.totalRepresentantes)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Number(row.mediaMbCbPct) >= 20 ? "default" : "secondary"}>
                              {fmtPct(row.mediaMbCbPct)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum dado por estado encontrado.</p>
                  <p className="text-xs mt-1">Importe uma planilha com a coluna UF preenchida.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Por Produto ── */}
        <TabsContent value="produtos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Faturamento por Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingByProduct ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Volume (t)</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Qtd Sacos</TableHead>
                      <TableHead className="text-right hidden md:table-cell">NFs</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Clientes</TableHead>
                      <TableHead className="text-right">MB%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byProduct?.map((row, i) => {
                      const fat = Number(row.totalFaturamento);
                      const maxFat = Number(byProduct[0]?.totalFaturamento ?? 1);
                      const pct = maxFat > 0 ? (fat / maxFat) * 100 : 0;
                      return (
                        <TableRow key={row.productCode ?? i}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{row.productName}</p>
                              <p className="text-xs text-muted-foreground">{row.productCode}</p>
                              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-[120px]">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-700">{fmtBRL(fat)}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{fmtNum(row.totalVolume, 1)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">{fmtNum(row.totalQtdSacos)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">{fmtNum(row.totalNFs)}</TableCell>
                          <TableCell className="text-right hidden lg:table-cell">{fmtNum(row.totalClientes)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Number(row.mediaMbCbPct) >= 20 ? "default" : "secondary"}>
                              {fmtPct(row.mediaMbCbPct)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!byProduct || byProduct.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum dado de produtos encontrado.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Evolução Mensal ── */}
        <TabsContent value="evolucao">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Evolução Mensal de Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMonthly ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : monthly && monthly.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    const maxFat = Math.max(...monthly.map(m => Number(m.totalFaturamento)));
                    return monthly.map((m, i) => {
                      const fat = Number(m.totalFaturamento);
                      const pct = maxFat > 0 ? (fat / maxFat) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-sm font-mono w-20 text-muted-foreground shrink-0">{m.mesAno}</span>
                          <div className="flex-1 h-7 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-primary rounded flex items-center px-2 transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            >
                              {pct > 15 && <span className="text-xs text-primary-foreground font-medium truncate">{fmtBRL(fat)}</span>}
                            </div>
                          </div>
                          {pct <= 15 && <span className="text-xs font-mono text-muted-foreground w-28 text-right shrink-0">{fmtBRL(fat)}</span>}
                          <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{fmtNum(m.totalNFs)} NFs</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum dado de evolução mensal encontrado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pedidos em Aberto ── */}
        <TabsContent value="pedidos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Pedidos em Aberto
                {openOrders && openOrders.length > 0 && (
                  <Badge variant="outline" className="ml-1">{openOrders.length} pedidos</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingOpenOrders ? (
                <div className="p-4 space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : openOrders && openOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Representante</TableHead>
                      <TableHead className="text-right">Qtd Sacos</TableHead>
                      <TableHead className="text-right">Fat. Estimado</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                        <TableCell className="text-xs">{order.orderDate ? new Date(order.orderDate).toLocaleDateString("pt-BR") : "-"}</TableCell>
                        <TableCell className="text-sm">{order.clientName}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{order.productName}</TableCell>
                        <TableCell className="text-sm">{order.repName}</TableCell>
                        <TableCell className="text-right">{fmtNum(order.qtdSacos)}</TableCell>
                        <TableCell className="text-right font-mono">{fmtBRL(order.faturamentoEstimado)}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === "confirmed" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>
                            {order.status === "pending" ? "Pendente" : order.status === "confirmed" ? "Confirmado" : "Cancelado"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum pedido em aberto encontrado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
