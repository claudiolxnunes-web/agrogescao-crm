import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Smartphone, MapPin, Phone, Mail, FileText, Users, CheckCircle, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTIVITY_TYPES = [
  { value: "visit", label: "Visita", icon: MapPin, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
  { value: "call", label: "Ligação", icon: Phone, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { value: "email", label: "E-mail", icon: Mail, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  { value: "proposal", label: "Proposta", icon: FileText, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
  { value: "meeting", label: "Reunião", icon: Users, color: "text-primary", bg: "bg-primary/10" },
];

export default function RegistroMobile() {
  const utils = trpc.useUtils();
  const { data: clients } = trpc.clients.list.useQuery({});
  const { data: representatives } = trpc.representatives.list.useQuery({});
  const { data: recentActivities } = trpc.activities.list.useQuery({ limit: 10 });

  const createActivity = trpc.activities.create.useMutation({
    onSuccess: () => {
      utils.activities.list.invalidate();
      setForm({ type: "visit", clientId: "", representativeId: "", notes: "", outcome: "" });
      toast.success("Atividade registrada com sucesso!");
    },
    onError: () => toast.error("Erro ao registrar atividade"),
  });

  const [form, setForm] = useState({
    type: "visit",
    clientId: "",
    representativeId: "",
    notes: "",
    outcome: "",
  });

  const selectedType = ACTIVITY_TYPES.find(t => t.value === form.type);

  const handleSubmit = () => {
    if (!form.clientId || !form.representativeId) {
      toast.error("Selecione o cliente e o representante");
      return;
    }
    const typeLabel = ACTIVITY_TYPES.find(t => t.value === form.type)?.label || form.type;
    createActivity.mutate({
      type: form.type as "visit" | "call" | "email" | "proposal" | "meeting",
      title: `${typeLabel} — ${new Date().toLocaleDateString("pt-BR")}`,
      clientId: parseInt(form.clientId),
      representativeId: parseInt(form.representativeId),
      description: form.notes || undefined,
      scheduledAt: Date.now(),
    });
  };

  const OUTCOME_LABELS: Record<string, string> = {
    positive: "Positivo",
    neutral: "Neutro",
    negative: "Negativo",
    follow_up: "Follow-up",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-primary" />
          Registro de Campo
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registre atividades rapidamente durante visitas e ligações
        </p>
      </div>

      {/* Quick Activity Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nova Atividade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Atividade</Label>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {ACTIVITY_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = form.type === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setForm(f => ({ ...f, type: type.value }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isSelected ? type.bg : "bg-muted"}`}>
                      <Icon className={`h-4 w-4 ${isSelected ? type.color : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client & Rep */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cliente *</Label>
              <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {(clients || []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Representante *</Label>
              <Select value={form.representativeId} onValueChange={v => setForm(f => ({ ...f, representativeId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {(representatives || []).map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Observações</Label>
            <Textarea
              placeholder="Descreva o que foi discutido, próximos passos..."
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Outcome & Next Action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Resultado</Label>
              <Select value={form.outcome} onValueChange={v => setForm(f => ({ ...f, outcome: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Próxima Ação</Label>
              <Input
                placeholder="Ex: Enviar proposta em 3 dias"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <Button
            className="w-full h-12 gap-2 text-base"
            onClick={handleSubmit}
            disabled={createActivity.isPending}
          >
            <Plus className="h-4 w-4" />
            {createActivity.isPending ? "Registrando..." : "Registrar Atividade"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(recentActivities || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma atividade registrada ainda
              </div>
            ) : (
              (recentActivities || []).map(activity => {
                const typeConfig = ACTIVITY_TYPES.find(t => t.value === activity.type) || ACTIVITY_TYPES[0];
                const Icon = typeConfig.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.bg}`}>
                      <Icon className={`h-4 w-4 ${typeConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold">{typeConfig.label}</p>
                        {activity.status === "completed" && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {(activity as any).clientName || "Cliente"} • {(activity as any).repName || "Representante"}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
