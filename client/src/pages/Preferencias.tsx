import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, Palette, Shield, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const REGIONS = ["all", "SP", "MG", "RJ", "Outras"];
const PERIODS = ["7d", "30d", "90d", "12m"];
const PERIOD_LABELS: Record<string, string> = { "7d": "7 dias", "30d": "30 dias", "90d": "90 dias", "12m": "12 meses" };

export default function Preferencias() {
  // Notification preferences
  const [goalAlerts, setGoalAlerts] = useState(true);
  const [oppAlerts, setOppAlerts] = useState(true);
  const [perfAlerts, setPerfAlerts] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);

  // Display preferences (persisted in localStorage)
  const [defaultRegion, setDefaultRegion] = useState(() => localStorage.getItem("pref_region") || "all");
  const [defaultPeriod, setDefaultPeriod] = useState(() => localStorage.getItem("pref_period") || "30d");
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem("pref_compact") === "true");
  const [showAnimations, setShowAnimations] = useState(() => localStorage.getItem("pref_animations") !== "false");

  const saveDisplayPrefs = () => {
    localStorage.setItem("pref_region", defaultRegion);
    localStorage.setItem("pref_period", defaultPeriod);
    localStorage.setItem("pref_compact", String(compactMode));
    localStorage.setItem("pref_animations", String(showAnimations));
    toast.success("Preferências de exibição salvas!");
  };

  const saveNotifPrefs = () => {
    const prefs = { goalAlerts, oppAlerts, perfAlerts, emailNotifs, pushNotifs };
    localStorage.setItem("pref_notifications", JSON.stringify(prefs));
    toast.success("Preferências de notificação salvas!");
  };

  const resetAll = () => {
    localStorage.removeItem("pref_region");
    localStorage.removeItem("pref_period");
    localStorage.removeItem("pref_compact");
    localStorage.removeItem("pref_animations");
    localStorage.removeItem("pref_notifications");
    setDefaultRegion("all");
    setDefaultPeriod("30d");
    setCompactMode(false);
    setShowAnimations(true);
    setGoalAlerts(true);
    setOppAlerts(true);
    setPerfAlerts(true);
    setEmailNotifs(false);
    setPushNotifs(true);
    toast.info("Preferências redefinidas para os padrões");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Preferências
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure o sistema conforme suas necessidades</p>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notificações
          </CardTitle>
          <CardDescription>Controle quais alertas você deseja receber</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Alertas de Metas em Risco</Label>
              <p className="text-xs text-muted-foreground">Notificar quando metas estiverem abaixo do esperado</p>
            </div>
            <Switch checked={goalAlerts} onCheckedChange={setGoalAlerts} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Alertas de Oportunidades</Label>
              <p className="text-xs text-muted-foreground">Oportunidades paradas ou prestes a expirar</p>
            </div>
            <Switch checked={oppAlerts} onCheckedChange={setOppAlerts} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Alertas de Performance</Label>
              <p className="text-xs text-muted-foreground">Queda de performance de representantes</p>
            </div>
            <Switch checked={perfAlerts} onCheckedChange={setPerfAlerts} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Notificações por E-mail</Label>
              <p className="text-xs text-muted-foreground">Receber resumo diário por e-mail</p>
            </div>
            <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Notificações Push</Label>
              <p className="text-xs text-muted-foreground">Alertas em tempo real no navegador</p>
            </div>
            <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
          </div>
          <div className="pt-2">
            <Button onClick={saveNotifPrefs} className="h-11 gap-2">
              <Save className="h-4 w-4" />
              Salvar Notificações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Exibição e Filtros Padrão
          </CardTitle>
          <CardDescription>Personalize a experiência de visualização</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Região Padrão</Label>
              <Select value={defaultRegion} onValueChange={setDefaultRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as regiões</SelectItem>
                  {REGIONS.filter(r => r !== "all").map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Período Padrão</Label>
              <Select value={defaultPeriod} onValueChange={setDefaultPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Modo Compacto</Label>
              <p className="text-xs text-muted-foreground">Reduzir espaçamento para ver mais dados</p>
            </div>
            <Switch checked={compactMode} onCheckedChange={setCompactMode} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Animações</Label>
              <p className="text-xs text-muted-foreground">Transições e micro-interações</p>
            </div>
            <Switch checked={showAnimations} onCheckedChange={setShowAnimations} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button onClick={saveDisplayPrefs} className="h-11 gap-2">
              <Save className="h-4 w-4" />
              Salvar Exibição
            </Button>
            <Button variant="outline" onClick={resetAll} className="h-11 gap-2">
              <RefreshCw className="h-4 w-4" />
              Redefinir Padrões
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versão</span>
            <Badge variant="outline">v1.0.0</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Banco de Dados</span>
            <Badge variant="outline" className="text-green-600 border-green-200">SQLite — Online</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Idioma</span>
            <Badge variant="outline">Português (BR)</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fuso Horário</span>
            <Badge variant="outline">America/Sao_Paulo</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
