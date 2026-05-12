import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Target, TrendingUp, Calendar, CheckCircle, AlertCircle } from "lucide-react";

// Mock SMART goals
const mockGoals = [
  {
    id: 1,
    title: "Aumentar vendas segmento A em 20%",
    owner: "João Silva",
    type: "revenue",
    status: "in_progress",
    specific: "Vendas do segmento A: de R$ 500K para R$ 600K",
    measurable: "R$ 100K em novas vendas",
    achievable: "Visitas + 5 clientes novos",
    relevant: "Segmento A = 25% do faturamento total",
    timebound: "30 de junho de 2024",
    target: 600000,
    current: 520000,
    startDate: "2024-03-01",
    endDate: "2024-06-30",
    actions: [
      "Visitar 3 novos clientes/semana",
      "Apresentar novo produto",
      "Oferecer desconto em volume",
    ],
    progress: 87,
  },
  {
    id: 2,
    title: "Reativar 10 clientes inativos",
    owner: "Maria Santos",
    type: "retention",
    status: "in_progress",
    specific: "Reativar 10 clientes inativos (6+ meses sem compra)",
    measurable: "10 clientes com compra realizada",
    achievable: "Contato pessoal + proposta customizada",
    relevant: "Reduz churn, mantém carteira estável",
    timebound: "31 de julho de 2024",
    target: 10,
    current: 6,
    startDate: "2024-04-01",
    endDate: "2024-07-31",
    actions: [
      "Listar clientes inativos",
      "Fazer contato telefônico",
      "Agendar visitas",
      "Oferecer bônus reativação",
    ],
    progress: 60,
  },
  {
    id: 3,
    title: "Expandir para 5 novas regiões",
    owner: "Carlos Oliveira",
    type: "growth",
    status: "planned",
    specific: "Adicionar 5 regiões geográficas novas",
    measurable: "5 regiões com pelo menos 5 clientes cada",
    achievable: "Programa de prospecção estruturado",
    relevant: "Crescimento de 40% em cobertura",
    timebound: "31 de dezembro de 2024",
    target: 5,
    current: 0,
    startDate: "2024-06-01",
    endDate: "2024-12-31",
    actions: [
      "Mapear regiões viáveis",
      "Contratar novos reps",
      "Criar material de prospecção",
    ],
    progress: 20,
  },
];

interface Goal {
  id: number;
  title: string;
  owner: string;
  type: "revenue" | "retention" | "growth";
  status: "planned" | "in_progress" | "completed" | "at_risk";
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timebound: string;
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  actions: string[];
  progress: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "at_risk":
      return "bg-red-100 text-red-800";
    case "planned":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "revenue":
      return "bg-emerald-100 text-emerald-800";
    case "retention":
      return "bg-blue-100 text-blue-800";
    case "growth":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100";
  }
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [filter, setFilter] = useState<"all" | "planned" | "in_progress" | "completed">(
    "all"
  );

  const filteredGoals = goals.filter((g) => filter === "all" || g.status === filter);

  const totalTargetRevenue = goals
    .filter((g) => g.type === "revenue")
    .reduce((sum, g) => sum + g.target, 0);
  const currentRevenue = goals
    .filter((g) => g.type === "revenue")
    .reduce((sum, g) => sum + g.current, 0);
  const avgProgress = Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-600" />
            Metas SMART
          </h1>
          <p className="text-muted-foreground mt-1">
            Specific, Measurable, Achievable, Relevant, Time-bound
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Meta SMART</DialogTitle>
              <DialogDescription>Preencha os 5 critérios SMART</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="text-sm font-medium block mb-1">Título da Meta</label>
                <Input placeholder="Ex: Aumentar vendas em 20%" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Responsável</label>
                  <Input placeholder="Nome do rep" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Tipo</label>
                  <select className="w-full px-3 py-2 border rounded-md">
                    <option>Faturamento</option>
                    <option>Retenção</option>
                    <option>Crescimento</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    S - Específica (Specific)
                  </label>
                  <textarea
                    placeholder="Descrever exatamente o quê"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    M - Mensurável (Measurable)
                  </label>
                  <textarea
                    placeholder="Como medir: métrica numérica"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    A - Alcançável (Achievable)
                  </label>
                  <textarea
                    placeholder="Como será alcançado: plano de ação"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    R - Relevante (Relevant)
                  </label>
                  <textarea
                    placeholder="Por quê: alinhamento com estratégia"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    T - Temporal (Time-bound)
                  </label>
                  <Input type="date" placeholder="Data limite" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button className="flex-1">Criar Meta</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Meta em Faturamento</p>
                <p className="text-2xl font-bold mt-1">
                  R$ {(totalTargetRevenue / 1000000).toFixed(1)}M
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Faturamento Atual</p>
                <p className="text-2xl font-bold mt-1">
                  R$ {(currentRevenue / 1000000).toFixed(1)}M
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Progresso Médio</p>
                <p className="text-2xl font-bold mt-1">{avgProgress}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Todas", value: "all" },
              { label: "Planejadas", value: "planned" },
              { label: "Em Andamento", value: "in_progress" },
              { label: "Concluídas", value: "completed" },
            ].map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value as any)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metas */}
      <div className="space-y-4">
        {filteredGoals.map((goal) => (
          <Card key={goal.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{goal.title}</CardTitle>
                  <CardDescription>{goal.owner}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={getTypeColor(goal.type)}>
                    {goal.type === "revenue"
                      ? "Faturamento"
                      : goal.type === "retention"
                      ? "Retenção"
                      : "Crescimento"}
                  </Badge>
                  <Badge className={getStatusColor(goal.status)}>
                    {goal.status === "in_progress"
                      ? "Em Andamento"
                      : goal.status === "planned"
                      ? "Planejada"
                      : "Concluída"}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progresso */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso</span>
                  <span className="text-sm font-bold text-blue-600">{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              {/* Critérios SMART */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-900 mb-1">S - Específica</p>
                  <p className="text-sm text-emerald-800">{goal.specific}</p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-1">M - Mensurável</p>
                  <p className="text-sm text-blue-800">{goal.measurable}</p>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-amber-900 mb-1">A - Alcançável</p>
                  <p className="text-sm text-amber-800">{goal.achievable}</p>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-900 mb-1">R - Relevante</p>
                  <p className="text-sm text-purple-800">{goal.relevant}</p>
                </div>

                <div className="p-3 bg-pink-50 rounded-lg border border-pink-200 md:col-span-2">
                  <p className="text-xs font-semibold text-pink-900 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    T - Temporal
                  </p>
                  <p className="text-sm text-pink-800">{goal.timebound}</p>
                </div>
              </div>

              {/* Números */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-muted-foreground">Alvo</p>
                  <p className="font-bold text-lg">
                    {goal.type === "revenue"
                      ? `R$ ${(goal.target / 1000).toFixed(0)}K`
                      : goal.target}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-muted-foreground">Atual</p>
                  <p className="font-bold text-lg text-blue-600">
                    {goal.type === "revenue"
                      ? `R$ ${(goal.current / 1000).toFixed(0)}K`
                      : goal.current}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-muted-foreground">Faltam</p>
                  <p className="font-bold text-lg text-amber-600">
                    {goal.type === "revenue"
                      ? `R$ ${((goal.target - goal.current) / 1000).toFixed(0)}K`
                      : goal.target - goal.current}
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div>
                <p className="text-sm font-semibold mb-2">Plano de Ação:</p>
                <ul className="space-y-1">
                  {goal.actions.map((action, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
