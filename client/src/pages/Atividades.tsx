import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Phone, Mail, MapPin, FileText, Users, Calendar, CheckCircle, Clock, Activity } from "lucide-react";

const ACTIVITY_TYPES = {
  visit: { label: "Visita", icon: MapPin, color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  call: { label: "Ligação", icon: Phone, color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  email: { label: "Email", icon: Mail, color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  proposal: { label: "Proposta", icon: FileText, color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  meeting: { label: "Reunião", icon: Users, color: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  demo: { label: "Demo", icon: Activity, color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-500" },
};

export default function Atividades() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: "visit" as keyof typeof ACTIVITY_TYPES,
    title: "", description: "", clientId: "", representativeId: "",
    scheduledAt: "", location: "", duration: "",
  });

  const { data: clients } = trpc.clients.list.useQuery();
  const { data: reps } = trpc.representatives.list.useQuery();
  // Calcular datas para filtro de período
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  let dateFilter: { start?: Date; end?: Date } = {};
  if (periodFilter === "today") {
    dateFilter = { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  } else if (periodFilter === "week") {
    dateFilter = { start: weekAgo, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  } else if (periodFilter === "month") {
    dateFilter = { start: monthAgo, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  }

  const { data: activities, isLoading, refetch } = trpc.activities.list.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
  });

  const createMutation = trpc.activities.create.useMutation({
    onSuccess: () => { toast.success("Atividade registrada!"); setShowCreate(false); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const completeMutation = trpc.activities.complete.useMutation({
    onSuccess: () => { toast.success("Atividade concluída!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  // Filtrar atividades por período e busca
  const filteredActivities = activities?.filter(a => {
    // Filtro de período
    if (periodFilter !== "all") {
      const actDate = new Date(a.scheduledAt || a.createdAt);
      if (periodFilter === "today") {
        if (!(actDate >= today && actDate < new Date(today.getTime() + 24 * 60 * 60 * 1000))) return false;
      } else if (periodFilter === "week") {
        if (!(actDate >= weekAgo && actDate < new Date(today.getTime() + 24 * 60 * 60 * 1000))) return false;
      } else if (periodFilter === "month") {
        if (!(actDate >= monthAgo && actDate < new Date(today.getTime() + 24 * 60 * 60 * 1000))) return false;
      }
    }

    // Filtro de busca por texto
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      const titleMatch = a.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = a.description?.toLowerCase().includes(searchLower);
      const clientMatch = a.clientName?.toLowerCase().includes(searchLower);
      const repMatch = a.repName?.toLowerCase().includes(searchLower);
      return titleMatch || descriptionMatch || clientMatch || repMatch;
    }

    return true;
  }) || [];

  const visitCount = filteredActivities.filter(a => a.type === "visit").length || 0;
  const callCount = filteredActivities.filter(a => a.type === "call").length || 0;
  const pendingCount = filteredActivities.filter(a => a.status === "pending").length || 0;
  const completedCount = filteredActivities.filter(a => a.status === "completed").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Atividades e Interações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filteredActivities.length} de {activities?.length || 0} atividades</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 h-11">
          <Plus className="h-4 w-4" />
          Nova Atividade
        </Button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por título, descrição, cliente ou representante..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 h-11"
        />
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-11">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Visitas</p>
                <p className="text-xl font-bold">{visitCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ligações</p>
                <p className="text-xl font-bold">{callCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-xl font-bold text-green-600">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="relative">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted/50" /></Card>
            ))}
          </div>
        ) : filteredActivities?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma atividade encontrada para o período selecionado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActivities?.map(activity => {
              const typeConfig = ACTIVITY_TYPES[activity.type as keyof typeof ACTIVITY_TYPES] || ACTIVITY_TYPES.demo;
              const TypeIcon = typeConfig.icon;
              const isPending = activity.status === "pending";
              const isCompleted = activity.status === "completed";

              return (
                <Card key={activity.id} className={`transition-all hover:shadow-md ${isCompleted ? "opacity-75" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${typeConfig.color}`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {activity.title}
                          </p>
                          <Badge variant="outline" className={`text-xs border ${typeConfig.color}`}>
                            {typeConfig.label}
                          </Badge>
                          {isPending ? (
                            <Badge className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-200">Pendente</Badge>
                          ) : isCompleted ? (
                            <Badge className="text-xs bg-green-100 text-green-800 border border-green-200">Concluído</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Cancelado</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {activity.clientName && <span>🏢 {activity.clientName}</span>}
                          {activity.repName && <span>👤 {activity.repName}</span>}
                          {activity.scheduledAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(activity.scheduledAt).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit", year: "numeric",
                                hour: "2-digit", minute: "2-digit"
                              })}
                            </span>
                          )}
                          {activity.location && <span>📍 {activity.location}</span>}
                          {activity.duration && <span>⏱ {activity.duration} min</span>}
                        </div>

                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{activity.description}</p>
                        )}

                        {activity.outcome && (
                          <div className="mt-2 bg-green-50 dark:bg-green-900/20 rounded p-2">
                            <p className="text-xs text-green-700 dark:text-green-400">
                              <span className="font-medium">Resultado: </span>{activity.outcome}
                            </p>
                          </div>
                        )}
                      </div>

                      {isPending && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 shrink-0 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => completeMutation.mutate({ id: activity.id })}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Concluir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={newActivity.type} onValueChange={v => setNewActivity(p => ({ ...p, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data/Hora</Label>
                <Input type="datetime-local" value={newActivity.scheduledAt} onChange={e => setNewActivity(p => ({ ...p, scheduledAt: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={newActivity.title} onChange={e => setNewActivity(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Visita técnica Fazenda São João" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={newActivity.clientId} onValueChange={v => setNewActivity(p => ({ ...p, clientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Representante</Label>
                <Select value={newActivity.representativeId} onValueChange={v => setNewActivity(p => ({ ...p, representativeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {reps?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Local</Label>
                <Input value={newActivity.location} onChange={e => setNewActivity(p => ({ ...p, location: e.target.value }))} placeholder="Endereço ou link" />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input type="number" value={newActivity.duration} onChange={e => setNewActivity(p => ({ ...p, duration: e.target.value }))} placeholder="60" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={newActivity.description} onChange={e => setNewActivity(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button className="h-11 w-full sm:w-auto" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              className="h-11 w-full sm:w-auto"
              onClick={() => createMutation.mutate({
                type: newActivity.type,
                title: newActivity.title,
                description: newActivity.description || undefined,
                clientId: newActivity.clientId ? Number(newActivity.clientId) : undefined,
                representativeId: newActivity.representativeId ? Number(newActivity.representativeId) : undefined,
                scheduledAt: newActivity.scheduledAt ? new Date(newActivity.scheduledAt).getTime() : undefined,
                location: newActivity.location || undefined,
                duration: newActivity.duration ? Number(newActivity.duration) : undefined,
              })}
              disabled={!newActivity.title || createMutation.isPending}
            >
              {createMutation.isPending ? "Registrando..." : "Registrar Atividade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
