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
import { Plus, Phone, Mail, MapPin, MessageSquare, Calendar, Edit2, Trash2 } from "lucide-react";

// Mock interactions
const mockInteractions = [
  {
    id: 1,
    type: "visit",
    client: "Fazenda São João",
    date: "2024-06-08",
    time: "14:30",
    representative: "João Silva",
    description: "Visita de prospecção. Cliente interessado em linha nutriente premium.",
    notes: "Apresentado novo produto. Orçamento solicitado.",
    duration: 45,
    nextAction: "Enviar orçamento",
    nextActionDate: "2024-06-10",
    status: "completed",
  },
  {
    id: 2,
    type: "call",
    client: "Granja Boa Vista",
    date: "2024-06-08",
    time: "10:15",
    representative: "Maria Santos",
    description: "Contato telefônico - acompanhamento pós-visita",
    notes: "Cliente solicitou análise de tabela de preços. Será enviado por email.",
    duration: 12,
    nextAction: "Enviar análise comparativa",
    nextActionDate: "2024-06-09",
    status: "completed",
  },
  {
    id: 3,
    type: "email",
    client: "Pecuária Santa Maria",
    date: "2024-06-07",
    time: "16:45",
    representative: "Carlos Oliveira",
    description: "Envio de proposta comercial",
    notes: "Proposta de fornecimento exclusivo com desconto volume 15%.",
    duration: 0,
    nextAction: "Acompanhamento - cliente avaliando",
    nextActionDate: "2024-06-14",
    status: "pending",
  },
  {
    id: 4,
    type: "visit",
    client: "Fazenda Santa Cruz",
    date: "2024-06-06",
    time: "09:00",
    representative: "Ana Silva",
    description: "Visita de manutenção de conta",
    notes: "Verificação de satisfação geral. Produto chegando conforme esperado.",
    duration: 60,
    nextAction: "Próxima visita programada",
    nextActionDate: "2024-07-06",
    status: "completed",
  },
  {
    id: 5,
    type: "call",
    client: "Distribuidor X",
    date: "2024-06-05",
    time: "15:30",
    representative: "Pedro Costa",
    description: "Negociação de preço final",
    notes: "Cliente solicitou desconto adicional de 2%. Conseguimos negociar 1% extra.",
    duration: 20,
    nextAction: "Enviar emenda contratual",
    nextActionDate: "2024-06-06",
    status: "completed",
  },
];

interface Interaction {
  id: number;
  type: "visit" | "call" | "email" | "message";
  client: string;
  date: string;
  time: string;
  representative: string;
  description: string;
  notes: string;
  duration: number;
  nextAction: string;
  nextActionDate: string;
  status: "completed" | "pending" | "scheduled";
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "visit":
      return <MapPin className="h-5 w-5" />;
    case "call":
      return <Phone className="h-5 w-5" />;
    case "email":
      return <Mail className="h-5 w-5" />;
    case "message":
      return <MessageSquare className="h-5 w-5" />;
    default:
      return null;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "visit":
      return "Visita";
    case "call":
      return "Ligação";
    case "email":
      return "Email";
    case "message":
      return "Mensagem";
    default:
      return type;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "visit":
      return "bg-blue-100 text-blue-800";
    case "call":
      return "bg-green-100 text-green-800";
    case "email":
      return "bg-purple-100 text-purple-800";
    case "message":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100";
  }
};

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>(mockInteractions);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | string>("all");

  const filteredInteractions = interactions.filter((i) => {
    const matchSearch =
      i.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.representative.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || i.type === filterType;
    return matchSearch && matchType;
  });

  const stats = {
    total: interactions.length,
    visits: interactions.filter((i) => i.type === "visit").length,
    calls: interactions.filter((i) => i.type === "call").length,
    emails: interactions.filter((i) => i.type === "email").length,
  };

  const handleDelete = (id: number) => {
    setInteractions(interactions.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Interações</h1>
          <p className="text-muted-foreground mt-1">
            Log de atividades dos representantes com clientes
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nova Atividade</DialogTitle>
              <DialogDescription>
                Registre sua interação com o cliente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Cliente *</label>
                  <Input placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Tipo *</label>
                  <select className="w-full px-3 py-2 border rounded-md">
                    <option>Visita</option>
                    <option>Ligação</option>
                    <option>Email</option>
                    <option>Mensagem</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Data *</label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Hora</label>
                  <Input type="time" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Duração (min)</label>
                  <Input type="number" placeholder="45" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Descrição *</label>
                <textarea
                  placeholder="O que foi feito?"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Notas</label>
                <textarea
                  placeholder="Detalhes adicionais, próximos passos, etc"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Próxima Ação
                  </label>
                  <Input placeholder="Enviar orçamento" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Data da Próxima Ação
                  </label>
                  <Input type="date" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button className="flex-1">Registrar Atividade</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <MapPin className="h-5 w-5 mx-auto mb-2 text-blue-600" />
              <p className="text-muted-foreground text-sm">Visitas</p>
              <p className="text-3xl font-bold mt-2 text-blue-600">{stats.visits}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Phone className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <p className="text-muted-foreground text-sm">Ligações</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{stats.calls}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Mail className="h-5 w-5 mx-auto mb-2 text-purple-600" />
              <p className="text-muted-foreground text-sm">Emails</p>
              <p className="text-3xl font-bold mt-2 text-purple-600">{stats.emails}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Input
            placeholder="Buscar por cliente ou representante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Todas", value: "all" },
              { label: "Visitas", value: "visit" },
              { label: "Ligações", value: "call" },
              { label: "Emails", value: "email" },
              { label: "Mensagens", value: "message" },
            ].map((f) => (
              <Button
                key={f.value}
                variant={filterType === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredInteractions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredInteractions.map((interaction, idx) => (
            <Card key={interaction.id} className="hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2.5 rounded-lg ${getTypeColor(interaction.type)}`}>
                      {getTypeIcon(interaction.type)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{interaction.client}</CardTitle>
                      <CardDescription>{interaction.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getTypeColor(interaction.type)}>
                      {getTypeLabel(interaction.type)}
                    </Badge>
                    <Badge className={getStatusColor(interaction.status)}>
                      {interaction.status === "completed"
                        ? "Concluída"
                        : interaction.status === "pending"
                        ? "Pendente"
                        : "Agendada"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Data e hora */}
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="p-2 bg-gray-50 rounded flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-semibold">
                        {new Date(interaction.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-muted-foreground">Hora</p>
                    <p className="font-semibold">{interaction.time}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-muted-foreground">Duração</p>
                    <p className="font-semibold">
                      {interaction.duration > 0 ? `${interaction.duration} min` : "N/A"}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-muted-foreground">Rep</p>
                    <p className="font-semibold text-xs">{interaction.representative}</p>
                  </div>
                </div>

                {/* Notas */}
                {interaction.notes && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Notas</p>
                    <p className="text-sm text-blue-800">{interaction.notes}</p>
                  </div>
                )}

                {/* Próxima ação */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-amber-900 mb-1">
                    Próxima Ação
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-amber-800">{interaction.nextAction}</p>
                    <p className="text-xs font-semibold text-amber-700">
                      {new Date(interaction.nextActionDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive"
                    onClick={() => handleDelete(interaction.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
