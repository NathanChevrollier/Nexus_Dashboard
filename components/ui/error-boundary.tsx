"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface State {
  hasError: boolean;
  error?: any;
}

export class ErrorBoundaryInner extends React.Component<{ children: React.ReactNode }, State> {
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

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
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
              <Button variant="outline" size="sm" onClick={this.handleReload}>Recharger</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as any;
  }
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundaryInner>{children}</ErrorBoundaryInner>;
}
