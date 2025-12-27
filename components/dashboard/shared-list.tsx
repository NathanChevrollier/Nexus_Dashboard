"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAlert } from "@/components/ui/confirm-provider";

export default function SharedList() {
  const alert = useAlert();
  const [shares, setShares] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboards/shares/accepted');
      const data = await res.json();
      if (data.ok) setShares(data.shares || []);
      else setShares([]);
    } catch (e) {
      console.error(e);
      setShares([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShares(); }, []);

  const leave = async (shareId: string) => {
    try {
      const res = await fetch('/api/dashboards/shares/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shareId }) });
      const data = await res.json();
      if (data.ok) setShares((prev) => prev ? prev.filter(s => s.id !== shareId) : prev);
      else await alert(data.error || 'Erreur');
    } catch (e) { console.error(e); await alert('Erreur'); }
  };

  if (loading) return <div className="p-4">Chargement...</div>;
  if (!shares || shares.length === 0) return <div className="p-4">Aucun partage.</div>;

  return (
    <div className="p-4 space-y-3">
      {shares.map((s) => (
        <div key={s.id} className="p-3 bg-card rounded-md border flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{s.dashboard?.name || 'Dashboard inconnu'}</div>
            <div className="text-xs text-muted-foreground">De: {s.owner?.name || s.owner?.email}</div>
            <div className="text-xs text-muted-foreground">Permission: {s.permission}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => window.open(`/dashboard/${s.dashboard?.slug || s.dashboardId}`, '_blank')}>Ouvrir</Button>
            <Button size="sm" variant="destructive" onClick={() => leave(s.id)}>Quitter</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
