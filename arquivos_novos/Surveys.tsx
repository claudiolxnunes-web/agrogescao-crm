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
import { Plus, Star, BarChart3, MessageCircle, CheckCircle, Clock } from "lucide-react";

// Mock surveys
const mockSurveys = [
  {
    id: 1,
    title: "Satisfação Geral - Fazenda São João",
    client: "Fazenda São João",
    createdDate: "2024-06-01",
    dueDate: "2024-06-15",
    status: "completed",
    responses: 1,
    targetResponses: 1,
    rating: 4.5,
    questions: [
      { question: "Qual sua avaliação geral?", type: "rating", answer: 5 },
      { question: "Qualidade dos produtos", type: "rating", answer: 4 },
      { question: "Atendimento e suporte", type: "rating", answer: 4 },
      { question: "Preço vs valor", type: "rating", answer: 4 },
      { question: "Pontos para melhoria?", type: "text", answer: "Embalagem poderia ser melhor" },
    ],
  },
  {
    id: 2,
    title: "Feedback Pós-Compra - Granja Boa Vista",
    client: "Granja Boa Vista",
    createdDate: "2024-06-05",
    dueDate: "2024-06-20",
    status: "pending",
    responses: 0,
    targetResponses: 1,
    rating: 0,
    questions: [
      { question: "Produto chegou conforme esperado?", type: "yes_no" },
      { question: "Qualidade do produto", type: "rating" },
      { question: "Prazo de entrega", type: "rating" },
      { question: "Comentários adicionais", type: "text" },
    ],
  },
  {
    id: 3,
    title: "NPS - Net Promoter Score",
    client: "Pecuária Santa Maria",
    createdDate: "2024-05-28",
    dueDate: "2024-06-14",
    status: "in_progress",
    responses: 1,
    targetResponses: 1,
    rating: 8,
    questions: [
      { question: "Quanto você recomendaria nossa empresa? (0-10)", type: "nps", answer: 8 },
      { question: "Por que essa nota?", type: "text", answer: "Bom atendimento, mas precisa de mais opções de produtos" },
    ],
  },
  {
    id: 4,
    title: "Pesquisa de Satisfação - Trimestral",
    client: "Fazenda Santa Cruz",
    createdDate: "2024-05-20",
    dueDate: "2024-06-10",
    status: "completed",
    responses: 1,
    targetResponses: 1,
    rating: 4.0,
    questions: [
      { question: "Cumprimento de prazos", type: "rating", answer: 4 },
      { question: "Qualidade consistente", type: "rating", answer: 4 },
      { question: "Atendimento responsivo", type: "rating", answer: 4 },
      { question: "Melhorias sugeridas", type: "text", answer: "Gostaria de portfólio expandido" },
    ],
  },
];

interface Survey {
  id: number;
  title: string;
  client: string;
  createdDate: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
  responses: number;
  targetResponses: number;
  rating: number;
  questions: Array<{
    question: string;
    type: string;
    answer?: any;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100";
  }
};

