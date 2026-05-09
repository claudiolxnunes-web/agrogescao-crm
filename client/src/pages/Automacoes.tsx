import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Plus, Trash2, Play, Pause, Settings, Clock, Bell, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const TRIGGER_LABELS: Record<string, string> = {
  opportunity_created: "Oportunidade Criada",
  goal_at_risk: "Meta em Risco",
  long_cycle: "Ciclo Longo",
  client_inactive: "Cliente Inativo",
  high_value_opp: "Oportunidade de Alto Valor",
};

const ACTION_LABELS: Record<string, string> = {
  send_notification: "Enviar Notificação",
  create_activity: "Criar Atividade",
  update_stage: "Atualizar Estágio",
  assign_rep: "Atribuir Representante",
  send_email: "Enviar E-mail",
};

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  opportunity_created: Zap,
  goal_at_risk: TrendingDown,
  long_cycle: Clock,
  client_inactive: Bell,
  high_value_opp: TrendingDown,
};

export default function Automacoes() {
  const utils = trpc.useUtils();
  const { data: automations, isLoading } = trpc.automations.list.useQuery();
  const toggleAutomation = trpc.automations.toggle.useMutation({
    onSuccess: () => utils.automations.list.invalidate(),
  });
  const createAutomation = trpc.automations.create.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      setCreateOpen(false);
      toast.success("Automação criada com sucesso!");
    },
    onError: () => toast.error("Erro ao criar automação"),
  });
  const deleteAutomation = trpc.automations.delete.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      toast.success("Automação removida");
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger: "opportunity_created",
    action: "send_notification",
    conditions: "",
  });

  const activeCount = (automations || []).filter(a => a.isActive).length;
  const inactiveCount = (automations || []).filter(a => !a.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Automações
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure workflows automáticos para otimizar processos
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 h-11">
          <Plus className="h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-1">{automations?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ativas</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Inativas</p>
            <p className="text-2xl font-bold mt-1 text-muted-foreground">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando automações...</div>
        ) : (automations || []).length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Nenhuma automação configurada</p>
              <p className="text-xs text-muted-foreground mt-1">Crie sua primeira automação para começar</p>
              <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Criar Automação
              </Button>
            </CardContent>
          </Card>
        ) : (
          (automations || []).map(automation => {
            const TriggerIcon = TRIGGER_ICONS[automation.trigger || ""] || Zap;
            return (
              <Card key={automation.id} className={`transition-all ${!automation.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${automation.isActive ? "bg-primary/10" : "bg-muted"}`}>
                      <TriggerIcon className={`h-5 w-5 ${automation.isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{automation.name}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${automation.isActive ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20" : "text-muted-foreground"}`}
                        >
                          {automation.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      {(automation as any).description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{(automation as any).description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Gatilho:</span>
                          <Badge variant="outline" className="text-xs">
                            {TRIGGER_LABELS[automation.trigger || ""] || automation.trigger}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground text-xs">→</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Ação:</span>
                          <Badge variant="outline" className="text-xs">
                            {ACTION_LABELS[automation.action || ""] || automation.action}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criada {formatDistanceToNow(new Date(automation.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={automation.isActive ?? false}
                        onCheckedChange={(checked) => {
                          toggleAutomation.mutate({ id: automation.id, isActive: checked });
                          toast.info(checked ? "Automação ativada" : "Automação pausada");
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => deleteAutomation.mutate({ id: automation.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Automação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Alerta de meta em risco"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Descreva o que esta automação faz..."
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gatilho</Label>
                <Select value={form.trigger} onValueChange={v => setForm(f => ({ ...f, trigger: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ação</Label>
                <Select value={form.action} onValueChange={v => setForm(f => ({ ...f, action: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Condições (opcional)</Label>
              <Input
                placeholder="Ex: valor > 50000"
                value={form.conditions}
                onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button className="h-11 w-full sm:w-auto" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              className="h-11 w-full sm:w-auto"
              onClick={() => createAutomation.mutate({
                name: form.name,
                trigger: form.trigger as "opportunity_created" | "goal_at_risk" | "long_cycle" | "client_inactive" | "high_value",
                action: form.action,
                conditions: form.conditions || undefined,
              })}
              disabled={!form.name || createAutomation.isPending}
            >
              {createAutomation.isPending ? "Criando..." : "Criar Automação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
