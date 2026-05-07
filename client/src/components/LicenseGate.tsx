import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LicenseGateProps {
  children: React.ReactNode;
}

export default function LicenseGate({ children }: LicenseGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [licenseExpired, setLicenseExpired] = useState(false);
  const [licenseLoading, setLicenseLoading] = useState(true);

  // Buscar licença do usuário
  const { data: license } = trpc.licenses.getCurrent.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLicenseLoading(false);
      return;
    }

    if (license) {
      const isExpired = license.status === "expired" || new Date(license.endDate) < new Date();
      setLicenseExpired(isExpired);
      setLicenseLoading(false);
    } else {
      setLicenseLoading(false);
    }
  }, [user, license, authLoading]);

  if (authLoading || licenseLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando licença...</p>
        </div>
      </div>
    );
  }

  if (licenseExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md">
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Licença Expirada</h1>
            <p className="text-muted-foreground">
              Sua licença expirou em {license?.endDate ? new Date(license.endDate).toLocaleDateString("pt-BR") : "data desconhecida"}. 
              Por favor, renove sua licença para continuar usando o sistema.
            </p>
          </div>
          <div className="space-y-2 w-full">
            <Button className="w-full h-11" onClick={() => window.location.href = "/preferencias"}>
              Renovar Licença
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={() => window.location.href = "/login"}>
              Fazer Login com Outra Conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
