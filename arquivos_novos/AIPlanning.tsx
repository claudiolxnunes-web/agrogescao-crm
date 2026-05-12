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
import { Sparkles, MessageSquare, CheckCircle, AlertCircle, Target, Calendar } from "lucide-react";

// Mock IA suggestions
const mockAISuggestions = [
  {
    id: 1,
    client: "Fazenda São João",
    type: "visit",
    priority: "high",
    reason: "Últimas compras: há 45 dias. Produto A em estoque baixo. Visita recomendada.",
    suggestedAction: "Agendar visita para apresentar nova linha de nutrientes",
    spinPhase: "Investigação",
    estimatedDuration: 60,
    recommendedDate: "2024-06-15",
  },
  {
    id: 2,
    client: "Granja Boa Vista",
    type: "alert",
    priority: "critical",
    reason: "Sem compras há 85 dias! Cliente em risco de inatividade.",
    suggestedAction: "Contato urgente com gerente. Investigar problemas ou insatisfação.",
    spinPhase: "Situação",
    estimatedDuration: 45,
    recommendedDate: "2024-06-10",
  },
  {
    id: 3,
    client: "Pecuária Santa Maria",
    type: "opportunity",
    priority: "medium",
    reason: "Padrão de compra sugere demanda sazonal. Volume crescente.",
    suggestedAction: "Propor contrato de fornecimento exclusivo com desconto volume",
    spinPhase: "Consequência",
    estimatedDuration: 90,
    recommendedDate: "2024-06-20",
  },
];

interface AISuggestion {
  id: number;
  client: string;
  type: "visit" | "alert" | "opportunity";
  priority: "high" | "critical" | "medium";
  reason: string;
  suggestedAction: string;
  spinPhase: string;
  estimatedDuration: number;
  recommendedDate: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-300";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "visit":
      return <Calendar className="h-4 w-4" />;
    case "alert":
      return <AlertCircle className="h-4 w-4" />;
    case "opportunity":
      return <Target className="h-4 w-4" />;
    default:
      return null;
  }
};

export default function AIPlanningPage() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(mockAISuggestions);
  const [filter, setFilter] = useState<"all" | "visit" | "alert" | "opportunity">("all");
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredSuggestions = suggestions.filter(
    (s) => filter === "all" || s.type === filter
  );

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    // Simular geração de IA
    setTimeout(() => {
      setIsGenerating(false);
      alert("Novas sugestões geradas com sucesso!");
    }, 2000);
  };

  const handleAccept = (id: number) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            Planejamento Inteligente
          </h1>
          <p className="text-muted-foreground mt-1">
            Sugestões de IA baseadas em SPIN e análise de clientes
          </p>
        </div>
        <Button
          onClick={handleGenerateNew}
          disabled={isGenerating}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Gerando..." : "Gerar Novas Sugestões"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total de Sugestões</p>
              <p className="text-3xl font-bold mt-2">{suggestions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Críticas</p>
              <p className="text-3xl font-bold mt-2 text-red-600">
                {suggestions.filter((s) => s.priority === "critical").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Altas</p>
              <p className="text-3xl font-bold mt-2 text-orange-600">
                {suggestions.filter((s) => s.priority === "high").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Médias</p>
              <p className="text-3xl font-bold mt-2 text-blue-600">
                {suggestions.filter((s) => s.priority === "medium").length}
              </p>
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
              { label: "Visitas", value: "visit" },
              { label: "Alertas", value: "alert" },
              { label: "Oportunidades", value: "opportunity" },
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

      {/* Sugestões */}
      <div className="space-y-4">
        {filteredSuggestions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Nenhuma sugestão nesta categoria</p>
            </CardContent>
          </Card>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <Card
              key={suggestion.id}
              className={`cursor-pointer transition hover:shadow-lg border-2 ${
                suggestion.priority === "critical"
                  ? "border-red-300 bg-red-50/50"
                  : suggestion.priority === "high"
                  ? "border-orange-300 bg-orange-50/50"
                  : "border-blue-300 bg-blue-50/50"
              }`}
              onClick={() => setSelectedSuggestion(suggestion)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${getPriorityColor(suggestion.priority)}`}>
                      {getTypeIcon(suggestion.type)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{suggestion.client}</CardTitle>
                      <CardDescription>{suggestion.reason}</CardDescription>
                    </div>
                  </div>
                  <Badge className={`${getPriorityColor(suggestion.priority)} border`}>
                    {suggestion.priority === "critical"
                      ? "CRÍTICA"
                      : suggestion.priority === "high"
                      ? "ALTA"
                      : "MÉDIA"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* SPIN Phase */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Fase SPIN</p>
                    <p className="font-semibold text-sm">{suggestion.spinPhase}</p>
                  </div>
                  <Badge variant="outline">{suggestion.spinPhase}</Badge>
                </div>

                {/* Ação Sugerida */}
                <div className="p-3 bg-white rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Ação Sugerida
                  </p>
                  <p className="text-sm font-medium">{suggestion.suggestedAction}</p>
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <p className="text-xs text-muted-foreground">Duração</p>
                    <p className="font-semibold text-sm">{suggestion.estimatedDuration} min</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <p className="text-xs text-muted-foreground">Data Recomendada</p>
                    <p className="font-semibold text-sm text-blue-600">
                      {new Date(suggestion.recommendedDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-semibold text-sm capitalize">{suggestion.type}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSuggestion(suggestion);
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Aceitar e Agendar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar Agendamento</DialogTitle>
                        <DialogDescription>
                          Agendar visita para {suggestion.client}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium block mb-1">Data</label>
                          <Input
                            type="date"
                            defaultValue={suggestion.recommendedDate}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-1">Hora</label>
                          <Input type="time" defaultValue="10:00" />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-1">
                            Observações
                          </label>
                          <textarea
                            placeholder={suggestion.suggestedAction}
                            className="w-full px-3 py-2 border rounded-md"
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" className="flex-1">
                            Cancelar
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => handleAccept(suggestion.id)}
                          >
                            Confirmar Agendamento
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAccept(suggestion.id)}
                  >
                    Descartar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dicas SPIN */}
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Metodologia SPIN Explained
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <p className="font-semibold text-yellow-900">Situação (Situation)</p>
            <p className="text-yellow-800">Entender contexto do cliente</p>
          </div>
          <div>
            <p className="font-semibold text-yellow-900">Problema (Problem)</p>
            <p className="text-yellow-800">Identificar dificuldades</p>
          </div>
          <div>
            <p className="font-semibold text-yellow-900">Implicação (Implication)</p>
            <p className="text-yellow-800">Explorar consequências</p>
          </div>
          <div>
            <p className="font-semibold text-yellow-900">Necessidade-Payoff (Need-Payoff)</p>
            <p className="text-yellow-800">Foco na solução</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
