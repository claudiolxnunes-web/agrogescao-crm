import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Plus, Target, TrendingUp, AlertTriangle, CheckCircle, XCircle, Trophy } from "lucide-react";

function formatCurrency(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

const STATUS_CONFIG = {
  on_track: { label: "No Caminho", icon: TrendingUp, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", border: "border-green-200" },
  at_risk: { label: "Em Risco", icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20", border: "border-yellow-200" },
  exceeded: { label: "Superada", icon: Trophy, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", border: "border-blue-200" },
  missed: { label: "Não Atingida", icon: XCircle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20", border: "border-red-200" },
};

const TYPE_LABELS: Record<string, string> = {
  sales: "Receita",
  clients: "Clientes",
  opportunities: "Oportunidades",
  visits: "Atividades",
};

export default function Metas() {
  const [regionFilter, setRegionFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: "", description: "", type: "sales" as "sales" | "clients" | "opportunities" | "visits",
    targetValue: "", currentValue: "0", period: "2025-Q1",
    regionId: "", representativeId: "",
  });

  const { data: regions } = trpc.regions.list.useQuery();
  const { data: reps } = trpc.representatives.list.useQuery();
  const regionId = regionFilter !== "all" ? regions?.find(r => r.code === regionFilter)?.id : undefined;

  const { data: goals, isLoading, refetch } = trpc.goals.list.useQuery({
    regionId,
    period: periodFilter || undefined,
  });

  const createMutation = trpc.goals.create.useMutation({
    onSuccess: () => { toast.success("Meta criada!"); setShowCreate(false); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.goals.update.useMutation({
    onSuccess: () => { toast.success("Meta atualizada!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const onTrackCount = goals?.filter(g => g.status === "on_track").length || 0;
  const atRiskCount = goals?.filter(g => g.status === "at_risk").length || 0;
  const exceededCount = goals?.filter(g => g.status === "exceeded").length || 0;
  const missedCount = goals?.filter(g => g.status === "missed").length || 0;

  const statusData = [
    { name: "No Caminho", value: onTrackCount, color: "#22c55e" },
    { name: "Em Risco", value: atRiskCount, color: "#f59e0b" },
    { name: "Superada", value: exceededCount, color: "#3b82f6" },
    { name: "Não Atingida", value: missedCount, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sistema de Metas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{goals?.length || 0} metas cadastradas</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 h-11">
          <Plus className="h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = goals?.filter(g => g.status === key).length || 0;
          const StatusIcon = cfg.icon;
          return (
            <Card key={key} className={`border ${cfg.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${cfg.color}`}>{count}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                    <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 flex flex-col sm:flex-row gap-3">
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas as regiões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as regiões</SelectItem>
              {regions?.map(r => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filtrar por período (ex: 2025-Q1)"
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            className="w-56"
          />
        </div>

        {statusData.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Status Geral</p>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-muted/50" /></Card>
          ))
        ) : goals?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma meta encontrada</p>
            </CardContent>
          </Card>
        ) : (
          goals?.map(goal => {
            const cfg = STATUS_CONFIG[goal.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.on_track;
            const StatusIcon = cfg.icon;
            const progress = Math.min(goal.progressPercent || 0, 100);
            const isRevenue = goal.type === "sales";

            return (
              <Card key={goal.id} className={`border ${cfg.border} hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.bg} shrink-0`}>
                      <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{goal.name}</p>
                        <Badge variant="outline" className={`text-xs ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {cfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[goal.type ?? "sales"] ?? goal.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {goal.period}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        {goal.regionName && <span>📍 {goal.regionName}</span>}
                        {goal.repName && <span>👤 {goal.repName}</span>}
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {isRevenue ? formatCurrency(goal.currentValue || 0) : goal.currentValue || 0}
                            {" / "}
                            {isRevenue ? formatCurrency(goal.targetValue) : goal.targetValue}
                          </span>
                          <span className={`font-bold ${cfg.color}`}>{progress}%</span>
                        </div>
                        <Progress
                          value={progress}
                          className="h-2"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {goal.status === "on_track" && progress > 90 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => updateMutation.mutate({ id: goal.id, status: "exceeded" })}
                        >
                          Marcar Superada
                        </Button>
                      )}
                      {goal.status === "on_track" && progress < 50 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                          onClick={() => updateMutation.mutate({ id: goal.id, status: "at_risk" })}
                        >
                          Marcar Em Risco
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Meta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">            <div className="space-y-1.5">
              <Label>Nome da Meta *</Label>
              <Input className="h-11" value={newGoal.name} onChange={e => setNewGoal(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Meta de Receita Q1 SP" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input className="h-11" value={newGoal.description} onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes sobre a meta" />
            </div>        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={newGoal.type} onValueChange={v => setNewGoal(p => ({ ...p, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Receita</SelectItem>
                    <SelectItem value="clients">Clientes</SelectItem>
                    <SelectItem value="opportunities">Oportunidades</SelectItem>
                    <SelectItem value="visits">Atividades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Input value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))} placeholder="2025-Q1" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Alvo *</Label>
                <Input type="number" value={newGoal.targetValue} onChange={e => setNewGoal(p => ({ ...p, targetValue: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Atual</Label>
                <Input type="number" value={newGoal.currentValue} onChange={e => setNewGoal(p => ({ ...p, currentValue: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Região</Label>
                <Select value={newGoal.regionId} onValueChange={v => setNewGoal(p => ({ ...p, regionId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {regions?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Representante</Label>
                <Select value={newGoal.representativeId} onValueChange={v => setNewGoal(p => ({ ...p, representativeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {reps?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button className="h-11 w-full sm:w-auto" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              className="h-11 w-full sm:w-auto"
              onClick={() => createMutation.mutate({
                name: newGoal.name,
                description: newGoal.description,
                type: newGoal.type,
                targetValue: Number(newGoal.targetValue),
                currentValue: Number(newGoal.currentValue),
                period: newGoal.period,
                regionId: newGoal.regionId ? Number(newGoal.regionId) : undefined,
                representativeId: newGoal.representativeId ? Number(newGoal.representativeId) : undefined,
              })}
              disabled={!newGoal.name || !newGoal.targetValue || createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
