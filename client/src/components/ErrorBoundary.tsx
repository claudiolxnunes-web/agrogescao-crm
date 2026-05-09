import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isDomError: boolean;
  errorCount: number;
}

/**
 * Global ErrorBoundary that gracefully handles:
 * 1. React hydration errors
 * 2. DOM manipulation errors from Google Translate / browser extensions
 * 3. General runtime errors
 *
 * Google Translate modifies the DOM by wrapping text nodes in <font> elements.
 * When React tries to reconcile, it can't find the original text nodes and throws
 * "NotFoundError: Failed to execute 'removeChild' on 'Node'"
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isDomError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Detect DOM manipulation errors from Google Translate or browser extensions
    const isDomError =
      error.name === "NotFoundError" ||
      (error.message?.includes("removeChild")) ||
      (error.message?.includes("insertBefore")) ||
      (error.message?.includes("The node to be removed")) ||
      (error.message?.includes("Failed to execute") && error.message?.includes("Node"));

    return { hasError: true, error, isDomError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error.message);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, isDomError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // For DOM errors (Google Translate), show a soft recovery message
      if (this.state.isDomError) {
        return (
          <div className="flex items-center justify-center min-h-screen p-8 bg-background">
            <div className="flex flex-col items-center w-full max-w-md p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-foreground">
                Problema de compatibilidade detectado
              </h2>
              <p className="text-muted-foreground text-sm mb-2">
                O tradutor automático do seu navegador pode estar causando conflitos com a aplicação.
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                Para melhor experiência, <strong>desative a tradução automática</strong> desta página e recarregue.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={this.handleReload}
                  className={cn(
                    "flex items-center justify-center gap-2 px-6 py-3 rounded-lg flex-1",
                    "bg-primary text-primary-foreground font-medium",
                    "hover:opacity-90 cursor-pointer transition-opacity"
                  )}
                >
                  <RefreshCw size={16} />
                  Recarregar página
                </button>
                <button
                  onClick={this.handleReset}
                  className={cn(
                    "flex items-center justify-center gap-2 px-6 py-3 rounded-lg flex-1",
                    "bg-muted text-muted-foreground font-medium",
                    "hover:bg-muted/80 cursor-pointer transition-colors"
                  )}
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        );
      }

      // For other errors, show a clean error message
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-foreground">
              Ocorreu um erro inesperado
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Por favor, recarregue a página. Se o problema persistir, entre em contato com o suporte.
            </p>
            <div className="p-4 w-full rounded-lg bg-muted overflow-auto mb-6 max-h-48">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {this.state.error?.message}
              </pre>
            </div>
            <button
              onClick={this.handleReload}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg",
                "bg-primary text-primary-foreground font-medium",
                "hover:opacity-90 cursor-pointer transition-opacity"
              )}
            >
              <RefreshCw size={16} />
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
