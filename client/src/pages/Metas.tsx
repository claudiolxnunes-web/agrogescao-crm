import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Target, TrendingUp, AlertTriangle, Trophy, XCircle, Users } from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

const STATUS_CFG = {
  on_track: { label: "No Caminho",   icon: TrendingUp,    color: "text-green-600",  bg: "bg-green-100 dark:bg-green-900/20",   border: "border-green-200"  },
  at_risk:  { label: "Em Risco",     icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20", border: "border-yellow-200" },
  exceeded: { label: "Superada",     icon: Trophy,        color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/20",     border: "border-blue-200"   },
  achieved: { label: "Atingida",     icon: Trophy,        color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/20",     border: "border-blue-200"   },
  missed:   { label: "Não Atingida", icon: XCircle,       color: "text-red-600",    bg: "bg-red-100 dark:bg-red-900/20",       border: "border-red-200"    },
} as const;

// Parse "Meta 2026 - Especie / Subsolucao / Solucao"
function parseMeta(name: string) {
  const m = name.match(/Meta 2026 - (.+?) \/ (.+?) \/ (.+)/);
  if (!m) return null;
  return { especie: m[1].trim(), subsolucao: m[2].trim(), solucao: m[3].trim() };
}

// Agrupa metas por representante
function groupByRep(goals: any[]) {
  const map = new Map<number | null, { repId: number | null; repName: string; total: any; details: any[] }>();

  for (const g of goals) {
    const key = g.representativeId ?? -1;
    if (!map.has(key)) {
      map.set(key, { repId: g.representativeId, repName: g.repName ?? "Sem Representante", total: null, details: [] });
    }
    const entry = map.get(key)!;

    if (g.name?.startsWith("Meta Anual")) {
      entry.total = g;
    } else {
      entry.details.push(g);
    }
  }

  // Ordena por targetValue do total (maior primeiro)
  return Array.from(map.values()).sort((a, b) => (b.total?.targetValue ?? 0) - (a.total?.targetValue ?? 0));
}

// Agrupa detalhes por solução (CORTE / LEITE / TROS RUMINANT)
function groupBySolucao(details: any[]) {
  const map = new Map<string, any[]>();
  for (const d of details) {
    const parsed = parseMeta(d.name ?? "");
    const sol = parsed?.solucao ?? "Outros";
    if (!map.has(sol)) map.set(sol, []);
    map.get(sol)!.push({ ...d, _parsed: parsed });
  }
  return map;
}

// ── Componente de linha de subsolução ────────────────────────────────────────
function SubRow({ goal }: { goal: any }) {
  const cfg = STATUS_CFG[goal.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.on_track;
  const progress = Math.min(goal.progressPercent ?? 0, 100);
  const p = goal._parsed;
  return (
    <div className="pl-4 py-2 border-l-2 border-muted">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{p?.subsolucao ?? goal.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs">{fmt(goal.currentValue ?? 0)} / {fmt(goal.targetValue)}</span>
            <span className={`text-xs font-bold ${cfg.color}`}>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1 mt-1" />
        </div>
      </div>
    </div>
  );
}

// ── Componente de bloco de solução ────────────────────────────────────────────
function SolucaoBlock({ solucao, items }: { solucao: string; items: any[] }) {
  const [open, setOpen] = useState(false);
  const total = items.reduce((s, i) => s + (i.targetValue ?? 0), 0);
  const current = items.reduce((s, i) => s + (i.currentValue ?? 0), 0);
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  const SOLUCAO_COLORS: Record<string, string> = {
    CORTE:        "bg-orange-100 text-orange-700 border-orange-200",
    LEITE:        "bg-blue-100 text-blue-700 border-blue-200",
    "TROS RUMINANT": "bg-purple-100 text-purple-700 border-purple-200",
  };
  const badge = SOLUCAO_COLORS[solucao] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
               : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <Badge variant="outline" className={`text-xs ${badge}`}>{solucao}</Badge>
        <div className="flex-1 min-w-0">
          <Progress value={pct} className="h-1.5" />
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold">{fmt(total)}</p>
          <p className="text-xs text-muted-foreground">{pct}%</p>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1 bg-muted/20">
          {items.map(item => <SubRow key={item.id} goal={item} />)}
        </div>
      )}
    </div>
  );
}

// ── Card de representante ────────────────────────────────────────────────────
function RepCard({ group, onMarkRisk }: { group: any; onMarkRisk: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const total = group.total;
  const cfg = STATUS_CFG[(total?.status as keyof typeof STATUS_CFG) ?? "on_track"];
  const StatusIcon = cfg.icon;
  const progress = Math.min(total?.progressPercent ?? 0, 100);
  const solucaoMap = groupBySolucao(group.details);

  return (
    <Card className={`border ${cfg.border} hover:shadow-md transition-shadow`}>
      <CardContent className="p-0">
        {/* Header do representante */}
        <button
          className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
          onClick={() => setOpen(o => !o)}
        >
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${cfg.bg} shrink-0`}>
            <Users className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{group.repName}</p>
              <Badge variant="outline" className={`text-xs ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                {cfg.label}
              </Badge>
              {group.details.length > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {group.details.length} linhas
                </Badge>
              )}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {fmt(total?.currentValue ?? 0)} / {fmt(total?.targetValue ?? 0)}
                </span>
                <span className={`font-bold ${cfg.color}`}>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
          <div className="shrink-0">
            {open
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {/* Detalhes expandidos */}
        {open && (
          <div className="px-4 pb-4 space-y-2 border-t">
            <p className="text-xs font-medium text-muted-foreground pt-3">Detalhamento por Solução</p>
            {Array.from(solucaoMap.entries()).map(([sol, items]) => (
              <SolucaoBlock key={sol} solucao={sol} items={items} />
            ))}
            {total?.status === "on_track" && progress < 50 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                onClick={e => { e.stopPropagation(); onMarkRisk(total.id); }}
              >
                Marcar Em Risco
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Metas() {
  const [repFilter, setRepFilter] = useState("all");

  const { data: reps } = trpc.representatives.list.useQuery();
  const { data: goals, isLoading, refetch } = trpc.goals.list.useQuery({ period: "2026" });

  const updateMutation = trpc.goals.update.useMutation({
    onSuccess: () => { toast.success("Meta atualizada!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  // Filtrar por representante se selecionado
  const filtered = repFilter === "all"
    ? (goals ?? [])
    : (goals ?? []).filter(g => String(g.representativeId) === repFilter);

  const grouped = groupByRep(filtered);

  // KPIs
  const totais = (goals ?? []).filter(g => g.name?.startsWith("Meta Anual"));
  const onTrack  = totais.filter(g => g.status === "on_track").length;
  const atRisk   = totais.filter(g => g.status === "at_risk").length;
  const exceeded = totais.filter(g => g.status === "exceeded" || g.status === "achieved").length;
  const missed   = totais.filter(g => g.status === "missed").length;
  const totalAlvo    = totais.reduce((s, g) => s + (g.targetValue ?? 0), 0);
  const totalAtual   = totais.reduce((s, g) => s + (g.currentValue ?? 0), 0);

  const KPI_CARDS = [
    { label: "No Caminho",   value: onTrack,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
    { label: "Em Risco",     value: atRisk,   color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
    { label: "Superada",     value: exceeded, color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
    { label: "Não Atingida", value: missed,   color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-green-600" /> Sistema de Metas 2026
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {grouped.length} representantes · Meta total: {fmt(totalAlvo)} · Realizado: {fmt(totalAtual)}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CARDS.map(k => (
          <Card key={k.label} className={`border ${k.border} ${k.bg}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress geral */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Progresso Geral 2026</span>
            <span className="font-bold text-green-600">
              {totalAlvo > 0 ? Math.round((totalAtual / totalAlvo) * 100) : 0}%
            </span>
          </div>
          <Progress
            value={totalAlvo > 0 ? Math.min(Math.round((totalAtual / totalAlvo) * 100), 100) : 0}
            className="h-3"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {fmt(totalAtual)} realizados de {fmt(totalAlvo)} orçados
          </p>
        </CardContent>
      </Card>

      {/* Filtro por representante */}
      <div className="flex gap-3">
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos os representantes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os representantes</SelectItem>
            {reps?.map(r => (
              <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista agrupada por representante */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-muted/50" /></Card>
          ))
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma meta encontrada para 2026</p>
            </CardContent>
          </Card>
        ) : (
          grouped.map(group => (
            <RepCard
              key={group.repId ?? "no-rep"}
              group={group}
              onMarkRisk={id => updateMutation.mutate({ id, status: "at_risk" })}
            />
          ))
        )}
      </div>
    </div>
  );
}
