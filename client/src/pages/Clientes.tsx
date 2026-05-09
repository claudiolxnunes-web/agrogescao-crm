import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BRAZIL_STATES } from "@shared/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, Eye, Phone, Mail, MapPin,
  TrendingUp, ShoppingCart, Users, Factory, Store,
  Package, Loader2, X, Activity, FileSpreadsheet
} from "lucide-react";


type ClientType = "fazenda_ruminantes" | "fabrica_racao" | "revenda_agropecuaria";

interface Client {
  id: number;
  name: string;
  type: ClientType;
  regionName: string | null;
  regionCode: string | null;
  repName: string | null;
  repId: number | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  cnpj: string | null;
  address: string | null;
  website: string | null;
  status: string | null;
  businessPotential: number | null;
  totalPurchases: number | null;
  lastPurchaseDate: string | null;
  animalCount: number | null;
  animalTypes: string | null;
  productionType: string | null;
  propertyArea: number | null;
  raisingSystem: string | null;
  consumedProducts: string | null;
  productionCapacity: number | null;
  productLines: string | null;
  rationTypes: string | null;
  rawMaterialVolume: number | null;
  coverageArea: string | null;
  productMix: string | null;
  monthlyVolume: number | null;
  finalCustomers: number | null;
  notes: string | null;
  segment: string | null;
}

const typeConfig = {
  fazenda_ruminantes: {
    label: "Fazenda de Ruminantes",
    emoji: "🐄",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-700",
    headerBg: "bg-green-600",
  },
  fabrica_racao: {
    label: "Fábrica de Ração",
    emoji: "🏭",
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
    headerBg: "bg-blue-600",
  },
  revenda_agropecuaria: {
    label: "Revenda Agropecuária",
    emoji: "🏪",
    color: "bg-amber-50 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-700",
    headerBg: "bg-amber-600",
  },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-green-100 text-green-700" },
  inactive: { label: "Inativo", color: "bg-gray-100 text-gray-600" },
  prospect: { label: "Prospecto", color: "bg-blue-100 text-blue-700" },
};

