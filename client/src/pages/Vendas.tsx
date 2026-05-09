import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  TrendingUp, DollarSign, Package, FileText, Users, MapPin,
  ChevronRight, ChevronDown, Search,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  if (!v) return "R$ 0";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}
function fmtN(v: number) {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}
const COLORS = ["#16a34a","#2563eb","#d97706","#dc2626","#7c3aed","#0891b2","#be185d","#65a30d"];
const MESES_LABEL = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function KPI({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color} shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab Vendedor ──────────────────────────────────────────────────────────────
function TabVendedor({ filters }: { filters: any }) {
  const [expandedRep, setExpandedRep] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: byRep = [] } = trpc.vendas.getByRepresentative.useQuery(filters);
  const { data: clientsOfRep = [] } = trpc.vendas.getByClient.useQuery(
    { ...filters, repCode: expandedRep ?? undefined },
    { enabled: !!expandedRep }
  );

  const maxFat = Math.max(...byRep.map((r: any) => r.totalFaturamento), 1);
  const filtered = byRep.filter((r: any) =>
    !search || r.repName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar representante..." className="pl-9" value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filtered.slice(0,10)} layout="vertical" margin={{ left: 180, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="repName" tick={{ fontSize: 11 }} width={175}
                tickFormatter={(v: string) => v?.length > 22 ? v.substring(0,22)+"…" : v} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="totalFaturamento" name="Faturamento" radius={[0,4,4,0]}>
                {filtered.slice(0,10).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.map((rep: any, i: number) => (
          <div key={rep.repCode ?? i} className="border rounded-lg overflow-hidden">
            <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 text-left"
              onClick={() => setExpandedRep(expandedRep === rep.repCode ? null : rep.repCode)}>
              <span className="text-sm font-bold text-muted-foreground w-5">{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{rep.repName || "–"}</p>
                  <Badge variant="outline" className="text-xs">{rep.totalClientes} cli</Badge>
                  <Badge variant="outline" className="text-xs">{rep.totalNFs} NFs</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={(rep.totalFaturamento / maxFat) * 100} className="h-1.5 flex-1" />
                  <span className="text-sm font-bold text-green-600 shrink-0">{fmt(rep.totalFaturamento)}</span>
                </div>
              </div>
              {expandedRep === rep.repCode ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            </button>
            {expandedRep === rep.repCode && (
              <div className="border-t bg-muted/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Clientes</p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {clientsOfRep.slice(0,50).map((c: any, j: number) => (
                    <div key={j} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 text-sm">
                      <span className="text-muted-foreground w-4 text-xs">{j+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{c.clientName}</p>
                        <p className="text-xs text-muted-foreground">{c.municipio} · {c.uf}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-green-600">{fmt(c.totalFaturamento)}</p>
                        <p className="text-xs text-muted-foreground">{c.totalNFs} NFs</p>
                      </div>
                    </div>
                  ))}
                  {clientsOfRep.length === 0 && <p className="text-xs text-center py-3 text-muted-foreground">Nenhum cliente</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab Cliente ───────────────────────────────────────────────────────────────
function TabCliente({ filters }: { filters: any }) {
  const [search, setSearch] = useState("");
  const [repFilter, setRepFilter] = useState("all");
  const [ufFilter, setUfFilter] = useState("all");

  const { data: clientes = [] } = trpc.vendas.getByClient.useQuery(filters);
  const { data: byRep = [] } = trpc.vendas.getByRepresentative.useQuery(filters);
  const { data: ufs = [] } = trpc.vendas.getUFOptions.useQuery();

  const filtered = useMemo(() => clientes.filter((c: any) => {
    if (search && !c.clientName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (repFilter !== "all" && c.repCode !== repFilter) return false;
    if (ufFilter !== "all" && c.uf !== ufFilter) return false;
    return true;
  }), [clientes, search, repFilter, ufFilter]);

  const maxFat = Math.max(...filtered.map((c: any) => c.totalFaturamento), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Representante" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {byRep.map((r: any) => <SelectItem key={r.repCode} value={r.repCode}>{r.repName?.split("-")[0]?.trim()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ufFilter} onValueChange={setUfFilter}>
          <SelectTrigger className="w-24"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ufs.map((uf: string) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} clientes</p>
      <div className="space-y-1.5">
        {filtered.slice(0,100).map((c: any, i: number) => (
          <div key={i} className="border rounded-lg p-3 hover:bg-muted/20">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-muted-foreground w-5 mt-1">{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{c.clientName || "–"}</p>
                  <Badge variant="outline" className="text-xs">{c.uf}</Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">{c.municipio}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Rep: {c.repName?.split("-")[0]?.trim() || "–"}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Progress value={(c.totalFaturamento / maxFat) * 100} className="h-1.5 flex-1" />
                  <span className="text-xs font-bold text-green-600 shrink-0">{fmt(c.totalFaturamento)}</span>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground shrink-0">
                <p>{c.totalNFs} NFs</p>
                <p>{fmtN(c.totalQtdSacos)} sc</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab Estado ────────────────────────────────────────────────────────────────
function TabEstado({ filters }: { filters: any }) {
  const [expandedUF, setExpandedUF] = useState<string | null>(null);
  const { data: byUF = [] } = trpc.vendas.getByUF.useQuery(filters);
  const { data: byCity = [] } = trpc.vendas.getByCity.useQuery(
    { ...filters, uf: expandedUF ?? undefined },
    { enabled: !!expandedUF }
  );
  const maxFat = Math.max(...byUF.map((r: any) => r.totalFaturamento), 1);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byUF.slice(0,8)} dataKey="totalFaturamento" nameKey="uf"
                cx="50%" cy="50%" outerRadius={80}
                label={({ uf, percent }: any) => `${uf} ${(percent*100).toFixed(0)}%`}>
                {byUF.slice(0,8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {byUF.map((uf: any, i: number) => (
          <div key={uf.uf ?? i} className="border rounded-lg overflow-hidden">
            <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 text-left"
              onClick={() => setExpandedUF(expandedUF === uf.uf ? null : uf.uf)}>
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{uf.uf || "–"}</p>
                  <Badge variant="outline" className="text-xs">{uf.totalClientes} cli</Badge>
                  <Badge variant="outline" className="text-xs">{uf.totalRepresentantes} reps</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={(uf.totalFaturamento / maxFat) * 100} className="h-1.5 flex-1" />
                  <span className="text-sm font-bold text-green-600 shrink-0">{fmt(uf.totalFaturamento)}</span>
                </div>
              </div>
              {expandedUF === uf.uf ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            </button>
            {expandedUF === uf.uf && (
              <div className="border-t bg-muted/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Cidades em {uf.uf}</p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {byCity.map((c: any, j: number) => (
                    <div key={j} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{c.municipio}</span>
                      <span className="text-xs text-muted-foreground">{c.totalClientes} cli</span>
                      <span className="text-xs font-bold text-green-600">{fmt(c.totalFaturamento)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab Evolução ──────────────────────────────────────────────────────────────
function TabEvolucao({ ano }: { ano: number }) {
  const { data: monthly = [] } = trpc.vendas.getMonthlyEvolution.useQuery({ limit: 24});
  const chartData = monthly.map((m: any) => ({
    mes: MESES_LABEL[parseInt(m.mes)] ?? m.mes,
    Faturamento: m.totalFaturamento,
    Sacos: m.totalQtdSacos,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Faturamento Mensal {ano}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="Faturamento" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Volume (Sacos) Mensal</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtN} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmtN(v) + " sc"} />
              <Bar dataKey="Sacos" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab Produto ───────────────────────────────────────────────────────────────
function TabProduto({ filters }: { filters: any }) {
  const [search, setSearch] = useState("");
  const { data: byProduct = [] } = trpc.vendas.getByProduct.useQuery(filters);
  const filtered = byProduct.filter((p: any) =>
    !search || p.productName?.toLowerCase().includes(search.toLowerCase())
  );
  const maxFat = Math.max(...filtered.map((p: any) => p.totalFaturamento), 1);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar produto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filtered.slice(0,10)} layout="vertical" margin={{ left: 160, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="productName" tick={{ fontSize: 11 }} width={155}
                tickFormatter={(v: string) => v?.length > 20 ? v.substring(0,20)+"…" : v} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="totalFaturamento" name="Faturamento" fill="#7c3aed" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="space-y-1.5">
        {filtered.slice(0,50).map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-2.5 border rounded-lg">
            <span className="text-xs font-bold text-muted-foreground w-5">{i+1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.productName || "–"}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={(p.totalFaturamento / maxFat) * 100} className="h-1.5 flex-1" />
                <span className="text-xs font-bold text-purple-600 shrink-0">{fmt(p.totalFaturamento)}</span>
              </div>
            </div>
            <div className="text-right shrink-0 text-xs text-muted-foreground">
              <p>{fmtN(p.totalQtdSacos)} sc</p>
              <p>{p.totalClientes} cli</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Vendas() {
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const [mesAno, setMesAno] = useState<string | undefined>(undefined);
  const [repFilter, setRepFilter] = useState("all");
  const [ufFilter, setUfFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("vendedor");

  const filters = {
    ano: mesAno ? undefined : ano,
    mesAno: mesAno || undefined,
    repCode: repFilter !== "all" ? repFilter : undefined,
    uf: ufFilter !== "all" ? ufFilter : undefined,
  };

  const { data: totals } = trpc.vendas.getTotals.useQuery(filters);
  const { data: byRep = [] } = trpc.vendas.getByRepresentative.useQuery(filters);
  const { data: ufs = [] } = trpc.vendas.getUFOptions.useQuery();

  const ANOS = [currentYear, currentYear-1, currentYear-2];
  const MESES_OPT = Array.from({ length: 12 }, (_, i) => {
    const m = String(i+1).padStart(2,"0");
    return { value: `${ano}/${m}`, label: `${MESES_LABEL[i+1]}/${ano}` };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-green-600" /> Vendas & Faturamento
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Análise por representante · cliente · cidade · estado · região
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={String(ano)} onValueChange={v => { setAno(Number(v)); setMesAno(undefined); }}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={mesAno ?? "all"} onValueChange={v => setMesAno(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MESES_OPT.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos os representantes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os representantes</SelectItem>
            {byRep.map((r: any) => (
              <SelectItem key={r.repCode} value={r.repCode}>{r.repName?.split("-")[0]?.trim()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ufFilter} onValueChange={setUfFilter}>
          <SelectTrigger className="w-24"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ufs.map((uf: string) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPI label="Faturamento" value={fmt(totals?.totalFaturamento ?? 0)}
          sub={`Margem: ${(totals?.mediaMbCbPct ?? 0).toFixed(1)}%`}
          icon={DollarSign} color="bg-green-100 text-green-600" />
        <KPI label="Volume (sc)" value={fmtN(totals?.totalQtdSacos ?? 0)}
          sub={`${fmtN(totals?.totalVolume ?? 0)} ton`}
          icon={Package} color="bg-blue-100 text-blue-600" />
        <KPI label="Notas Fiscais" value={fmtN(totals?.totalNFs ?? 0)}
          sub={`${totals?.totalClientes ?? 0} clientes`}
          icon={FileText} color="bg-orange-100 text-orange-600" />
        <KPI label="Representantes" value={byRep.length}
          sub="ativos no período" icon={Users} color="bg-purple-100 text-purple-600" />
        <KPI label="Estados" value={ufs.length}
          icon={MapPin} color="bg-teal-100 text-teal-600" />
        <KPI label="Comissão" value={fmt(totals?.totalComissao ?? 0)}
          icon={TrendingUp} color="bg-yellow-100 text-yellow-600" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="vendedor">Por Vendedor</TabsTrigger>
          <TabsTrigger value="cliente">Por Cliente</TabsTrigger>
          <TabsTrigger value="produto">Por Produto</TabsTrigger>
          <TabsTrigger value="estado">Por Estado/Cidade</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução Mensal</TabsTrigger>
        </TabsList>
        <TabsContent value="vendedor" className="mt-4"><TabVendedor filters={filters} /></TabsContent>
        <TabsContent value="cliente" className="mt-4"><TabCliente filters={filters} /></TabsContent>
        <TabsContent value="produto" className="mt-4"><TabProduto filters={filters} /></TabsContent>
        <TabsContent value="estado" className="mt-4"><TabEstado filters={filters} /></TabsContent>
        <TabsContent value="evolucao" className="mt-4"><TabEvolucao ano={ano} /></TabsContent>
      </Tabs>
    </div>
  );
}
