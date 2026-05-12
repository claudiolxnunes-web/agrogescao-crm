import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Clock,
  Package,
  Phone,
  Eye,
  X,
  CheckCircle,
} from "lucide-react";

// Mock alerts
const mockAlerts = [
  // Inativos a partir de 3 meses
  {
    id: 1,
    type: "inactive_90",
    title: "Fazenda São João - 90 dias sem compra",
    description: "Última compra: 90 dias atrás. Cliente em risco.",
    severity: "warning",
    daysSinceLastPurchase: 90,
    lastPurchaseDate: "2024-03-10",
    client: "Fazenda São João",
    action: "Contato urgente com gerente",
    createdAt: "2024-06-08",
  },
  // Inativos 6+ meses
  {
    id: 2,
    type: "inactive_180",
    title: "Granja Boa Vista - INATIVA (180+ dias)",
    description: "Última compra: há 6 meses! Cliente INATIVO no sistema.",
    severity: "critical",
    daysSinceLastPurchase: 185,
    lastPurchaseDate: "2023-12-20",
    client: "Granja Boa Vista",
    action: "Investigar problemas ou insatisfação urgentemente",
    createdAt: "2024-06-01",
  },
  // Estoque baixo
  {
    id: 3,
    type: "low_stock",
    title: "Pecuária Santa Maria - Estoque baixo de Produto A",
    description: "Estoque: 5 unidades. Reordenação necessária.",
    severity: "high",
    product: "Nutriente Premium A",
    currentStock: 5,
    minimumStock: 20,
    client: "Pecuária Santa Maria",
    action: "Agendar entrega de reposição",
    createdAt: "2024-06-08",
  },
  // Sem visita
  {
    id: 4,
    type: "no_visit",
    title: "Fazenda Santa Cruz - 45 dias sem visita",
    description: "Última visita: 45 dias atrás. Cliente pode estar insatisfeito.",
    severity: "warning",
    daysSinceLastVisit: 45,
    lastVisitDate: "2024-04-24",
    client: "Fazenda Santa Cruz",
    action: "Agendar visita de relacionamento",
    createdAt: "2024-06-08",
  },
  // Sem interação
  {
    id: 5,
    type: "no_interaction",
    title: "Distribuidor X - 60 dias sem interação",
    description: "Sem chamadas, emails ou visitas. Verifique status.",
    severity: "warning",
    daysSinceLastInteraction: 60,
    lastInteractionDate: "2024-04-09",
    client: "Distribuidor X",
    action: "Contato por email ou telefone",
    createdAt: "2024-06-08",
  },
  // Inativos 3 meses (aviso)
  {
    id: 6,
    type: "inactive_90",
    title: "Produtores Unidos - 90 dias sem compra",
    description: "Próximo passo: marcação como inativo em 90 dias.",
    severity: "warning",
    daysSinceLastPurchase: 88,
    lastPurchaseDate: "2024-03-12",
    client: "Produtores Unidos",
    action: "Contato preventivo",
    createdAt: "2024-06-07",
  },
];

interface Alert {
  id: number;
  type: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "warning";
  client: string;
  action: string;
  createdAt: string;
  [key: string]: any;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-300";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "warning":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "inactive_90":
    case "inactive_180":
      return <AlertCircle className="h-5 w-5" />;
    case "low_stock":
      return <Package className="h-5 w-5" />;
    case "no_visit":
      return <Clock className="h-5 w-5" />;
    case "no_interaction":
      return <Eye className="h-5 w-5" />;
    default:
      return null;
  }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState<string>("all");
  const [dismissed, setDismissed] = useState<number[]>([]);

  const activeAlerts = alerts.filter((a) => !dismissed.includes(a.id));

  const filteredAlerts =
    filter === "all"
      ? activeAlerts
      : activeAlerts.filter((a) => a.type.startsWith(filter));

  const stats = {
    critical: activeAlerts.filter((a) => a.severity === "critical").length,
    high: activeAlerts.filter((a) => a.severity === "high").length,
    warning: activeAlerts.filter((a) => a.severity === "warning").length,
    total: activeAlerts.length,
  };

  const handleDismiss = (id: number) => {
    setDismissed([...dismissed, id]);
  };

  const handleAction = (alert: Alert) => {
    alert("Ação: " + alert.action + "\n\nCliente: " + alert.client);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertCircle className="h-8 w-8 text-red-600" />
          Alertas
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitoramento de clientes inativos, estoque e visitas
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">CRÍTICOS</p>
              <p className="text-3xl font-bold mt-1 text-red-600">{stats.critical}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">ALTOS</p>
              <p className="text-3xl font-bold mt-1 text-orange-600">{stats.high}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">AVISOS</p>
              <p className="text-3xl font-bold mt-1 text-yellow-600">{stats.warning}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">TOTAL</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Todos", value: "all" },
              { label: "Inativos 90+ dias", value: "inactive_90" },
              { label: "Inativos 180+ dias", value: "inactive_180" },
              { label: "Estoque Baixo", value: "low_stock" },
              { label: "Sem Visita", value: "no_visit" },
              { label: "Sem Interação", value: "no_interaction" },
            ].map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum alerta nesta categoria</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-2 border-l-4 ${getSeverityColor(alert.severity)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                      {getTypeIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{alert.title}</CardTitle>
                      <CardDescription className="mt-1">{alert.description}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    className={`${getSeverityColor(alert.severity)} border whitespace-nowrap`}
                  >
                    {alert.severity === "critical"
                      ? "CRÍTICO"
                      : alert.severity === "high"
                      ? "ALTO"
                      : "AVISO"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Detalhes específicos por tipo */}
                {(alert.type === "inactive_90" || alert.type === "inactive_180") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Dias sem compra</p>
                      <p className="font-bold text-lg">{alert.daysSinceLastPurchase}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Última compra</p>
                      <p className="font-semibold text-sm">
                        {new Date(alert.lastPurchaseDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )}

                {alert.type === "low_stock" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Produto</p>
                      <p className="font-semibold text-sm">{alert.product}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Atual</p>
                      <p className="font-bold text-lg text-red-600">{alert.currentStock}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Mínimo</p>
                      <p className="font-bold text-lg text-green-600">{alert.minimumStock}</p>
                    </div>
                  </div>
                )}

                {alert.type === "no_visit" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Dias sem visita</p>
                      <p className="font-bold text-lg">{alert.daysSinceLastVisit}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Última visita</p>
                      <p className="font-semibold text-sm">
                        {new Date(alert.lastVisitDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )}

                {alert.type === "no_interaction" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Dias sem interação</p>
                      <p className="font-bold text-lg">{alert.daysSinceLastInteraction}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">Última interação</p>
                      <p className="font-semibold text-sm">
                        {new Date(alert.lastInteractionDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ação recomendada */}
                <div className="p-3 bg-white rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Ação Recomendada
                  </p>
                  <p className="text-sm font-medium">{alert.action}</p>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleAction(alert)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Executar Ação
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismiss(alert.id)}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" />
                    Descartar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Legenda */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">Referência de Alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span>
              <strong>CRÍTICO:</strong> Cliente inativo 180+ dias (6 meses)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
            <span>
              <strong>ALTO:</strong> Estoque baixo, requer ação imediata
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
            <span>
              <strong>AVISO:</strong> Cliente inativo 90+ dias, sem visita/interação 45+ dias
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