function ClientForm({
  client,
  onClose,
  onSaved,
  representatives,
  regions,
}: {
  client?: Client;
  onClose: () => void;
  onSaved: () => void;
  representatives: Array<{ id: number; name: string }>;
  regions: Array<{ id: number; name: string; code: string }>;
}) {
  const isEdit = !!client;
  const [form, setForm] = useState({
    name: client?.name || "",
    type: (client?.type || "fazenda_ruminantes") as ClientType,
    regionId: "",
    repId: client?.repId ? String(client.repId) : "",
    city: client?.city || "",
    state: client?.state || "",
    phone: client?.phone || "",
    email: client?.email || "",
    contactName: client?.contactName || "",
    cnpj: client?.cnpj || "",
    address: client?.address || "",
    status: client?.status || "active",
    businessPotential: client?.businessPotential ? String(client.businessPotential) : "",
    notes: client?.notes || "",
    animalCount: client?.animalCount ? String(client.animalCount) : "",
    animalTypes: client?.animalTypes || "",
    productionType: client?.productionType || "",
    propertyArea: client?.propertyArea ? String(client.propertyArea) : "",
    raisingSystem: client?.raisingSystem || "",
    consumedProducts: client?.consumedProducts || "",
    productionCapacity: client?.productionCapacity ? String(client.productionCapacity) : "",
    productLines: client?.productLines || "",
    rationTypes: client?.rationTypes || "",
    rawMaterialVolume: client?.rawMaterialVolume ? String(client.rawMaterialVolume) : "",
    coverageArea: client?.coverageArea || "",
    productMix: client?.productMix || "",
    monthlyVolume: client?.monthlyVolume ? String(client.monthlyVolume) : "",
    finalCustomers: client?.finalCustomers ? String(client.finalCustomers) : "",
  });

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => { toast.success("Cliente criado!"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => { toast.success("Cliente atualizado!"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload: any = {
      name: form.name.trim(),
      type: form.type,
      city: form.city || undefined,
      state: form.state || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      contactName: form.contactName || undefined,
      cnpj: form.cnpj || undefined,
      address: form.address || undefined,
      status: form.status || undefined,
      businessPotential: form.businessPotential ? parseFloat(form.businessPotential) : undefined,
      notes: form.notes || undefined,
      representativeId: form.repId ? parseInt(form.repId) : undefined,
      regionId: form.regionId ? parseInt(form.regionId) : undefined,
      animalCount: form.animalCount ? parseInt(form.animalCount) : undefined,
      animalTypes: form.animalTypes || undefined,
      productionType: form.productionType || undefined,
      propertyArea: form.propertyArea ? parseFloat(form.propertyArea) : undefined,
      raisingSystem: form.raisingSystem || undefined,
      consumedProducts: form.consumedProducts || undefined,
      productionCapacity: form.productionCapacity ? parseFloat(form.productionCapacity) : undefined,
      productLines: form.productLines || undefined,
      rationTypes: form.rationTypes || undefined,
      rawMaterialVolume: form.rawMaterialVolume ? parseFloat(form.rawMaterialVolume) : undefined,
      coverageArea: form.coverageArea || undefined,
      productMix: form.productMix || undefined,
      monthlyVolume: form.monthlyVolume ? parseFloat(form.monthlyVolume) : undefined,
      finalCustomers: form.finalCustomers ? parseInt(form.finalCustomers) : undefined,
    };
    if (isEdit && client) {
      updateMutation.mutate({ id: client.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div>
          <label className="text-sm font-medium mb-2 block">Tipo de Cliente *</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(typeConfig) as ClientType[]).map((t) => (
              <button
                key={t}
                onClick={() => set("type", t)}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all text-center ${form.type === t ? "border-green-500 bg-green-50" : "border-gray-200"}`}
              >
                <span className="text-2xl mb-1">{typeConfig[t].emoji}</span>
                <span className="text-xs font-medium leading-tight">{typeConfig[t].label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1 block">Nome / Razão Social *</label>
            <Input className="h-11" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Contato Principal</label>
            <Input className="h-11" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Nome do contato" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">CNPJ / CPF</label>
            <Input className="h-11" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Telefone</label>
            <Input className="h-11" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input className="h-11" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cidade</label>
            <Input className="h-11" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cidade" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Estado</label>
            <Select value={form.state} onValueChange={(v) => set("state", v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {BRAZIL_STATES.map(s => (
                  <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1 block">Endereço</label>
            <Input className="h-11" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Endereço completo" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Região</label>
            <Select value={form.regionId} onValueChange={(v) => set("regionId", v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Representante</label>
            <Select value={form.repId} onValueChange={(v) => set("repId", v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {representatives.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="prospect">Prospecto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Potencial de Negócio (R$)</label>
            <Input className="h-11" type="number" value={form.businessPotential} onChange={(e) => set("businessPotential", e.target.value)} placeholder="0" />
          </div>
        </div>

        {form.type === "fazenda_ruminantes" && (
          <div className="border rounded-lg p-3 bg-green-50 space-y-3">
            <h4 className="font-medium text-green-800">🐄 Dados da Fazenda</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Nº de Animais</label>
                <Input type="number" value={form.animalCount} onChange={(e) => set("animalCount", e.target.value)} placeholder="500" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Área (hectares)</label>
                <Input type="number" value={form.propertyArea} onChange={(e) => set("propertyArea", e.target.value)} placeholder="1000" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipos de Animais</label>
                <Input value={form.animalTypes} onChange={(e) => set("animalTypes", e.target.value)} placeholder="Bovinos corte, ovinos..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo de Produção</label>
                <Select value={form.productionType} onValueChange={(v) => set("productionType", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bovinos_corte">Bovinos de Corte</SelectItem>
                    <SelectItem value="bovinos_leite">Bovinos de Leite</SelectItem>
                    <SelectItem value="ovinos">Ovinos</SelectItem>
                    <SelectItem value="caprinos">Caprinos</SelectItem>
                    <SelectItem value="bubalinos">Bubalinos</SelectItem>
                    <SelectItem value="misto">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sistema de Criação</label>
                <Select value={form.raisingSystem} onValueChange={(v) => set("raisingSystem", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confinamento">Confinamento</SelectItem>
                    <SelectItem value="semi_confinamento">Semi-confinamento</SelectItem>
                    <SelectItem value="pasto">Pasto</SelectItem>
                    <SelectItem value="intensivo">Intensivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Produtos Consumidos</label>
                <Input value={form.consumedProducts} onChange={(e) => set("consumedProducts", e.target.value)} placeholder="Premix, núcleo, suplemento..." />
              </div>
            </div>
          </div>
        )}

        {form.type === "fabrica_racao" && (
          <div className="border rounded-lg p-3 bg-blue-50 space-y-3">
            <h4 className="font-medium text-blue-800">🏭 Dados da Fábrica</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Capacidade (ton/mês)</label>
                <Input type="number" value={form.productionCapacity} onChange={(e) => set("productionCapacity", e.target.value)} placeholder="500" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Volume Mat. Prima (ton/mês)</label>
                <Input type="number" value={form.rawMaterialVolume} onChange={(e) => set("rawMaterialVolume", e.target.value)} placeholder="200" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Linhas de Produto</label>
                <Input value={form.productLines} onChange={(e) => set("productLines", e.target.value)} placeholder="Ruminantes, aves, suínos..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipos de Ração</label>
                <Input value={form.rationTypes} onChange={(e) => set("rationTypes", e.target.value)} placeholder="Confinamento, terminação..." />
              </div>
            </div>
          </div>
        )}

        {form.type === "revenda_agropecuaria" && (
          <div className="border rounded-lg p-3 bg-amber-50 space-y-3">
            <h4 className="font-medium text-amber-800">🏪 Dados da Revenda</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Área de Atuação</label>
                <Input value={form.coverageArea} onChange={(e) => set("coverageArea", e.target.value)} placeholder="Municípios atendidos" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Volume Mensal (R$)</label>
                <Input type="number" value={form.monthlyVolume} onChange={(e) => set("monthlyVolume", e.target.value)} placeholder="50000" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mix de Produtos</label>
                <Input value={form.productMix} onChange={(e) => set("productMix", e.target.value)} placeholder="Rações, medicamentos..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Clientes Finais</label>
                <Input type="number" value={form.finalCustomers} onChange={(e) => set("finalCustomers", e.target.value)} placeholder="200" />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-1 block">Observações</label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Informações adicionais..." rows={2} className="resize-none" />
        </div>
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button className="h-11 w-full sm:w-auto" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="h-11 w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={isBusy}>
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Salvar" : "Criar Cliente"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ClientProfileModal({
  client,
  onClose,
  onEdit,
}: {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
}) {
  const cfg = typeConfig[client.type];
  const activitiesQuery = trpc.activities.list.useQuery({ clientId: client.id } as any);
  const purchasesQuery = trpc.purchasesData.list.useQuery({ clientId: client.id } as any);
  const activities = (activitiesQuery.data as any) || [];
  const purchases = (purchasesQuery.data as any) || [];
  const actTypeIcon: Record<string, string> = { visit: "🏠", call: "📞", email: "📧", proposal: "📄", meeting: "👥" };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className={`-mx-6 -mt-6 px-6 py-5 ${cfg.headerBg} text-white rounded-t-lg`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">{cfg.emoji}</div>
            <div>
              <h2 className="text-xl font-bold">{client.name}</h2>
              <p className="text-white/80 text-sm">{cfg.label}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit} className="text-white border-white/50 hover:bg-white/20">
              <Edit2 className="w-4 h-4 mr-1" /> Editar
            </Button>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/20 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">R$ {((client.totalPurchases || 0) / 1000).toFixed(0)}K</p>
            <p className="text-xs opacity-80">Compras Realizadas</p>
          </div>
          <div className="bg-white/20 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">R$ {((client.businessPotential || 0) / 1000).toFixed(0)}K</p>
            <p className="text-xs opacity-80">Potencial</p>
          </div>
          <div className="bg-white/20 rounded-lg p-2 text-center">
            <Badge className={`${statusConfig[client.status || "active"]?.color || "bg-gray-100"} text-xs`}>
              {statusConfig[client.status || "active"]?.label || "Ativo"}
            </Badge>
            <p className="text-xs opacity-80 mt-1">Status</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="mt-4">
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
          <TabsTrigger value="activities" className="flex-1">Atividades ({activities.length})</TabsTrigger>
          <TabsTrigger value="purchases" className="flex-1">Compras ({purchases.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {client.contactName && <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-gray-400" /><span>{client.contactName}</span></div>}
            {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" /><a href={`tel:${client.phone}`} className="text-blue-600">{client.phone}</a></div>}
            {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" /><a href={`mailto:${client.email}`} className="text-blue-600 truncate">{client.email}</a></div>}
            {(client.city || client.state) && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-gray-400" /><span>{[client.city, client.state].filter(Boolean).join(", ")}</span></div>}
            {client.repName && <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-gray-400" /><span>Rep: <strong>{client.repName}</strong></span></div>}
            {client.regionName && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-gray-400" /><span>Região: <strong>{client.regionName}</strong></span></div>}
          </div>

          {client.type === "fazenda_ruminantes" && (
            <div className="bg-green-50 rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-green-800">🐄 Dados da Fazenda</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {client.animalCount && <div><span className="text-gray-500">Animais:</span> <strong>{client.animalCount.toLocaleString()}</strong></div>}
                {client.propertyArea && <div><span className="text-gray-500">Área:</span> <strong>{client.propertyArea.toLocaleString()} ha</strong></div>}
                {client.animalTypes && <div><span className="text-gray-500">Tipos:</span> <strong>{client.animalTypes}</strong></div>}
                {client.productionType && <div><span className="text-gray-500">Produção:</span> <strong>{client.productionType.replace(/_/g, " ")}</strong></div>}
                {client.raisingSystem && <div><span className="text-gray-500">Sistema:</span> <strong>{client.raisingSystem.replace(/_/g, " ")}</strong></div>}
                {client.consumedProducts && <div className="col-span-2"><span className="text-gray-500">Produtos:</span> <strong>{client.consumedProducts}</strong></div>}
              </div>
            </div>
          )}
          {client.type === "fabrica_racao" && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-blue-800">🏭 Dados da Fábrica</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {client.productionCapacity && <div><span className="text-gray-500">Capacidade:</span> <strong>{client.productionCapacity} ton/mês</strong></div>}
                {client.rawMaterialVolume && <div><span className="text-gray-500">Mat. Prima:</span> <strong>{client.rawMaterialVolume} ton/mês</strong></div>}
                {client.productLines && <div><span className="text-gray-500">Linhas:</span> <strong>{client.productLines}</strong></div>}
                {client.rationTypes && <div><span className="text-gray-500">Rações:</span> <strong>{client.rationTypes}</strong></div>}
              </div>
            </div>
          )}
          {client.type === "revenda_agropecuaria" && (
            <div className="bg-amber-50 rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-amber-800">🏪 Dados da Revenda</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {client.coverageArea && <div><span className="text-gray-500">Área:</span> <strong>{client.coverageArea}</strong></div>}
                {client.monthlyVolume && <div><span className="text-gray-500">Volume/mês:</span> <strong>R$ {client.monthlyVolume.toLocaleString()}</strong></div>}
                {client.productMix && <div><span className="text-gray-500">Mix:</span> <strong>{client.productMix}</strong></div>}
                {client.finalCustomers && <div><span className="text-gray-500">Clientes:</span> <strong>{client.finalCustomers}</strong></div>}
              </div>
            </div>
          )}
          {client.notes && <div className="bg-gray-50 rounded-lg p-3"><p className="text-sm text-gray-600">{client.notes}</p></div>}
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          {activitiesQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><Activity className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Nenhuma atividade registrada</p></div>
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 20).map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-lg">{actTypeIcon[a.type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{a.title}</p>
                    {a.description && <p className="text-xs text-gray-500 truncate">{a.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{a.repName && `${a.repName} · `}{new Date(a.activityDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          {purchasesQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Nenhuma compra registrada</p></div>
          ) : (
            <div className="space-y-2">
              {purchases.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{p.product}</p>
                    <p className="text-xs text-gray-500">{p.quantity} {p.unit} · {new Date(p.purchaseDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <p className="font-bold text-green-700">R$ {(p.value || 0).toLocaleString("pt-BR")}</p>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold text-sm">
                <span>Total</span>
                <span className="text-green-700">R$ {purchases.reduce((s: number, p: any) => s + (p.value || 0), 0).toLocaleString("pt-BR")}</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

function ClientCard({ client, onView, onEdit, onDelete }: { client: Client; onView: () => void; onEdit: () => void; onDelete: () => void; }) {
  const cfg = typeConfig[client.type];
  const statusCfg = statusConfig[client.status || "active"] || statusConfig.active;
  const conversionRate = client.businessPotential && client.businessPotential > 0
    ? Math.min(100, Math.round(((client.totalPurchases || 0) / client.businessPotential) * 100)) : 0;

  return (
    <Card className={`${cfg.color} border hover:shadow-md transition-all cursor-pointer group`} onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 ${cfg.headerBg} rounded-lg flex items-center justify-center text-white text-lg`}>{cfg.emoji}</div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight line-clamp-1">{client.name}</p>
              <Badge className={`${cfg.badgeColor} text-xs mt-0.5`}>{cfg.label}</Badge>
            </div>
          </div>
          <Badge className={`${statusCfg.color} text-xs shrink-0`}>{statusCfg.label}</Badge>
        </div>
        <div className="space-y-1 mb-3">
          {(client.city || client.state) && <div className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3" />{[client.city, client.state].filter(Boolean).join(", ")}</div>}
          {client.repName && <div className="flex items-center gap-1 text-xs text-gray-500"><Users className="w-3 h-3" />{client.repName}</div>}
          {client.type === "fazenda_ruminantes" && client.animalCount && <div className="flex items-center gap-1 text-xs text-gray-500">🐄 {client.animalCount.toLocaleString()} animais{client.propertyArea ? ` · ${client.propertyArea.toLocaleString()} ha` : ""}</div>}
          {client.type === "fabrica_racao" && client.productionCapacity && <div className="flex items-center gap-1 text-xs text-gray-500"><Package className="w-3 h-3" />{client.productionCapacity} ton/mês</div>}
          {client.type === "revenda_agropecuaria" && client.monthlyVolume && <div className="flex items-center gap-1 text-xs text-gray-500"><TrendingUp className="w-3 h-3" />R$ {(client.monthlyVolume / 1000).toFixed(0)}K/mês</div>}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/60 rounded p-2 text-center">
            <p className="text-xs text-gray-500">Realizado</p>
            <p className="font-bold text-sm text-green-700">R$ {((client.totalPurchases || 0) / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-white/60 rounded p-2 text-center">
            <p className="text-xs text-gray-500">Potencial</p>
            <p className="font-bold text-sm text-blue-700">R$ {((client.businessPotential || 0) / 1000).toFixed(0)}K</p>
          </div>
        </div>
        {client.businessPotential && client.businessPotential > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Conversão</span><span>{conversionRate}%</span></div>
            <div className="h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${conversionRate}%` }} /></div>
          </div>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={onView}><Eye className="w-3 h-3 mr-1" /> Ver</Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={onEdit}><Edit2 className="w-3 h-3 mr-1" /> Editar</Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const clientsQuery = trpc.clients.list.useQuery();
  const repsQuery = trpc.representatives.list.useQuery();
  const regionsQuery = trpc.regions.list.useQuery();
  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { toast.success("Cliente excluído!"); clientsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const allClients: Client[] = (clientsQuery.data as any) || [];
  const representatives = ((repsQuery.data as any) || []).map((r: any) => ({ id: r.id, name: r.name }));
  const regions = ((regionsQuery.data as any) || []).map((r: any) => ({ id: r.id, name: r.name, code: r.code }));

  const filtered = allClients.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.type === typeFilter;
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchRegion = regionFilter === "all" || c.regionCode === regionFilter;
    return matchSearch && matchType && matchStatus && matchRegion;
  });

  const stats = {
    total: allClients.length,
    fazendas: allClients.filter((c) => c.type === "fazenda_ruminantes").length,
    fabricas: allClients.filter((c) => c.type === "fabrica_racao").length,
    revendas: allClients.filter((c) => c.type === "revenda_agropecuaria").length,
    active: allClients.filter((c) => c.status === "active").length,
    totalPotential: allClients.reduce((s, c) => s + (c.businessPotential || 0), 0),
    totalPurchases: allClients.reduce((s, c) => s + (c.totalPurchases || 0), 0),
  };

  const handleDelete = (client: Client) => {
    if (confirm(`Excluir "${client.name}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate({ id: client.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Carteira de Clientes</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Gestão de fazendas, fábricas e revendas agropecuárias</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2 border-green-300 text-green-700 hover:bg-green-50 h-11">
              <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Importar Excel</span>
            </Button>
            <Button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 gap-2 h-11">
              <Plus className="w-4 h-4" /> Novo Cliente
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total de Clientes</p><p className="text-xs text-green-600 mt-1">{stats.active} ativos</p></CardContent></Card>
          <Card className="bg-green-50 border-green-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-700">{stats.fazendas}</p><p className="text-xs text-green-600">🐄 Fazendas</p></CardContent></Card>
          <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-700">{stats.fabricas}</p><p className="text-xs text-blue-600">🏭 Fábricas</p></CardContent></Card>
          <Card className="bg-amber-50 border-amber-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-700">{stats.revendas}</p><p className="text-xs text-amber-600">🏪 Revendas</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-green-600" /></div><div><p className="text-lg font-bold text-green-700">R$ {(stats.totalPurchases / 1000000).toFixed(1)}M</p><p className="text-xs text-gray-500">Total em Compras</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div><div><p className="text-lg font-bold text-blue-700">R$ {(stats.totalPotential / 1000000).toFixed(1)}M</p><p className="text-xs text-gray-500">Potencial Total</p></div></CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, contato ou cidade..." className="pl-9 h-11" />
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-11 w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="fazenda_ruminantes">🐄 Fazendas</SelectItem>
              <SelectItem value="fabrica_racao">🏭 Fábricas</SelectItem>
              <SelectItem value="revenda_agropecuaria">🏪 Revendas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="prospect">Prospecto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="h-11 w-full sm:w-40"><SelectValue placeholder="Região" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as regiões</SelectItem>
              {regions.map((r: any) => (<SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>))}
            </SelectContent>
          </Select>
          </div>
        </div>

        <p className="text-sm text-gray-500">{filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>

        {clientsQuery.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">Nenhum cliente encontrado</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onView={() => { setSelectedClient(client); setShowProfile(true); }}
                onEdit={() => { setEditClient(client); setShowProfile(false); }}
                onDelete={() => handleDelete(client)}
              />
            ))}
          </div>
        )}
      </div>

      {showProfile && selectedClient && (
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <ClientProfileModal client={selectedClient} onClose={() => setShowProfile(false)} onEdit={() => { setShowProfile(false); setEditClient(selectedClient); }} />
        </Dialog>
      )}
      {editClient && (
        <Dialog open={!!editClient} onOpenChange={() => setEditClient(null)}>
          <ClientForm client={editClient} onClose={() => setEditClient(null)} onSaved={() => clientsQuery.refetch()} representatives={representatives} regions={regions} />
        </Dialog>
      )}
      {showCreate && (
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <ClientForm onClose={() => setShowCreate(false)} onSaved={() => clientsQuery.refetch()} representatives={representatives} regions={regions} />
        </Dialog>
      )}

    </DashboardLayout>
  );
}
