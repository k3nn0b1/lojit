import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary global.
 * Protege a aplicação de crashes catastróficos exibindo
 * uma tela amigável ao invés de uma tela branca.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
          <div className="max-w-md text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">
                Algo deu errado
              </h1>
              <p className="text-zinc-500 text-sm font-medium">
                Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-xs text-zinc-600 bg-zinc-900 rounded-lg p-3 text-left overflow-auto max-h-32 border border-zinc-800">
                {this.state.error.message}
              </pre>
            )}
            <Button
              onClick={this.handleReload}
              className="bg-white hover:bg-zinc-200 text-black font-black w-full h-12"
            >
              RECARREGAR PÁGINA
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
