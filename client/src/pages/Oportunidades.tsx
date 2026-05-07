import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Loader2, Search, TrendingUp,
  Target, AlertTriangle, CheckCircle, Clock, GripVertical
} from "lucide-react";

const STAGES = [
  { key: "prospecting", label: "Prospecção", color: "bg-slate-50 border-slate-200", hdr: "bg-slate-500" },
  { key: "qualification", label: "Qualificação", color: "bg-blue-50 border-blue-200", hdr: "bg-blue-500" },
  { key: "proposal", label: "Proposta", color: "bg-yellow-50 border-yellow-200", hdr: "bg-yellow-500" },
  { key: "negotiation", label: "Negociação", color: "bg-orange-50 border-orange-200", hdr: "bg-orange-500" },
  { key: "won", label: "Ganho", color: "bg-green-50 border-green-200", hdr: "bg-green-500" },
  { key: "lost", label: "Perdido", color: "bg-red-50 border-red-200", hdr: "bg-red-500" },
];

function fmt(v: number) {
  if (v >= 1000000) return "R$ " + (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return "R$ " + (v / 1000).toFixed(0) + "K";
  return "R$ " + v.toFixed(0);
}

interface Opp {
  id: number;
  title: string;
  stage: "prospecting" | "qualification" | "proposal" | "negotiation" | "won" | "lost";
  value: number;
  probability: number | null;
  clientId: number | null;
  representativeId: number | null;
  regionId: number | null;
  product: string | null;
  notes: string | null;
  expectedCloseDate: Date | null;
  clientName: string | null;
  repName: string | null;
  regionName: string | null;
  regionCode: string | null;
  clientType: "fazenda_ruminantes" | "fabrica_racao" | "revenda_agropecuaria" | null;
  lostReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SimpleItem { id: number; name: string; }

function OppForm({ opp, onClose, onSaved, clients, reps, regions }: {
  opp?: Opp;
  onClose: () => void;
  onSaved: () => void;
  clients: SimpleItem[];
  reps: SimpleItem[];
  regions: SimpleItem[];
}) {
  const isEdit = !!opp;
  const [form, setForm] = useState({
    title: opp?.title ?? "",
    clientId: opp?.clientId ? String(opp.clientId) : "",
    representativeId: opp?.representativeId ? String(opp.representativeId) : "",
    regionId: opp?.regionId ? String(opp.regionId) : "",
    stage: opp?.stage ?? "prospecting",
    value: opp?.value ? String(opp.value) : "",
    probability: opp?.probability ? String(opp.probability) : "20",
    product: opp?.product ?? "",
    notes: opp?.notes ?? "",
    expectedCloseDate: opp?.expectedCloseDate
      ? new Date(opp.expectedCloseDate).toISOString().split("T")[0]
      : "",
  });
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const createM = trpc.opportunities.create.useMutation({
    onSuccess: () => { toast.success("Oportunidade criada!"); onSaved(); onClose(); },
    onError: e => toast.error(e.message),
  });
  const updateM = trpc.opportunities.update.useMutation({
    onSuccess: () => { toast.success("Oportunidade atualizada!"); onSaved(); onClose(); },
    onError: e => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    const payload = {
      title: form.title.trim(),
      clientId: form.clientId ? parseInt(form.clientId) : undefined,
      representativeId: form.representativeId ? parseInt(form.representativeId) : undefined,
      regionId: form.regionId ? parseInt(form.regionId) : undefined,
      stage: form.stage as "prospecting" | "qualification" | "proposal" | "negotiation" | "won" | "lost",
      value: form.value ? parseFloat(form.value) : undefined,
      probability: form.probability ? parseInt(form.probability) : undefined,
      product: form.product || undefined,
      notes: form.notes || undefined,
      expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate).getTime() : undefined,
    };
    if (isEdit && opp) updateM.mutate({ id: opp.id, ...payload });
    else createM.mutate(payload);
  };

  const busy = createM.isPending || updateM.isPending;

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar Oportunidade" : "Nova Oportunidade"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div>
          <label className="text-sm font-medium mb-1 block">Título *</label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: Venda Premix - Fazenda São João" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Cliente</label>
            <Select value={form.clientId || "none"} onValueChange={v => set("clientId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Representante</label>
            <Select value={form.representativeId || "none"} onValueChange={v => set("representativeId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {reps.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Estágio</label>
            <Select value={form.stage} onValueChange={v => set("stage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
            <Input type="number" value={form.value} onChange={e => set("value", e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Probabilidade (%)</label>
            <Input type="number" min="0" max="100" value={form.probability} onChange={e => set("probability", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Data Prevista</label>
            <Input type="date" value={form.expectedCloseDate} onChange={e => set("expectedCloseDate", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Região</label>
            <Select value={form.regionId || "none"} onValueChange={v => set("regionId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {regions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Produto</label>
            <Input value={form.product} onChange={e => set("product", e.target.value)} placeholder="Ex: Premix Bovino" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Observações</label>
          <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Notas sobre a oportunidade..." />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={busy} className="bg-green-600 hover:bg-green-700">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function Oportunidades() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editOpp, setEditOpp] = useState<Opp | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const oppsQ = trpc.opportunities.list.useQuery({ search: search || undefined });
  const clientsQ = trpc.clients.list.useQuery();
  const repsQ = trpc.representatives.list.useQuery();
  const regionsQ = trpc.regions.list.useQuery();
  const utils = trpc.useUtils();

  const updateStageM = trpc.opportunities.updateStage.useMutation({
    onMutate: async ({ id, stage }) => {
      await utils.opportunities.list.cancel();
      const prev = utils.opportunities.list.getData({ search: search || undefined });
      utils.opportunities.list.setData({ search: search || undefined }, old =>
        old?.map((o: Opp) => o.id === id ? { ...o, stage } : o)
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) utils.opportunities.list.setData({ search: search || undefined }, ctx.prev);
      toast.error("Erro ao mover oportunidade");
    },
    onSettled: () => utils.opportunities.list.invalidate(),
  });

  const deleteM = trpc.opportunities.delete.useMutation({
    onSuccess: () => { toast.success("Oportunidade excluída!"); oppsQ.refetch(); },
    onError: e => toast.error(e.message),
  });

  const allOpps = ((oppsQ.data as unknown[]) || []).map(o => o as Opp);
  const clients = ((clientsQ.data as unknown[]) || []).map((c: unknown) => {
    const r = c as Record<string, unknown>;
    return { id: Number(r.id), name: String(r.name) };
  });
  const reps = ((repsQ.data as unknown[]) || []).map((r: unknown) => {
    const row = r as Record<string, unknown>;
    return { id: Number(row.id), name: String(row.name) };
  });
  const regions = ((regionsQ.data as unknown[]) || []).map((r: unknown) => {
    const row = r as Record<string, unknown>;
    return { id: Number(row.id), name: String(row.name) };
  });

  const handleDrop = (stage: string) => {
    if (dragId !== null) {
      const opp = allOpps.find(o => o.id === dragId);
      if (opp && opp.stage !== stage) {
        updateStageM.mutate({ id: dragId, stage: stage as "prospecting" | "qualification" | "proposal" | "negotiation" | "won" | "lost" });
      }
    }
    setDragId(null);
    setDragOverStage(null);
  };

  const handleDelete = (opp: Opp) => {
    if (window.confirm(`Excluir "${opp.title}"? Esta ação não pode ser desfeita.`)) {
      deleteM.mutate({ id: opp.id });
    }
  };

  const activeOpps = allOpps.filter(o => !["won", "lost"].includes(o.stage ?? ""));
  const totalPipeline = activeOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const wonOpps = allOpps.filter(o => o.stage === "won");
  const totalWon = wonOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const convRate = allOpps.length > 0 ? Math.round((wonOpps.length / allOpps.length) * 100) : 0;
  const staleCount = activeOpps.filter(o => {
    const days = o.updatedAt ? Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / 86400000) : 0;
    return days > 14;
  }).length;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pipeline de Oportunidades</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Kanban de vendas — {allOpps.length} oportunidades</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 gap-2 h-11">
            <Plus className="w-4 h-4" /> Nova Oportunidade
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div><p className="text-xl font-bold">{fmt(totalPipeline)}</p><p className="text-xs text-gray-500">Pipeline Ativo</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div><p className="text-xl font-bold">{fmt(totalWon)}</p><p className="text-xs text-gray-500">Total Ganho</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div><p className="text-xl font-bold">{convRate}%</p><p className="text-xs text-gray-500">Taxa Conversão</p></div>
          </CardContent></Card>
          <Card className={staleCount > 0 ? "border-amber-200 bg-amber-50" : ""}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={"w-10 h-10 rounded-lg flex items-center justify-center " + (staleCount > 0 ? "bg-amber-100" : "bg-gray-100")}>
                <AlertTriangle className={"w-5 h-5 " + (staleCount > 0 ? "text-amber-600" : "text-gray-400")} />
              </div>
              <div>
                <p className={"text-xl font-bold " + (staleCount > 0 ? "text-amber-700" : "")}>{staleCount}</p>
                <p className="text-xs text-gray-500">Paradas (+14d)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar oportunidade..." className="pl-9" />
        </div>

        {/* Kanban */}
        {oppsQ.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
        ) : (
          <div className="-mx-3 sm:mx-0">
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 px-3 sm:px-0 snap-x snap-mandatory">
            {STAGES.map(stage => {
              const stageOpps = allOpps.filter(o => o.stage === stage.key);
              const stageTotal = stageOpps.reduce((s, o) => s + (o.value ?? 0), 0);
              const isDragOver = dragOverStage === stage.key;
              return (
                <div key={stage.key} className="flex-shrink-0 w-[85vw] sm:w-72 snap-start"
                  onDragOver={e => { e.preventDefault(); setDragOverStage(stage.key); }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={() => handleDrop(stage.key)}
                >
                  <div className={`rounded-xl border-2 transition-all ${stage.color} ${isDragOver ? "border-green-400 shadow-lg scale-[1.01]" : ""}`}>
                    {/* Column Header */}
                    <div className={`rounded-t-xl px-4 py-3 text-white ${stage.hdr}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{stage.label}</span>
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{stageOpps.length}</span>
                      </div>
                      <p className="text-xs text-white/80 mt-0.5">{fmt(stageTotal)}</p>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 min-h-32">
                      {stageOpps.map(opp => {
                        const daysSince = opp.updatedAt
                          ? Math.floor((Date.now() - new Date(opp.updatedAt).getTime()) / 86400000)
                          : null;
                        const isStale = daysSince !== null && daysSince > 14;
                        return (
                          <div key={opp.id}
                            draggable
                            onDragStart={e => { setDragId(opp.id); e.dataTransfer.effectAllowed = "move"; }}
                            className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${dragId === opp.id ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <div className="flex items-start gap-1 flex-1 min-w-0">
                                <GripVertical className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
                                <p className="text-xs font-semibold leading-tight">{opp.title}</p>
                              </div>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={e => { e.stopPropagation(); setEditOpp(opp); }}
                                  className="p-1 rounded hover:bg-blue-50 text-blue-500"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDelete(opp); }}
                                  className="p-1 rounded hover:bg-red-50 text-red-500"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {opp.clientName && (
                              <p className="text-xs text-gray-500 truncate mb-1">🏢 {opp.clientName}</p>
                            )}
                            {opp.repName && (
                              <p className="text-xs text-gray-400 truncate mb-1">👤 {opp.repName}</p>
                            )}

                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-xs font-bold text-green-700">{fmt(opp.value ?? 0)}</span>
                              <span className="text-xs text-gray-400">{opp.probability ?? 0}%</span>
                            </div>
                            <div className="mt-1 w-full h-1 bg-gray-100 rounded-full">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${opp.probability ?? 0}%` }} />
                            </div>

                            {opp.product && (
                              <p className="text-xs text-gray-400 mt-1 truncate">📦 {opp.product}</p>
                            )}

                            {isStale && (
                              <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Sem movimentação há {daysSince}d</span>
                              </div>
                            )}

                            {opp.expectedCloseDate && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(opp.expectedCloseDate).toLocaleDateString("pt-BR")}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {stageOpps.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                          Arraste oportunidades aqui
                        </div>
                      )}
                    </div>

                    {/* Add button at bottom of column */}
                    {!["won", "lost"].includes(stage.key) && (
                      <div className="p-2 border-t border-gray-100">
                        <button
                          onClick={() => setShowCreate(true)}
                          className="w-full flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-600 py-1.5 px-2 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar oportunidade
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <Dialog open={true} onOpenChange={setShowCreate}>
          <OppForm
            onClose={() => setShowCreate(false)}
            onSaved={() => oppsQ.refetch()}
            clients={clients}
            reps={reps}
            regions={regions}
          />
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editOpp && (
        <Dialog open={true} onOpenChange={() => setEditOpp(null)}>
          <OppForm
            opp={editOpp}
            onClose={() => setEditOpp(null)}
            onSaved={() => oppsQ.refetch()}
            clients={clients}
            reps={reps}
            regions={regions}
          />
        </Dialog>
      )}
    </DashboardLayout>
  );
}
