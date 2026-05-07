import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LicenseGate from "./components/LicenseGate";

// Pages
import Login from "./pages/Login";
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
import DashboardLayout from "./components/DashboardLayout";

function ProtectedPageRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute component={() => (
      <LicenseGate>
        <DashboardLayout>
          <ErrorBoundary>
            <Component />
          </ErrorBoundary>
        </DashboardLayout>
      </LicenseGate>
    )} />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedPageRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <ProtectedPageRoute component={Dashboard} />} />
      <Route path="/representantes" component={() => <ProtectedPageRoute component={Representantes} />} />
      <Route path="/clientes" component={() => <ProtectedPageRoute component={Clientes} />} />
      <Route path="/oportunidades" component={() => <ProtectedPageRoute component={Oportunidades} />} />
      <Route path="/metas" component={() => <ProtectedPageRoute component={Metas} />} />
      <Route path="/atividades" component={() => <ProtectedPageRoute component={Atividades} />} />
      <Route path="/relatorios" component={() => <ProtectedPageRoute component={Relatorios} />} />
      <Route path="/ia-insights" component={() => <ProtectedPageRoute component={IAInsights} />} />
      <Route path="/mapa" component={() => <ProtectedPageRoute component={MapaGeografico} />} />
      <Route path="/alertas" component={() => <ProtectedPageRoute component={Alertas} />} />
      <Route path="/preferencias" component={() => <ProtectedPageRoute component={Preferencias} />} />
      <Route path="/importacao" component={() => <ProtectedPageRoute component={Importacao} />} />
      <Route path="/vendas" component={() => <ProtectedPageRoute component={Vendas} />} />
      <Route path="/analytics" component={() => <ProtectedPageRoute component={Analytics} />} />
      <Route path="/automacoes" component={() => <ProtectedPageRoute component={Automacoes} />} />
      <Route path="/admin" component={() => <ProtectedPageRoute component={Admin} />} />
      <Route path="/registro-mobile" component={() => <ProtectedPageRoute component={RegistroMobile} />} />
      {/* Campo mobile - standalone route without DashboardLayout */}
      <Route path="/campo" component={Campo} />
      <Route path="/rep" component={Campo} />
      {/* Fallback */}
      <Route component={() => <ProtectedPageRoute component={Dashboard} />} />
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
