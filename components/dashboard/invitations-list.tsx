"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAlert } from "@/components/ui/confirm-provider";

type Invite = {
  id: string;
  dashboardId: string;
  permission: string;
  createdAt: string;
  dashboard: any;
  owner: { id: string; email: string; name?: string } | null;
};

export default function InvitationsList() {
  const alert = useAlert();
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboards/shares/pending');
      const data = await res.json();
      if (data.ok) setInvites(data.invites || []);
      else setInvites([]);
    } catch (e) {
      console.error(e);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const accept = async (shareId: string) => {
    try {
      const res = await fetch('/api/dashboards/shares/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shareId }) });
      const data = await res.json();
      if (data.ok) setInvites((prev) => prev ? prev.filter(i => i.id !== shareId) : prev);
      else await alert(data.error || 'Erreur');
    } catch (e) { console.error(e); await alert('Erreur'); }
  };

  const rejectInvite = async (shareId: string) => {
    try {
      const res = await fetch('/api/dashboards/shares/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shareId }) });
      const data = await res.json();
      if (data.ok) setInvites((prev) => prev ? prev.filter(i => i.id !== shareId) : prev);
      else await alert(data.error || 'Erreur');
    } catch (e) { console.error(e); await alert('Erreur'); }
  };

  if (loading) return <div className="p-4">Chargement...</div>;
  if (!invites) return <div className="p-4">Aucune invitation.</div>;

  return (
    <div className="p-4 space-y-3">
      {invites.length === 0 && <div className="text-sm text-muted-foreground">Aucune invitation en attente.</div>}
      {invites.map((inv) => (
        <div key={inv.id} className="p-3 bg-card rounded-md border">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium">{inv.dashboard?.name || 'Dashboard inconnu'}</div>
              <div className="text-xs text-muted-foreground">De: {inv.owner?.name || inv.owner?.email}</div>
              <div className="text-xs text-muted-foreground">Permission: {inv.permission}</div>
              <div className="text-xs text-muted-foreground">Reçu: {new Date(inv.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => accept(inv.id)}>Accepter</Button>
              <Button size="sm" variant="destructive" onClick={() => rejectInvite(inv.id)}>Refuser</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
