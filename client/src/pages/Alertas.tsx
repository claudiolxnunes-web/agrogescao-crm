import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, Check, AlertTriangle, Info, TrendingDown, Clock, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  goal_risk: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
  opportunity_stalled: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  performance_drop: { icon: TrendingDown, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  success: { icon: Check, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
};

export default function Alertas() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({ unreadOnly: false });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      toast.success("Todas as notificações marcadas como lidas");
    },
  });

  const unread = (notifications || []).filter(n => !n.isRead);
  const read = (notifications || []).filter(n => n.isRead);

  type NotifItem = { id: number; userId: number | null; type: string | null; title: string; message: string; isRead: boolean | null; relatedId: number | null; relatedType: string | null; createdAt: Date };
  const NotifCard = ({ n }: { n: NotifItem }) => {
    const cfg = TYPE_CONFIG[n.type || "info"] || TYPE_CONFIG.info;
    const Icon = cfg.icon;
    return (
      <div
        className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${!n.isRead ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}
      >
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold truncate">{n.title}</p>
            {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        {!n.isRead && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 px-2 text-xs"
            onClick={() => markRead.mutate({ id: n.id })}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Alertas e Notificações
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unread.length > 0 ? `${unread.length} não lida(s)` : "Tudo em dia"}
          </p>
        </div>
        {unread.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Não lidas</p>
            <p className="text-2xl font-bold mt-1 text-primary">{unread.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-1">{notifications?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Alertas Críticos</p>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {(notifications || []).filter(n => n.type === "goal_risk").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lidas</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{read.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="unread">
        <TabsList>
          <TabsTrigger value="unread" className="gap-2">
            Não lidas
            {unread.length > 0 && (
              <Badge className="h-5 min-w-5 text-xs bg-primary text-primary-foreground">{unread.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="read">Lidas</TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="mt-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
          ) : unread.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <BellOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nenhuma notificação não lida</p>
                <p className="text-xs text-muted-foreground mt-1">Você está em dia com tudo!</p>
              </CardContent>
            </Card>
          ) : (
            unread.map(n => <NotifCard key={n.id} n={n} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-2">
          {(notifications || []).map(n => <NotifCard key={n.id} n={n} />)}
          {(notifications || []).length === 0 && (
            <Card>
              <CardContent className="p-10 text-center">
                <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma notificação</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="read" className="mt-4 space-y-2">
          {read.map(n => <NotifCard key={n.id} n={n} />)}
          {read.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center">
                <CheckCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma notificação lida</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
