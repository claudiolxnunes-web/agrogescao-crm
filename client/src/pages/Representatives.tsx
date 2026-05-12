import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Search, TrendingUp } from "lucide-react";

const mockReps = [
  {
    id: 1,
    name: "João Silva",
    email: "joao@gestaoregional.com",
    phone: "(16) 98765-4321",
    region: "Ribeirão Preto",
    state: "SP",
    totalSales: 450000,
    clientsManaged: 45,
    status: "Ativo",
  },
  {
    id: 2,
    name: "Maria Santos",
    email: "maria@gestaoregional.com",
    phone: "(16) 99876-5432",
    region: "Araraquara",
    state: "SP",
    totalSales: 380000,
    clientsManaged: 38,
    status: "Ativo",
  },
  {
    id: 3,
    name: "Carlos Oliveira",
    email: "carlos@gestaoregional.com",
    phone: "(16) 97654-3210",
    region: "Jaboticabal",
    state: "SP",
    totalSales: 290000,
    clientsManaged: 32,
    status: "Ativo",
  },
];

interface Representative {
  id: number;
  name: string;
  email: string;
  phone: string;
  region: string;
  state: string;
  totalSales: number;
  clientsManaged: number;
  status: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  region: string;
  state: string;
  status: string;
}

export default function Representatives() {
  const [reps, setReps] = useState<Representative[]>(mockReps);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteRepId, setDeleteRepId] = useState<number | null>(null);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    region: "",
    state: "SP",
    status: "Ativo",
  });

  const filteredReps = reps.filter(
    (rep) =>
      rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSales = reps.reduce((sum, rep) => sum + rep.totalSales, 0);
  const totalClients = reps.reduce((sum, rep) => sum + rep.clientsManaged, 0);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      region: "",
      state: "SP",
      status: "Ativo",
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.email) {
      alert("Preencha nome e email!");
      return;
    }

    const newRep: Representative = {
      id: Math.max(...reps.map((r) => r.id), 0) + 1,
      ...formData,
      totalSales: 0,
      clientsManaged: 0,
    };

    setReps([...reps, newRep]);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = () => {
    if (!editingRep) return;

    setReps(
      reps.map((r) =>
        r.id === editingRep.id
          ? { ...editingRep, ...formData }
          : r
      )
    );
    setIsEditOpen(false);
    setEditingRep(null);
    resetForm();
  };

  const handleDelete = () => {
    if (deleteRepId === null) return;
    setReps(reps.filter((r) => r.id !== deleteRepId));
    setDeleteRepId(null);
  };

  const openEditModal = (rep: Representative) => {
    setEditingRep(rep);
    setFormData({
      name: rep.name,
      email: rep.email,
      phone: rep.phone,
      region: rep.region,
      state: rep.state,
      status: rep.status,
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Representantes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seu time de vendas ({reps.length} representantes)
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              Novo Representante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Representante</DialogTitle>
              <DialogDescription>Adicione um novo membro ao time de vendas</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  placeholder="João Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    placeholder="joao@gestaoregional.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    placeholder="(16) 98765-4321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Região</label>
                  <Input
                    placeholder="Ribeirão Preto"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <Input
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option>Ativo</option>
                  <option>Inativo</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate}>Criar Representante</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total de Vendas</p>
              <p className="text-3xl font-bold mt-2">
                R$ {(totalSales / 1000000).toFixed(1)}M
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Clientes Gerenciados</p>
              <p className="text-3xl font-bold mt-2">{totalClients}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Ticket Médio</p>
              <p className="text-3xl font-bold mt-2">
                R$ {(totalSales / reps.length / 1000).toFixed(0)}K
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou região..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Representantes</CardTitle>
          <CardDescription>
            Mostrando {filteredReps.length} de {reps.length} representantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Nenhum representante encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReps.map((rep) => (
                    <TableRow key={rep.id}>
                      <TableCell className="font-medium">{rep.name}</TableCell>
                      <TableCell>{rep.email}</TableCell>
                      <TableCell>{rep.region}/{rep.state}</TableCell>
                      <TableCell>{rep.clientsManaged}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        R$ {(rep.totalSales / 1000000).toFixed(2)}M
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {rep.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(rep)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteRepId(rep.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Editar */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Representante</DialogTitle>
            <DialogDescription>Altere os dados do representante</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Região</label>
                <Input
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Input
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit}>Salvar Alterações</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerta Delete */}
      <AlertDialog open={deleteRepId !== null} onOpenChange={() => setDeleteRepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Representante?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este representante?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
