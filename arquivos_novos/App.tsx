import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
// Pages
import Dashboard from "./pages/Dashboard";
import Representantes from "./pages/Representantes";
import Clientes from "./pages/Clientes";
import Oportunidades from "./pages/Oportunidades";
import Metas from "./pages/Metas";
import Atividades from "./pages/Atividades";
import Relatorios from "./pages/Relatorios";
import IAInsights from "./pages/IAInsights";
import MapaGeografico from "./pages/MapaGeografico";
import Alertas from "./pages/Alertas";
import Preferencias from "./pages/Preferencias";
import Importacao from "./pages/Importacao";
import Vendas from "./pages/Vendas";
import Analytics from "./pages/Analytics";
import Automacoes from "./pages/Automacoes";
import RegistroMobile from "./pages/RegistroMobile";
import Campo from "./pages/Campo";
import { Admin } from "./pages/Admin";

function PageRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => { window.location.href = "/"; return null; }} />
      <Route path="/" component={() => <PageRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <PageRoute component={Dashboard} />} />
      <Route path="/representantes" component={() => <PageRoute component={Representantes} />} />
      <Route path="/clientes" component={() => <PageRoute component={Clientes} />} />
      <Route path="/oportunidades" component={() => <PageRoute component={Oportunidades} />} />
      <Route path="/metas" component={() => <PageRoute component={Metas} />} />
      <Route path="/atividades" component={() => <PageRoute component={Atividades} />} />
      <Route path="/relatorios" component={() => <PageRoute component={Relatorios} />} />
      <Route path="/ia-insights" component={() => <PageRoute component={IAInsights} />} />
      <Route path="/mapa" component={() => <PageRoute component={MapaGeografico} />} />
      <Route path="/alertas" component={() => <PageRoute component={Alertas} />} />
      <Route path="/preferencias" component={() => <PageRoute component={Preferencias} />} />
      <Route path="/importacao" component={() => <PageRoute component={Importacao} />} />
      <Route path="/vendas" component={() => <PageRoute component={Vendas} />} />
      <Route path="/analytics" component={() => <PageRoute component={Analytics} />} />
      <Route path="/automacoes" component={() => <PageRoute component={Automacoes} />} />
      <Route path="/admin" component={() => <PageRoute component={Admin} />} />
      <Route path="/registro-mobile" component={() => <PageRoute component={RegistroMobile} />} />
      <Route path="/campo" component={Campo} />
      <Route path="/rep" component={Campo} />
      <Route component={() => <PageRoute component={Dashboard} />} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
