"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
}

export function ShareDashboardDialog({ open, onOpenChange, dashboardId }: Props) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"read" | "edit">("read");
  const [integrations, setIntegrations] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [selectedInts, setSelectedInts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch('/api/integrations/list');
        const data = await res.json();
        setIntegrations(data.integrations || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [open]);

  const toggleInt = (id: string) => {
    setSelectedInts((s) => ({ ...s, [id]: !s[id] }));
  };

  const handleShare = async () => {
    setError(null);
    setLoading(true);
    try {
      const integrationIds = Object.entries(selectedInts).filter(([k,v]) => v).map(([k]) => k);
      const res = await fetch('/api/dashboards/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardId, targetEmail: email, permission, integrationIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager le dashboard</DialogTitle>
          <DialogDescription>Partagez ce dashboard avec un autre utilisateur et sélectionnez les intégrations à partager.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <div>
            <Label>Adresse e‑mail du destinataire</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="utilisateur@example.com" />
          </div>

          <div>
            <Label>Permission</Label>
            <div className="flex gap-2 mt-2">
              <button className={`px-3 py-1 rounded ${permission==='read'? 'bg-primary text-primary-foreground' : 'border'}`} onClick={() => setPermission('read')}>Lecture</button>
              <button className={`px-3 py-1 rounded ${permission==='edit'? 'bg-primary text-primary-foreground' : 'border'}`} onClick={() => setPermission('edit')}>Lecture & Modification</button>
            </div>
          </div>

          <div>
            <Label>Intégrations à partager</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {integrations.length === 0 && <div className="text-sm text-muted-foreground">Aucune intégration configurée</div>}
              {integrations.map((it) => (
                <label key={it.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!selectedInts[it.id]} onChange={() => toggleInt(it.id)} />
                  <span className="text-sm">{it.name} <span className="text-xs text-muted-foreground">({it.type})</span></span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleShare} disabled={loading}>{loading ? 'Partage...' : 'Partager'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
