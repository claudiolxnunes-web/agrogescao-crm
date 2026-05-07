import { useRef } from "react";
import { useState } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import {
  Search, Plus, Edit2, Trash2, Users, TrendingUp, MapPin, Phone, Mail,
  Star, AlertTriangle, CheckCircle, Loader2, Eye, Target, Activity, BarChart2,
  KeyRound, ShieldCheck, ShieldOff, Copy, RefreshCw, MessageCircle, Download
} from "lucide-react";

function fmt(v: number) {
  if (v >= 1000000) return "R$ " + (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return "R$ " + (v / 1000).toFixed(0) + "K";
  return "R$ " + v.toFixed(0);
}
function scoreColor(s: number) {
  return s >= 80 ? "text-green-600" : s >= 60 ? "text-yellow-600" : "text-red-600";
}
function scoreBarCls(s: number) {
  return s >= 80 ? "bg-green-500" : s >= 60 ? "bg-yellow-500" : "bg-red-500";
}

interface Rep {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  regionId: number | null;
  regionName: string | null;
  territory: string | null;
  status: string | null;
  performanceScore: number | null;
  totalSales: number | null;
  totalClients: number | null;
  activeOpportunities: number | null;
  userId: number | null;
  initialPassword: string | null;
  homeState: string | null;
}

function CredentialsModal({ repId, repName, onClose, onSaved }: { repId: number; repName: string; onClose: () => void; onSaved?: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const credQ = trpc.representatives.getCredentials.useQuery({ id: repId });
  const resetM = trpc.representatives.resetPassword.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success(`✅ Email enviado com credenciais para ${repName}`);
      } else {
        toast.warning(`Senha redefinida, mas email não foi enviado`);
      }
      credQ.refetch();
      onSaved?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado!`));
  };

  const shareViaWhatsApp = () => {
    if (!cred?.email || !cred?.initialPassword) {
      toast.error('Credenciais não disponíveis');
      return;
    }
    const appUrl = 'https://agrocrm-gtijlihc.manus.space/campo';
    const message = `Olá! Aqui estão suas credenciais de acesso ao AgroGestão CRM:\n\n👤 Representante: ${repName}\n📱 Link do App: ${appUrl}\n📧 Email: ${cred.email}\n🔐 Senha: ${cred.initialPassword}\n\nFaça login e comece a usar o sistema!`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const copyAllCredentials = () => {
    if (!cred?.email || !cred?.initialPassword) {
      toast.error('Credenciais não disponíveis');
      return;
    }
    const appUrl = 'https://agrocrm-gtijlihc.manus.space/campo';
    const text = `Representante: ${repName}\nLink do App: ${appUrl}\nEmail: ${cred.email}\nSenha: ${cred.initialPassword}`;
    navigator.clipboard.writeText(text).then(() => toast.success('Credenciais copiadas!'));
  };

  const downloadQRCode = () => {
    const qrElement = document.getElementById(`qrcode-${repId}`);
    if (!qrElement) {
      toast.error('QR Code não encontrado');
      return;
    }
    const canvas = document.querySelector(`#qrcode-${repId} canvas`) as HTMLCanvasElement;
    if (!canvas) {
      toast.error('Não foi possível exportar o QR Code');
      return;
    }
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    const fileName = `qrcode-${repName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code baixado com sucesso!');
  };

  const cred = credQ.data;
  const qrUrl = cred?.email ? `https://agrocrm-gtijlihc.manus.space/campo?email=${encodeURIComponent(cred.email)}` : 'https://agrocrm-gtijlihc.manus.space/campo';

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-green-600" />
          Credenciais de Acesso
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm font-medium text-green-800 mb-1">Representante</p>
          <p className="text-green-700 font-semibold">{repName}</p>
        </div>
        {credQ.isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
        ) : !cred?.userId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Este representante ainda nao tem acesso criado. Use o botao abaixo para gerar credenciais. Um email será enviado automaticamente.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email de Acesso</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono">{cred.email}</div>
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => copyToClipboard(cred.email || '', 'Email')}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Senha Atual</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono">
                    {showPassword ? (cred.initialPassword || '(nao disponivel)') : '••••••••'}
                  </div>
                  <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </Button>
                  {showPassword && cred.initialPassword && (
                    <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => copyToClipboard(cred.initialPassword || '', 'Senha')}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <strong>URL de acesso:</strong> {window.location.origin}/campo
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Escaneie para acessar o app</p>
              <div id={`qrcode-${repId}`} className="bg-white p-3 border-2 border-gray-200 rounded-lg">
                <QRCode value={qrUrl} size={150} level="H" includeMargin={true} />
              </div>
              <Button
                onClick={downloadQRCode}
                variant="outline"
                size="sm"
                className="gap-2 w-full"
              >
                <Download className="w-4 h-4" />
                Baixar QR Code
              </Button>
            </div>
          </>
        )}
      </div>
      <DialogFooter className="gap-2 flex-wrap">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        {cred?.email && cred?.initialPassword && (
          <>
            <Button
              onClick={copyAllCredentials}
              variant="outline"
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar Credenciais
            </Button>
            <Button
              onClick={shareViaWhatsApp}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Compartilhar WhatsApp
            </Button>
          </>
        )}
        <Button
          onClick={() => resetM.mutate({ id: repId })}
          disabled={resetM.isPending}
          className="bg-amber-600 hover:bg-amber-700 gap-2"
        >
          {resetM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Redefinir Senha
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RepForm({
  rep, onClose, onSaved, regions,
}: {
  rep?: Rep;
  onClose: () => void;
  onSaved: () => void;
  regions: Array<{ id: number; name: string }>;
}) {
  const isEdit = !!rep;
  const [form, setForm] = useState({
    name: rep?.name ?? "",
    email: rep?.email ?? "",
    phone: rep?.phone ?? "",
    regionId: rep?.regionId ? String(rep.regionId) : "",
    territory: rep?.territory ?? "",
    status: rep?.status ?? "active",
    homeState: rep?.homeState ?? "",
  });
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const createM = trpc.representatives.create.useMutation({
    onSuccess: () => { toast.success("Representante criado!"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateM = trpc.representatives.update.useMutation({
    onSuccess: () => { toast.success("Representante atualizado!"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Nome obrigatorio"); return; }
    if (!form.email.trim()) { toast.error("Email obrigatorio"); return; }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone || undefined,
      regionId: form.regionId ? parseInt(form.regionId) : undefined,
      territory: form.territory || undefined,
      status: form.status as "active" | "inactive",
      homeState: form.homeState || undefined,
    };
    if (isEdit && rep) updateM.mutate({ id: rep.id, ...payload });
    else createM.mutate(payload);
  };

  return (
    <DialogContent className="w-full max-w-lg sm:max-w-lg mx-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar Representante" : "Novo Representante"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div>
          <label className="text-sm font-medium mb-1 block">Nome Completo *</label>
          <Input className="h-11" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nome do representante" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Email *</label>
          <Input className="h-11" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@empresa.com" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Telefone</label>
            <Input className="h-11" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Regiao</label>
            <Select value={form.regionId} onValueChange={v => set("regionId", v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {regions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Status</label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Territorio / Area de Atuacao</label>
            <Input className="h-11" value={form.territory} onChange={e => set("territory", e.target.value)} placeholder="Ex: Interior SP" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Estado Sede (UF)</label>
            <Select value={form.homeState || "__none__"} onValueChange={v => set("homeState", v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nao informado</SelectItem>
                {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button className="h-11 w-full sm:w-auto" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="h-11 w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={createM.isPending || updateM.isPending}>
          {createM.isPending || updateM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RepDetailModal({ repId, onClose, onEdit }: {
  repId: number;
  onClose: () => void;
  onEdit: () => void;
}) {
  const detailQ = trpc.representatives.getById.useQuery({ id: repId });
  const historyQ = trpc.representatives.getSalesHistory.useQuery({ representativeId: repId });

  if (detailQ.isLoading) return (
    <DialogContent className="max-w-2xl">
      <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
    </DialogContent>
  );

  const rep = detailQ.data as Record<string, unknown> | null | undefined;
  if (!rep) return null;

  const score = Number(rep.performanceScore) || 0;
  const histData = ((historyQ.data as unknown[]) || []).map((h: unknown) => {
    const row = h as Record<string, unknown>;
    return {
      month: String(row.month || "").substring(0, 7),
      vendas: Number(row.totalSales) || 0,
    };
  });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="bg-gradient-to-r from-green-600 to-green-700 -mx-6 -mt-6 px-6 py-5 rounded-t-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                {String(rep.name || "").split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{String(rep.name || "")}</h2>
              <p className="text-white/80 text-sm">{String(rep.regionName || "Sem regiao")}</p>
              {!!rep.territory && <p className="text-white/70 text-xs mt-0.5">{String(rep.territory)}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-200">{score}</div>
            <p className="text-white/70 text-xs">Score</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "Vendas", value: fmt(Number(rep.totalSales) || 0) },
            { label: "Clientes", value: String(rep.totalClients || 0) },
            { label: "Oport.", value: String(rep.activeOpportunities || 0) },
            { label: "Status", value: rep.status === "active" ? "Ativo" : "Inativo" },
          ].map(item => (
            <div key={item.label} className="bg-white/20 rounded-lg p-2 text-center">
              <p className="text-sm font-bold">{String(item.value)}</p>
              <p className="text-xs opacity-80">{String(item.label)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          {!!rep.email && (
            <a href={"mailto:" + String(rep.email)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
              <Mail className="w-4 h-4" />{String(rep.email)}
            </a>
          )}
          {!!rep.phone && (
            <a href={"tel:" + String(rep.phone)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
              <Phone className="w-4 h-4" />{String(rep.phone)}
            </a>
          )}
        </div>
        <Tabs defaultValue="performance">
          <TabsList className="w-full">
            <TabsTrigger value="performance" className="flex-1">Performance</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Historico de Vendas</TabsTrigger>
          </TabsList>
          <TabsContent value="performance" className="mt-4 space-y-3">
            {[
              { label: "Performance Geral", value: score, icon: Star },
              { label: "Vendas vs Meta", value: Math.min(100, Math.round((Number(rep.totalSales) || 0) / 1500)), icon: Target },
              { label: "Atividade de Campo", value: 75, icon: Activity },
              { label: "Conversao de Oportunidades", value: 68, icon: TrendingUp },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <item.icon className="w-3.5 h-3.5" />{item.label}
                  </span>
                  <span className={item.value >= 80 ? "font-bold text-green-600" : item.value >= 60 ? "font-bold text-yellow-600" : "font-bold text-red-600"}>
                    {item.value}%
                  </span>
                </div>
                <Progress value={item.value} className="h-2" />
              </div>
            ))}
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            {histData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Sem historico disponivel</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={histData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 1000).toFixed(0) + "K"} />
                  <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
                  <Line type="monotone" dataKey="vendas" stroke="#16a34a" strokeWidth={2} dot={false} name="Vendas" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={onEdit}>
          <Edit2 className="w-4 h-4 mr-2" /> Editar Representante
        </Button>
      </div>
    </DialogContent>
  );
}

export default function Representantes() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editRep, setEditRep] = useState<Rep | null>(null);
  const [detailRepId, setDetailRepId] = useState<number | null>(null);
  const [credRepId, setCredRepId] = useState<number | null>(null);
  const [credRepName, setCredRepName] = useState("");

  const repsQ = trpc.representatives.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as "active" | "inactive") : undefined,
  });
  const regionsQ = trpc.regions.list.useQuery();
  const deleteM = trpc.representatives.delete.useMutation({
    onSuccess: () => { toast.success("Representante excluido!"); repsQ.refetch(); },
    onError: e => toast.error(e.message),
  });

  const allReps = ((repsQ.data as unknown[]) || []).map(r => r as Rep);
  const regions = ((regionsQ.data as unknown[]) || []).map((r: unknown) => {
    const row = r as Record<string, unknown>;
    return { id: Number(row.id), name: String(row.name) };
  });
  const filtered = allReps.filter(r =>
    regionFilter === "all" || String(r.regionId) === regionFilter
  );

  const active = allReps.filter(r => r.status === "active").length;
  const avgScore = allReps.length > 0
    ? Math.round(allReps.reduce((s, r) => s + (r.performanceScore || 0), 0) / allReps.length)
    : 0;
  const totalSales = allReps.reduce((s, r) => s + (r.totalSales || 0), 0);
  const atRisk = allReps.filter(r => (r.performanceScore || 0) < 60).length;

  const alerts = [
    ...allReps
      .filter(r => (r.performanceScore || 0) < 60)
      .map(r => ({ type: "danger" as const, msg: r.name + " — Performance baixa (" + (r.performanceScore || 0) + "pts)" })),
    ...allReps
      .filter(r => (r.activeOpportunities || 0) === 0 && r.status === "active")
      .map(r => ({ type: "warning" as const, msg: r.name + " — Sem oportunidades ativas" })),
  ].slice(0, 5);

  const chartData = [...filtered]
    .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    .slice(0, 10)
    .map(r => ({ name: r.name.split(" ")[0], vendas: r.totalSales || 0 }));

  const handleDelete = (r: Rep) => {
    if (confirm("Excluir " + r.name + "? Esta acao nao pode ser desfeita.")) {
      deleteM.mutate({ id: r.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestao de Representantes</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Painel do Gerente Regional — {allReps.length} representantes cadastrados</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 gap-2 h-11">
            <Plus className="w-4 h-4" /> Novo Representante
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{active}</p>
                  <p className="text-xs text-gray-500">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgScore}</p>
                  <p className="text-xs text-gray-500">Score Medio</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{fmt(totalSales)}</p>
                  <p className="text-xs text-gray-500">Total Vendas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={atRisk > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={"w-10 h-10 rounded-lg flex items-center justify-center " + (atRisk > 0 ? "bg-red-100" : "bg-gray-100")}>
                  <AlertTriangle className={"w-5 h-5 " + (atRisk > 0 ? "text-red-600" : "text-gray-400")} />
                </div>
                <div>
                  <p className={"text-2xl font-bold " + (atRisk > 0 ? "text-red-600" : "")}>{atRisk}</p>
                  <p className="text-xs text-gray-500">Em Risco</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-green-600" /> Ranking de Vendas da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => (v / 1000).toFixed(0) + "K"} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={65} />
                  <Tooltip formatter={(v: unknown) => [fmt(Number(v)), "Vendas"]} />
                  <Bar dataKey="vendas" fill="#16a34a" radius={[0, 4, 4, 0]} name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <CheckCircle className="w-10 h-10 mb-2 text-green-400" />
                  <p className="text-sm font-medium text-green-600">Equipe em dia!</p>
                  <p className="text-xs mt-1">Todos os representantes com boa performance</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((a, i) => (
                    <div key={i} className={"flex items-start gap-2 p-2.5 rounded-lg text-xs " + (a.type === "danger" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100")}>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{a.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar representante..." className="pl-9 h-11" />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="h-11 w-full sm:w-44"><SelectValue placeholder="Regiao" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as regioes</SelectItem>
              {regions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {filtered.length} representante{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Rep Cards Grid */}
        {repsQ.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum representante encontrado</p>
              <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Cadastrar Representante
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => {
              const score = r.performanceScore || 0;
              return (
                <Card key={r.id} className="hover:shadow-md transition-all group border border-gray-100">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-green-100">
                          <AvatarFallback className="bg-green-100 text-green-700 font-bold text-sm">
                            {r.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.regionName || "Sem regiao"}</p>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <Badge variant="outline" className={"text-xs " + (r.status === "active" ? "border-green-200 text-green-700 bg-green-50" : "border-gray-200 text-gray-500")}>
                              {r.status === "active" ? "Ativo" : "Inativo"}
                            </Badge>
                            {r.userId ? (
                              <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50 gap-1">
                                <ShieldCheck className="w-2.5 h-2.5" /> Tem Acesso
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-gray-200 text-gray-400 gap-1">
                                <ShieldOff className="w-2.5 h-2.5" /> Sem Acesso
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={"text-xl font-bold " + scoreColor(score)}>{score}</p>
                        <p className="text-xs text-gray-400">score</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Performance</span>
                        <span className={scoreColor(score)}>{score}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={"h-full rounded-full transition-all " + scoreBarCls(score)} style={{ width: score + "%" }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs font-bold text-green-700">{fmt(r.totalSales || 0)}</p>
                        <p className="text-xs text-gray-400">Vendas</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xs font-bold text-blue-700">{r.totalClients || 0}</p>
                        <p className="text-xs text-gray-400">Clientes</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2">
                        <p className="text-xs font-bold text-purple-700">{r.activeOpportunities || 0}</p>
                        <p className="text-xs text-gray-400">Oport.</p>
                      </div>
                    </div>

                    {r.territory && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{r.territory}</span>
                      </div>
                    )}

                    {score < 60 && (
                      <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mb-3 border border-red-100">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Performance abaixo da meta — requer atencao</span>
                      </div>
                    )}

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setDetailRepId(r.id)}>
                        <Eye className="w-3 h-3 mr-1" /> Ver
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setEditRep(r)}>
                        <Edit2 className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-blue-600 hover:bg-blue-50 hover:border-blue-200" onClick={() => { setCredRepId(r.id); setCredRepName(r.name); }}>
                        <KeyRound className="w-3 h-3 mr-1" /> Acesso
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:border-red-200" onClick={() => handleDelete(r)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailRepId !== null && (
        <Dialog open={true} onOpenChange={() => setDetailRepId(null)}>
          <RepDetailModal
            repId={detailRepId}
            onClose={() => setDetailRepId(null)}
            onEdit={() => {
              const r = allReps.find(x => x.id === detailRepId);
              if (r) { setEditRep(r); setDetailRepId(null); }
            }}
          />
        </Dialog>
      )}

      {/* Edit Modal */}
      {editRep && (
        <Dialog open={true} onOpenChange={() => setEditRep(null)}>
          <RepForm rep={editRep} onClose={() => setEditRep(null)} onSaved={() => repsQ.refetch()} regions={regions} />
        </Dialog>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Dialog open={true} onOpenChange={setShowCreate}>
          <RepForm onClose={() => setShowCreate(false)} onSaved={() => repsQ.refetch()} regions={regions} />
        </Dialog>
      )}

      {/* Credentials Modal */}
      {credRepId !== null && (
        <Dialog open={true} onOpenChange={() => { setCredRepId(null); setCredRepName(""); }}>
          <CredentialsModal repId={credRepId} repName={credRepName} onClose={() => { setCredRepId(null); setCredRepName(""); }} onSaved={() => repsQ.refetch()} />
        </Dialog>
      )}
    </DashboardLayout>
  );
}
