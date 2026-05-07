import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";

export function Admin() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPlan, setNewPlan] = useState<"free" | "basic" | "pro">("basic");
  const [newEndDate, setNewEndDate] = useState<string>("");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearConfirmPhrase, setClearConfirmPhrase] = useState("");

  // Verificar se é superadmin
  const { data: isSuperadmin, isLoading: isCheckingAdmin } = trpc.admin.isSuperadmin.useQuery();

  // Listar usuários com licenças
  const { data: users = [], isLoading: isLoadingUsers, refetch: refetchUsers } = trpc.admin.getUsers.useQuery(
    undefined,
    { enabled: isSuperadmin === true }
  );

  // Listar histórico de acessos
  const { data: loginHistory = [], isLoading: isLoadingHistory } = trpc.admin.getLoginHistory.useQuery(
    { userId: selectedUserId! },
    { enabled: selectedUserId !== null }
  );

  // Criar/renovar licença
  const createLicense = trpc.admin.createLicense.useMutation({
    onSuccess: () => {
      console.log("Licença criada/renovada com sucesso");
      refetchUsers();
      setSelectedUserId(null);
      setNewPlan("basic");
      setNewEndDate("");
    },
    onError: (error) => {
      console.error("Erro:", error.message);
    },
  });

  const utils = trpc.useUtils();

  // Limpar base de dados
  const clearDatabase = trpc.admin.clearDatabase.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowClearDialog(false);
      setClearConfirmPhrase("");
      // Invalidar todas as queries relevantes
      void utils.clients.list.invalidate();
      void utils.opportunities.list.invalidate();
      void utils.dashboard.kpis.invalidate();
      void utils.dashboard.salesTrend.invalidate();
      void utils.dashboard.repRanking.invalidate();
      void utils.dashboard.pipelineByStage.invalidate();
      void utils.dashboard.regionSummary.invalidate();
      void utils.purchasesData.list.invalidate();
      void utils.analytics.forecast.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Cancelar licença
  const cancelLicense = trpc.admin.cancelLicense.useMutation({
    onSuccess: () => {
      console.log("Licença cancelada com sucesso");
      refetchUsers();
    },
    onError: (error) => {
      console.error("Erro:", error.message);
    },
  });

  if (isCheckingAdmin === true && isSuperadmin === false) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você não tem permissão para acessar esta página</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isCheckingAdmin || !isSuperadmin) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-gray-600">Gerenciar usuários, licenças e acessos</p>
      </div>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários e Licenças</CardTitle>
          <CardDescription>Total de {users.length} usuários cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Válido até</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "superadmin" ? "default" : "secondary"}>
                          {user.role === "superadmin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.license?.plan.toUpperCase() || "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.license?.status === "active"
                              ? "default"
                              : user.license?.status === "expired"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {user.license?.status === "active"
                            ? "Ativa"
                            : user.license?.status === "expired"
                              ? "Expirada"
                              : "Cancelada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.license?.endDate
                          ? format(new Date(user.license.endDate), "dd/MM/yyyy", { locale: ptBR })
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {user.lastSignedIn
                          ? format(new Date(user.lastSignedIn), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "Nunca"}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              Renovar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Renovar Licença</DialogTitle>
                              <DialogDescription>
                                Renovar licença para {user.name} ({user.email})
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Plano</label>
                                <Select value={newPlan} onValueChange={(v) => setNewPlan(v as any)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Data de Expiração</label>
                                <Input
                                  type="date"
                                  value={newEndDate}
                                  onChange={(e) => setNewEndDate(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    if (!newEndDate) {
                                      console.error("Erro: Selecione uma data");
                                      return;
                                    }
                                    createLicense.mutate({
                                      userId: user.id,
                                      plan: newPlan,
                                      endDate: new Date(newEndDate),
                                    });
                                  }}
                                  disabled={createLicense.isPending}
                                >
                                  {createLicense.isPending ? "Salvando..." : "Salvar"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        {user.license && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja cancelar esta licença?")) {
                                cancelLicense.mutate({ licenseId: user.license!.id });
                              }
                            }}
                            disabled={cancelLicense.isPending}
                          >
                            Cancelar
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              Histórico
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Histórico de Acessos</DialogTitle>
                              <DialogDescription>
                                Últimos 50 acessos de {user.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Data/Hora</TableHead>
                                    <TableHead>IP</TableHead>
                                    <TableHead>User Agent</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {isLoadingHistory ? (
                                    <TableRow>
                                      <TableCell colSpan={3} className="text-center">
                                        Carregando...
                                      </TableCell>
                                    </TableRow>
                                  ) : loginHistory.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={3} className="text-center">
                                        Nenhum acesso registrado
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    loginHistory.map((log, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>
                                          {format(new Date(log.loginAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell className="text-sm">{log.ipAddress || "N/A"}</TableCell>
                                        <TableCell className="text-sm truncate max-w-xs">
                                          {log.userAgent || "N/A"}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Card: Zona Perigosa */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona Perigosa
          </CardTitle>
          <CardDescription>
            Ações irreversíveis que afetam toda a base de dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div>
              <p className="font-semibold text-sm">Limpar Base de Dados</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Remove todos os clientes, oportunidades, metas, atividades e histórico de vendas. Usuários e configurações são mantidos.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="ml-4 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação para limpar base */}
      <Dialog open={showClearDialog} onOpenChange={(open) => { setShowClearDialog(open); if (!open) setClearConfirmPhrase(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Limpeza da Base de Dados
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os registros de clientes, oportunidades, metas, atividades, compras e histórico de vendas serão permanentemente apagados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-destructive">Para confirmar, digite exatamente:</p>
              <p className="text-sm font-mono font-bold mt-1">LIMPAR TUDO</p>
            </div>
            <Input
              value={clearConfirmPhrase}
              onChange={(e) => setClearConfirmPhrase(e.target.value)}
              placeholder="Digite LIMPAR TUDO para confirmar"
              className="font-mono"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowClearDialog(false); setClearConfirmPhrase(""); }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={clearConfirmPhrase !== "LIMPAR TUDO" || clearDatabase.isPending}
                onClick={() => clearDatabase.mutate({ confirmPhrase: clearConfirmPhrase })}
              >
                {clearDatabase.isPending ? "Limpando..." : "Confirmar e Limpar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
