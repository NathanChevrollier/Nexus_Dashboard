"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface State {
  hasError: boolean;
  error?: any;
}

export class ErrorBoundaryInner extends React.Component<{ children: React.ReactNode; isWidget?: boolean }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // Log error to console for developer visibility
    console.error("Widget ErrorBoundary caught:", error, info);
  }

  // Réinitialiser uniquement ce widget (pas toute la page)
  handleResetWidget = () => {
    this.setState({ hasError: false, error: undefined });
  };

  // Recharger toute la page (fallback)
  handleReloadPage = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isWidget = !!(this.props as any).isWidget;

      if (isWidget) {
        return (
          <div className="h-full w-full flex items-center justify-center p-2">
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 bg-card/70 border border-border rounded-md p-3 text-center max-w-xs">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <div className="text-sm font-medium">Erreur du widget</div>
                <div className="text-xs text-muted-foreground">Le widget a crashé — vérifiez la console.</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={this.handleResetWidget}
                  className="gap-1.5"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full w-full flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-card/80 border border-border rounded-md p-4 text-center">
            <div className="flex items-center justify-center mb-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="font-semibold">Erreur du widget</h3>
            <p className="text-sm text-muted-foreground mb-3">Le widget a rencontré une erreur. L'erreur est loggée en console.</p>
            <div className="flex items-center justify-center gap-2">
              <a href="/" className="inline-block">
                <Button size="sm">Retour au dashboard</Button>
              </a>
              <a href="/settings" className="inline-block">
                <Button size="sm">Aller aux paramètres</Button>
              </a>
              <Button variant="outline" size="sm" onClick={this.handleReloadPage}>Recharger la page</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as any;
  }
}

export default function ErrorBoundary({ children, isWidget }: { children: React.ReactNode; isWidget?: boolean }) {
  return <ErrorBoundaryInner isWidget={isWidget}>{children}</ErrorBoundaryInner>;
}
