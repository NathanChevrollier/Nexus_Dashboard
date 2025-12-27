"use client";

import { useState } from "react";
import { useAlert } from "@/components/ui/confirm-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Upload, Copy, Check } from "lucide-react";
import { exportDashboard, importDashboard, duplicateDashboard } from "@/lib/actions/dashboard-export";
import type { DashboardExport } from "@/lib/actions/dashboard-export";

interface DashboardExportImportProps {
  dashboardId: string;
  dashboardName: string;
  onDashboardCreated?: (dashboardId: string) => void;
}

export function DashboardExportImport({
  dashboardId,
  dashboardName,
  onDashboardCreated,
}: DashboardExportImportProps) {
  const alert = useAlert();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportDashboard(dashboardId);
      if (!data) {
        await alert("Erreur lors de l'export");
        return;
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexus-dashboard-${dashboardName}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setExportDialogOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Export error:", error);
      await alert("Erreur lors de l'export du dashboard");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const data: DashboardExport = JSON.parse(text);

      // Validate structure
      if (!data.version || !data.dashboard || !Array.isArray(data.widgets)) {
        throw new Error("Format de fichier invalide");
      }

      const result = await importDashboard(data);

      if (result.success && result.dashboardId) {
        await alert("Dashboard importé avec succès !");
        setImportDialogOpen(false);
        if (onDashboardCreated) {
          onDashboardCreated(result.dashboardId);
        }
        // Redirect to new dashboard
        window.location.href = `/dashboard/${result.dashboardId}`;
      } else {
        await alert(result.error || "Erreur lors de l'import");
      }
    } catch (error) {
      console.error("Import error:", error);
      await alert("Fichier invalide ou erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);

    try {
      const result = await duplicateDashboard(dashboardId);

      if (result.success && result.dashboardId) {
        await alert("Dashboard dupliqué avec succès !");
        if (onDashboardCreated) {
          onDashboardCreated(result.dashboardId);
        }
        // Redirect to new dashboard
        window.location.href = `/dashboard/${result.dashboardId}`;
      } else {
        await alert(result.error || "Erreur lors de la duplication");
      }
    } catch (error) {
      console.error("Duplicate error:", error);
      await alert("Erreur lors de la duplication du dashboard");
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Export Button */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exporter le Dashboard</DialogTitle>
            <DialogDescription>
              Téléchargez une sauvegarde complète de votre dashboard (widgets, catégories, thème)
            </DialogDescription>
          </DialogHeader>

          {exportSuccess ? (
            <div className="flex items-center justify-center gap-2 py-8 text-green-600">
              <Check className="h-8 w-8" />
              <p className="text-lg font-semibold">Téléchargement réussi !</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">📦 Contenu de l'export</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Configuration du dashboard</li>
                  <li>Tous les widgets et leurs paramètres</li>
                  <li>Catégories et organisation</li>
                  <li>Thème et CSS personnalisé</li>
                </ul>
              </div>

              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Télécharger le fichier JSON
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Le fichier sera téléchargé dans votre dossier de téléchargements
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Button */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer un Dashboard</DialogTitle>
            <DialogDescription>
              Créez un nouveau dashboard à partir d'un fichier d'export
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">⚠️ Important</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Un <strong>nouveau</strong> dashboard sera créé</li>
                <li>L'original ne sera pas modifié</li>
                <li>Le dashboard importé sera privé par défaut</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-file">Fichier .json à importer</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="cursor-pointer"
              />
            </div>

            {importing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-sm text-muted-foreground">Import en cours...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDuplicate}
        disabled={duplicating}
      >
        <Copy className="h-4 w-4 mr-2" />
        {duplicating ? "Duplication..." : "Dupliquer"}
      </Button>
    </div>
  );
}
