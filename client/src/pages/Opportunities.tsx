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
import { Plus, DollarSign, Calendar } from "lucide-react";

const mockOpportunities = [
  { id: 1, title: "Venda Fornecimento Nutrição", client: "Fazenda São João", value: 50000, stage: "prospeccao", date: "2024-06-10" },
  { id: 2, title: "Projeto Expansão", client: "Granja Boa Vista", value: 120000, stage: "proposta", date: "2024-06-15" },
  { id: 3, title: "Contrato Anual", client: "Pecuária Santa Maria", value: 300000, stage: "negociacao", date: "2024-06-20" },
  { id: 4, title: "Venda Concretizada", client: "Fazenda Santa Cruz", value: 85000, stage: "vencida", date: "2024-05-28" },
];

const stages = [
  { id: "prospeccao", title: "Prospecção", color: "bg-blue-100" },
  { id: "proposta", title: "Proposta", color: "bg-yellow-100" },
  { id: "negociacao", title: "Negociação", color: "bg-orange-100" },
  { id: "vencida", title: "Vencida", color: "bg-green-100" },
  { id: "perdida", title: "Perdida", color: "bg-red-100" },
];

interface Opportunity {
  id: number;
  title: string;
  client: string;
  value: number;
  stage: string;
  date: string;
}

interface FormData {
  title: string;
  client: string;
  value: string;
  stage: string;
  date: string;
}

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(mockOpportunities);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    client: "",
    value: "",
    stage: "prospeccao",
    date: new Date().toISOString().split("T")[0],
  });

  const handleCreate = () => {
    if (!formData.title || !formData.client || !formData.value) {
      alert("Preencha todos os campos!");
      return;
    }

    const newOpp: Opportunity = {
      id: Math.max(...opportunities.map((o) => o.id), 0) + 1,
      title: formData.title,
      client: formData.client,
      value: parseFloat(formData.value),
      stage: formData.stage,
      date: formData.date,
    };

    setOpportunities([...opportunities, newOpp]);
    setIsCreateOpen(false);
    setFormData({
      title: "",
      client: "",
      value: "",
      stage: "prospeccao",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const moveToStage = (oppId: number, newStage: string) => {
    setOpportunities(
      opportunities.map((o) =>
        o.id === oppId ? { ...o, stage: newStage } : o
      )
    );
  };

  const deleteOpportunity = (oppId: number) => {
    setOpportunities(opportunities.filter((o) => o.id !== oppId));
  };

  const getOpportunitiesByStage = (stageId: string) =>
    opportunities.filter((o) => o.stage === stageId);

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const winRate = opportunities.filter((o) => o.stage === "vencida").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Oportunidades</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seu funil de vendas ({opportunities.length} oportunidades)
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Oportunidade</DialogTitle>
              <DialogDescription>Adicione uma nova oportunidade ao funil</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <Input
                  placeholder="Título da oportunidade"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cliente *</label>
                <Input
                  placeholder="Nome do cliente"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Valor (R$) *</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Etapa</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Data</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate}>Criar Oportunidade</Button>
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
                <p className="text-muted-foreground text-sm">Valor Total</p>
                <p className="text-2xl font-bold mt-2">
                  R$ {(totalValue / 1000000).toFixed(1)}M
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Oportunidades Ativas</p>
                <p className="text-2xl font-bold mt-2">
                  {opportunities.filter((o) => o.stage !== "vencida" && o.stage !== "perdida").length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Vendas Concretizadas</p>
                <p className="text-2xl font-bold mt-2">{winRate}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const stageOpps = getOpportunitiesByStage(stage.id);
          const stageValue = stageOpps.reduce((sum, opp) => sum + opp.value, 0);

          return (
            <Card key={stage.id} className={stage.color}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{stage.title}</CardTitle>
                <CardDescription>
                  {stageOpps.length} opp. • R$ {(stageValue / 1000).toFixed(0)}K
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-white p-3 rounded-lg border cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{opp.title}</h4>
                      <button
                        onClick={() => deleteOpportunity(opp.id)}
                        className="text-destructive hover:bg-red-100 rounded px-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">{opp.client}</p>

                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">
                        R$ {(opp.value / 1000).toFixed(0)}K
                      </span>
                      <span className="text-xs text-muted-foreground">{opp.date}</span>
                    </div>

                    {stage.id !== "vencida" && stage.id !== "perdida" && (
                      <div className="flex gap-1 flex-wrap">
                        {stages
                          .filter((s) => s.id !== stage.id)
                          .map((nextStage) => (
                            <button
                              key={nextStage.id}
                              onClick={() => moveToStage(opp.id, nextStage.id)}
                              className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition"
                            >
                              → {nextStage.title.split(" ")[0]}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}

                {stageOpps.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Nenhuma oportunidade
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
