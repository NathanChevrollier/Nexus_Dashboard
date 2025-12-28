"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useConfirm, useAlert } from "@/components/ui/confirm-provider";
import { useRouter } from "next/navigation";
import InvitationsList from "@/components/dashboard/invitations-list";
import SharedList from "@/components/dashboard/shared-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

export function AccountSettings() {
  const { data: session } = useSession();
  const confirm = useConfirm();
  const alert = useAlert();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleGoInvitations = () => {
    router.push("/dashboard/invitations");
  };

  const handleResetSelf = async () => {
    if (!(await confirm("Confirmez-vous la réinitialisation de votre tableau de bord ? Cette action supprimera vos widgets et données d'usage."))) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users/reset-self", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        await alert("Réinitialisation effectuée.");
        router.refresh();
      } else {
        console.error("Reset error:", res.status, body);
        await alert(body?.error ? `Erreur: ${body.error}` : "Erreur lors de la réinitialisation. Voir console.");
      }
    } catch (e) {
      console.error(e);
      await alert("Erreur lors de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/dashboards/export");
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboards-${session?.user?.id || "me"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      await alert("Erreur lors de l'export. Voir console.");
    } finally {
      setExporting(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    // handled inside dialog
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // handled inside dialog
  };

  const [editOpen, setEditOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const email = fd.get('email')?.toString();
    const currentPassword = fd.get('currentPassword')?.toString();
    const newPassword = fd.get('newPassword')?.toString();
    if (!email) return setFormError('Entrez un e-mail valide');
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch('/api/users/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, currentPassword, newPassword }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error || 'Erreur');
        return;
      }
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      setFormError('Erreur réseau');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mon compte</CardTitle>
          <CardDescription>Informations de votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Nom</div>
              <div className="font-medium">{session?.user?.name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">E-mail</div>
              <div className="font-medium">{session?.user?.email || "-"}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditOpen(true)} className="w-full sm:w-auto">Modifier mes informations</Button>
              <Button variant="outline" onClick={handleResetSelf} disabled={loading} className="w-full sm:w-auto">{loading ? "..." : "Réinitialiser mon dashboard"}</Button>
              <Button variant="secondary" onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">{exporting ? "..." : "Exporter mes dashboards"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>Invitations à des dashboards partagés avec vous.</CardDescription>
        </CardHeader>
        <CardContent>
          <InvitationsList />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partages</CardTitle>
          <CardDescription>Tableaux et intégrations partagés avec vous.</CardDescription>
        </CardHeader>
        <CardContent>
          <SharedList />
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier mes informations</DialogTitle>
            <DialogDescription>Changez votre e-mail et mot de passe.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitProfile} className="space-y-3 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">E-mail</label>
              <Input name="email" defaultValue={session?.user?.email || ''} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Mot de passe actuel (optionnel pour changer l'e-mail)</label>
              <Input name="currentPassword" type="password" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
              <Input name="newPassword" type="password" />
            </div>
            {formError && <div className="text-sm text-red-600">{formError}</div>}
            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={formLoading}>{formLoading ? '...' : 'Enregistrer'}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
