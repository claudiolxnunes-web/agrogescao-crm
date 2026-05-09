import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Phone, MapPin, FileText, ShoppingCart, Send, CheckCircle2,
  Plus, Minus, Calendar, User, LogOut, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActivityEntry {
  id: string;
  type: "visit" | "call" | "proposal" | "order";
  clientName: string;
  subject: string;
  value?: number;
  duration?: number;
  result: string;
  notes: string;
}

interface FieldUser {
  id: number; // representative ID
  userId: number; // user account ID
  name: string;
  email: string;
  regionName: string | null;
  phone: string | null;
}

// ─── Activity Card Component ──────────────────────────────────────────────────
function ActivityCard({
  entry,
  onRemove,
}: {
  entry: ActivityEntry;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const icons = {
    visit: <MapPin className="w-4 h-4" />,
    call: <Phone className="w-4 h-4" />,
    proposal: <FileText className="w-4 h-4" />,
    order: <ShoppingCart className="w-4 h-4" />,
  };
  const colors = {
    visit: "bg-blue-100 text-blue-700 border-blue-200",
    call: "bg-purple-100 text-purple-700 border-purple-200",
    proposal: "bg-amber-100 text-amber-700 border-amber-200",
    order: "bg-green-100 text-green-700 border-green-200",
  };
  const labels = {
    visit: "Visita",
    call: "Ligação",
    proposal: "Proposta",
    order: "Pedido",
  };

  return (
    <div className={`border rounded-xl p-3 ${colors[entry.type]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icons[entry.type]}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{entry.clientName}</p>
            <p className="text-xs opacity-75 truncate">{entry.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Badge variant="outline" className="text-xs shrink-0">
            {labels[entry.type]}
          </Badge>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-black/10 rounded"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={onRemove}
            className="p-1 hover:bg-red-200 rounded text-red-600"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 text-xs space-y-1 border-t border-current/20 pt-2">
          {entry.value && <p>💰 R$ {entry.value.toLocaleString("pt-BR")}</p>}
          {entry.duration && <p>⏱ {entry.duration} min</p>}
          {entry.result && <p>✅ {entry.result}</p>}
          {entry.notes && <p>📝 {entry.notes}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Add Activity Form ────────────────────────────────────────────────────────
function AddActivityForm({
  onAdd,
  clients,
}: {
  onAdd: (entry: ActivityEntry) => void;
  clients: Array<{ id: number; name: string }>;
}) {
  const [type, setType] = useState<ActivityEntry["type"]>("visit");
  const [clientName, setClientName] = useState("");
  const [subject, setSubject] = useState("");
  const [value, setValue] = useState("");
  const [duration, setDuration] = useState("");
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const typeConfig = [
    { value: "visit", label: "Visita", icon: "🏠", color: "bg-blue-500" },
    { value: "call", label: "Ligação", icon: "📞", color: "bg-purple-500" },
    { value: "proposal", label: "Proposta", icon: "📄", color: "bg-amber-500" },
    { value: "order", label: "Pedido", icon: "🛒", color: "bg-green-500" },
  ];

  const handleAdd = () => {
    if (!clientName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (!subject.trim()) {
      toast.error("Informe o assunto/produto");
      return;
    }
    onAdd({
      id: Date.now().toString(),
      type,
      clientName: clientName.trim(),
      subject: subject.trim(),
      value: value ? parseFloat(value) : undefined,
      duration: duration ? parseInt(duration) : undefined,
      result: result.trim(),
      notes: notes.trim(),
    });
    setClientName("");
    setSubject("");
    setValue("");
    setDuration("");
    setResult("");
    setNotes("");
    setShowForm(false);
    toast.success("Atividade adicionada!");
  };

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="w-full h-12 text-base gap-2 bg-green-600 hover:bg-green-700"
      >
        <Plus className="w-5 h-5" />
        Registrar Atividade
      </Button>
    );
  }

  return (
    <Card className="border-2 border-green-400">
      <CardContent className="p-4 space-y-3">
        {/* Type selector */}
        <div className="grid grid-cols-4 gap-2">
          {typeConfig.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value as ActivityEntry["type"])}
              className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                type === t.value
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-xs font-medium mt-1">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Client name with datalist */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Cliente *
          </label>
          <Input
            list="clients-list"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nome do cliente / fazenda"
            className="h-11"
          />
          <datalist id="clients-list">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            {type === "visit" ? "Motivo da visita" : type === "call" ? "Assunto" : type === "proposal" ? "Produto/Serviço" : "Produto vendido"} *
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={type === "visit" ? "Ex: Apresentação de novo produto" : type === "call" ? "Ex: Follow-up proposta" : "Ex: Premix bovino 40kg"}
            className="h-11"
          />
        </div>

        {/* Value (for proposals and orders) */}
        {(type === "proposal" || type === "order") && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Valor (R$)
            </label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="h-11"
            />
          </div>
        )}

        {/* Duration (for visits and calls) */}
        {(type === "visit" || type === "call") && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Duração (minutos)
            </label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 45"
              className="h-11"
            />
          </div>
        )}

        {/* Result */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Resultado
          </label>
          <Input
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="Ex: Cliente interessado, retorno em 3 dias"
            className="h-11"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Observações
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes adicionais..."
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Campo() {
  const [fieldUser, setFieldUser] = useState<FieldUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("campo_user");
    if (saved) {
      try {
        setFieldUser(JSON.parse(saved));
      } catch {}
    }
    const savedActivities = localStorage.getItem(`campo_activities_${today}`);
    if (savedActivities) {
      try {
        setActivities(JSON.parse(savedActivities));
      } catch {}
    }
    const savedNotes = localStorage.getItem(`campo_notes_${today}`);
    if (savedNotes) setGeneralNotes(savedNotes);
    const savedReportId = localStorage.getItem(`campo_report_${today}`);
    if (savedReportId) setReportId(parseInt(savedReportId));
    const savedSubmitted = localStorage.getItem(`campo_submitted_${today}`);
    if (savedSubmitted === "true") setSubmitted(true);
  }, [today]);

  // Save activities to localStorage whenever they change
  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem(`campo_activities_${today}`, JSON.stringify(activities));
    }
  }, [activities, today]);

  useEffect(() => {
    localStorage.setItem(`campo_notes_${today}`, generalNotes);
  }, [generalNotes, today]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (!data.success) {
        toast.error("Email ou senha incorretos");
        setLoginLoading(false);
      }
      // fieldUser will be set by the useEffect below when getRepByUserIdQ loads
    },
    onError: () => {
      toast.error("Email ou senha incorretos");
      setLoginLoading(false);
    },
  });

  const [loggedUserId, setLoggedUserId] = useState<number | null>(null);
  const getRepByUserIdQ = trpc.representatives.getRepByUserId.useQuery(
    { userId: loggedUserId ?? 0 },
    { enabled: !!loggedUserId }
  );

  // When login succeeds, store the userId to trigger rep lookup
  useEffect(() => {
    if (loginMutation.data?.success && loginMutation.data?.user?.id) {
      setLoggedUserId(loginMutation.data.user.id);
    }
  }, [loginMutation.data]);

  // When rep data loads after login, set fieldUser with correct rep ID
  useEffect(() => {
    if (getRepByUserIdQ.data && loggedUserId && loginMutation.data?.user) {
      const rep = getRepByUserIdQ.data as Record<string, unknown>;
      const user: FieldUser = {
        id: Number(rep.id),
        userId: loggedUserId,
        name: String(rep.name || loginMutation.data.user.name || ""),
        email: String(rep.email || loginMutation.data.user.email || ""),
        regionName: rep.regionName ? String(rep.regionName) : null,
        phone: rep.phone ? String(rep.phone) : null,
      };
      setFieldUser(user);
      localStorage.setItem("campo_user", JSON.stringify(user));
      setLoginLoading(false);
      toast.success(`Bem-vindo, ${user.name}!`);
    } else if (getRepByUserIdQ.data === null && loggedUserId) {
      // User logged in but is not a representative — show error
      toast.error("Este usuário não é um representante cadastrado");
      setLoginLoading(false);
    }
  }, [getRepByUserIdQ.data, loggedUserId]);

  const clientsQuery = trpc.clients.list.useQuery(undefined, {
    enabled: !!fieldUser,
  });

  const recentReportsQuery = trpc.dailyReport.getRecentReports.useQuery(
    { representativeId: fieldUser?.id ?? 0, days: 7 },
    { enabled: !!fieldUser }
  );

  const getOrCreateReport = trpc.dailyReport.getOrCreate.useMutation({
    onSuccess: (data) => {
      if (data) {
        setReportId(data.id);
        localStorage.setItem(`campo_report_${today}`, String(data.id));
      }
    },
  });

  const submitReport = trpc.dailyReport.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      localStorage.setItem(`campo_submitted_${today}`, "true");
      toast.success("Relatório enviado com sucesso! ✅");
    },
    onError: () => {
      toast.error("Erro ao enviar relatório. Tente novamente.");
    },
  });

  const updateReport = trpc.dailyReport.update.useMutation();

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast.error("Preencha email e senha");
      return;
    }
    setLoginLoading(true);
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleLogout = () => {
    setFieldUser(null);
    localStorage.removeItem("campo_user");
    toast.info("Sessão encerrada");
  };

  const handleAddActivity = (entry: ActivityEntry) => {
    setActivities((prev) => [...prev, entry]);
  };

  const handleRemoveActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmitReport = async () => {
    if (!fieldUser) return;
    if (activities.length === 0 && !generalNotes.trim()) {
      toast.error("Adicione pelo menos uma atividade ou observação antes de enviar");
      return;
    }

    // Count by type
    const counts = {
      visits: activities.filter((a) => a.type === "visit").length,
      calls: activities.filter((a) => a.type === "call").length,
      proposals: activities.filter((a) => a.type === "proposal").length,
      orders: activities.filter((a) => a.type === "order").length,
      totalOrderValue: activities
        .filter((a) => a.type === "order")
        .reduce((s, a) => s + (a.value || 0), 0),
    };

    try {
      // Get or create the report
      let currentReportId = reportId;
      if (!currentReportId) {
        const report = await getOrCreateReport.mutateAsync({
          representativeId: fieldUser.id,
          reportDate: today,
        });
        currentReportId = report?.id || null;
      }

      if (!currentReportId) {
        toast.error("Erro ao criar relatório");
        return;
      }

      // Update with counts and notes
      await updateReport.mutateAsync({
        id: currentReportId,
        visitsCount: counts.visits,
        callsCount: counts.calls,
        proposalsCount: counts.proposals,
        ordersCount: counts.orders,
        totalOrderValue: counts.totalOrderValue,
        generalNotes: generalNotes.trim() || undefined,
      });

      // Also create individual activities in the system
      // (we use the activities router for this)
      // For simplicity, we just submit the daily report summary

      // Submit the report
      await submitReport.mutateAsync({ id: currentReportId });
    } catch {
      toast.error("Erro ao enviar relatório");
    }
  };

  const counts = {
    visits: activities.filter((a) => a.type === "visit").length,
    calls: activities.filter((a) => a.type === "call").length,
    proposals: activities.filter((a) => a.type === "proposal").length,
    orders: activities.filter((a) => a.type === "order").length,
    totalOrderValue: activities
      .filter((a) => a.type === "order")
      .reduce((s, a) => s + (a.value || 0), 0),
  };

  // ─── Login Screen ──────────────────────────────────────────────────────────
  if (!fieldUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">🌾</span>
            </div>
            <h1 className="text-2xl font-bold text-white">AgroGestão</h1>
            <p className="text-green-200 text-sm mt-1">Relatório de Campo</p>
          </div>

          <Card className="shadow-2xl">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-12 text-base"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Senha
                </label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 text-base"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
              >
                {loginLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
              <p className="text-center text-xs text-gray-500">
                Use o mesmo email e senha do sistema principal
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Success Screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 className="w-24 h-24 text-white mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-2">
            Relatório Enviado!
          </h2>
          <p className="text-green-200 text-lg mb-2">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <div className="bg-white/20 rounded-2xl p-6 mt-6 text-white space-y-2">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold">{counts.visits}</p>
                <p className="text-sm opacity-80">Visitas</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{counts.calls}</p>
                <p className="text-sm opacity-80">Ligações</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{counts.proposals}</p>
                <p className="text-sm opacity-80">Propostas</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{counts.orders}</p>
                <p className="text-sm opacity-80">Pedidos</p>
              </div>
            </div>
            {counts.totalOrderValue > 0 && (
              <div className="border-t border-white/30 pt-3 mt-3">
                <p className="text-2xl font-bold">
                  R$ {counts.totalOrderValue.toLocaleString("pt-BR")}
                </p>
                <p className="text-sm opacity-80">Total em pedidos</p>
              </div>
            )}
          </div>
          <p className="text-green-200 text-sm mt-6">
            O gerente já pode visualizar seu relatório no sistema.
          </p>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="mt-4 text-white border-white hover:bg-white/20"
          >
            Sair
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main Field Report Screen ──────────────────────────────────────────────
  const clientsList = (clientsQuery.data as any) || [];
  const recentReports = (recentReportsQuery.data as any) || [];

  // Component for displaying recent reports history
  const ReportsHistory = () => {
    if (recentReports.length === 0) return null;
    
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Histórico dos Últimos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {recentReports.map((report: any) => {
            const reportDate = new Date(report.reportDate + 'T00:00:00');
            const isToday = reportDate.toISOString().split('T')[0] === today;
            const statusBadge = report.status === 'submitted' ? (
              <Badge className="bg-green-600 text-white">Enviado</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200">Rascunho</Badge>
            );
            
            return (
              <div key={report.id} className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {reportDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {isToday && <span className="text-xs ml-2 text-blue-600">(Hoje)</span>}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-600">
                      <span>🏠 {report.visitsCount}</span>
                      <span>📞 {report.callsCount}</span>
                      <span>📄 {report.proposalsCount}</span>
                      <span>🛒 {report.ordersCount}</span>
                      {report.totalOrderValue > 0 && <span>💰 R$ {report.totalOrderValue.toLocaleString('pt-BR')}</span>}
                    </div>
                  </div>
                  <div className="ml-2">
                    {statusBadge}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 pt-safe-top pb-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{fieldUser.name}</p>
              <p className="text-green-200 text-xs">
                {fieldUser.regionName || "Representante"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-green-200">Hoje</p>
              <p className="text-sm font-medium">
                {new Date().toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-full"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        {/* Recent Reports History */}
        <ReportsHistory />

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Visitas", count: counts.visits, icon: "🏠", color: "bg-blue-50 border-blue-200" },
            { label: "Ligações", count: counts.calls, icon: "📞", color: "bg-purple-50 border-purple-200" },
            { label: "Propostas", count: counts.proposals, icon: "📄", color: "bg-amber-50 border-amber-200" },
            { label: "Pedidos", count: counts.orders, icon: "🛒", color: "bg-green-50 border-green-200" },
          ].map((item) => (
            <div
              key={item.label}
              className={`${item.color} border rounded-xl p-2 text-center`}
            >
              <p className="text-lg">{item.icon}</p>
              <p className="text-xl font-bold">{item.count}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>

        {counts.totalOrderValue > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 font-medium">💰 Total em Pedidos Hoje</p>
            <p className="text-2xl font-bold text-green-700">
              R$ {counts.totalOrderValue.toLocaleString("pt-BR")}
            </p>
          </div>
        )}

        {/* Activities List */}
        {activities.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Atividades do Dia ({activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {activities.map((entry) => (
                <ActivityCard
                  key={entry.id}
                  entry={entry}
                  onRemove={() => handleRemoveActivity(entry.id)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add Activity */}
        <AddActivityForm
          onAdd={handleAddActivity}
          clients={clientsList.map((c: any) => ({ id: c.id, name: c.name }))}
        />

        {/* General Notes */}
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              📝 Observações Gerais do Dia
            </label>
            <Textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Situação do mercado, dificuldades encontradas, oportunidades identificadas..."
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitReport}
          disabled={submitReport.isPending || getOrCreateReport.isPending || updateReport.isPending}
          className="w-full h-14 text-lg gap-3 bg-green-600 hover:bg-green-700 shadow-lg"
        >
          {submitReport.isPending || getOrCreateReport.isPending || updateReport.isPending ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Send className="w-6 h-6" />
              Enviar Relatório do Dia
            </>
          )}
        </Button>

        <p className="text-center text-xs text-gray-400">
          Ao enviar, o gerente regional receberá seu relatório imediatamente.
        </p>
      </div>
    </div>
  );
}