const getRatingColor = (rating: number) => {
  if (rating >= 4.5) return "text-green-600";
  if (rating >= 3.5) return "text-blue-600";
  if (rating >= 2.5) return "text-yellow-600";
  return "text-red-600";
};

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>(mockSurveys);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  const stats = {
    total: surveys.length,
    pending: surveys.filter((s) => s.status === "pending").length,
    inProgress: surveys.filter((s) => s.status === "in_progress").length,
    completed: surveys.filter((s) => s.status === "completed").length,
    avgRating:
      (surveys.reduce((sum, s) => sum + s.rating, 0) / surveys.filter((s) => s.rating > 0).length).toFixed(1),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-purple-600" />
            Enquetes e Feedback
          </h1>
          <p className="text-muted-foreground mt-1">
            Pesquisas de satisfação e feedback de clientes
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Enquete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Enquete</DialogTitle>
              <DialogDescription>
                Crie uma pesquisa de feedback para seus clientes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Título *</label>
                <Input placeholder="Ex: Pesquisa de Satisfação Q2 2024" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Cliente *</label>
                  <Input placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Tipo de Enquete</label>
                  <select className="w-full px-3 py-2 border rounded-md">
                    <option>Satisfação Geral</option>
                    <option>Pós-Compra</option>
                    <option>NPS</option>
                    <option>Qualidade</option>
                    <option>Customizada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Data de Criação</label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Data Limite</label>
                  <Input type="date" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Perguntas</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Clique em "Salvar Enquete" para adicionar perguntas depois
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button className="flex-1">Criar Enquete</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-yellow-600" />
              <p className="text-muted-foreground text-sm">Pendentes</p>
              <p className="text-3xl font-bold mt-2 text-yellow-600">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-2 text-blue-600" />
              <p className="text-muted-foreground text-sm">Em Progresso</p>
              <p className="text-3xl font-bold mt-2 text-blue-600">{stats.inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <p className="text-muted-foreground text-sm">Completas</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Star className="h-5 w-5 mx-auto mb-2 text-amber-600" />
              <p className="text-muted-foreground text-sm">Nota Média</p>
              <p className={`text-3xl font-bold mt-2 ${getRatingColor(parseFloat(stats.avgRating))}`}>
                {stats.avgRating}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enquetes */}
      <div className="space-y-4">
        {surveys.map((survey) => (
          <Card key={survey.id} className="hover:shadow-lg transition cursor-pointer">
            <CardHeader 
              className="pb-3"
              onClick={() => setSelectedSurvey(survey)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{survey.title}</CardTitle>
                  <CardDescription>{survey.client}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {survey.rating > 0 && (
                    <div className="flex items-center gap-1 p-2 bg-amber-50 rounded-lg">
                      <Star className={`h-4 w-4 fill-current ${getRatingColor(survey.rating)}`} />
                      <span className={`font-bold ${getRatingColor(survey.rating)}`}>
                        {survey.rating}
                      </span>
                    </div>
                  )}
                  <Badge className={getStatusColor(survey.status)}>
                    {survey.status === "pending"
                      ? "Pendente"
                      : survey.status === "in_progress"
                      ? "Em Progresso"
                      : "Concluída"}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent 
              className="space-y-4"
              onClick={() => setSelectedSurvey(survey)}
            >
              {/* Progresso */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Respostas</span>
                  <span className="text-sm font-bold">
                    {survey.responses} de {survey.targetResponses}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(survey.responses / survey.targetResponses) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-xs text-muted-foreground">Criada</p>
                  <p className="font-semibold text-sm">
                    {new Date(survey.createdDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className="font-semibold text-sm">
                    {new Date(survey.dueDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-xs text-muted-foreground">Perguntas</p>
                  <p className="font-semibold text-sm">{survey.questions.length}</p>
                </div>
              </div>

              {/* Preview de perguntas */}
              {survey.questions.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-900 mb-2">Perguntas:</p>
                  <ul className="space-y-1">
                    {survey.questions.slice(0, 2).map((q, idx) => (
                      <li key={idx} className="text-xs text-purple-800">
                        • {q.question}
                      </li>
                    ))}
                    {survey.questions.length > 2 && (
                      <li className="text-xs text-purple-800 font-semibold">
                        + {survey.questions.length - 2} mais
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Respostas
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{survey.title}</DialogTitle>
                      <DialogDescription>
                        {survey.client} - {survey.responses} de {survey.targetResponses} respostas
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {survey.questions.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <p className="font-semibold text-sm mb-2">{q.question}</p>
                          {q.answer && (
                            <p className="text-sm text-blue-600">
                              💬 Resposta: <span className="font-medium">{q.answer}</span>
                            </p>
                          )}
                          {!q.answer && (
                            <p className="text-xs text-muted-foreground italic">
                              Sem resposta
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => alert("Enquete enviada novamente")}
                >
                  Reenviar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span>Taxa de Resposta</span>
            <span className="font-bold">
              {(
                (surveys.filter((s) => s.responses > 0).length / surveys.length) *
                100
              ).toFixed(0)}
              %
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span>Nota Média (Completas)</span>
            <span className={`font-bold ${getRatingColor(parseFloat(stats.avgRating))}`}>
              {stats.avgRating} ⭐
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span>Enquetes Pendentes de Resposta</span>
            <span className="font-bold text-yellow-600">{stats.pending}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
