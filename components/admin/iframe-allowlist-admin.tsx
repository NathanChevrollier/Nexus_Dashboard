"use client";
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Plus, Trash, Check, X } from 'lucide-react';

type AllowEntry = {
  id: string;
  origin: string;
  addedAt: string;
  addedBy?: string;
  removed?: boolean;
};

export default function IframeAllowlistAdmin() {
  const confirm = useConfirm();
  const [list, setList] = useState<AllowEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOrigin, setNewOrigin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ embeddable?: boolean; ok?: boolean; reason?: string } | null>(null);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/iframe/allowlist');
      const json = await res.json();
      if (json.ok && Array.isArray(json.origins)) setList(json.origins);
      else setError(json.error || 'Erreur');
    } catch (e) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);
  useEffect(() => {
    const handler = () => fetchList();
    window.addEventListener('iframe-requests-changed', handler as EventListener);
    return () => window.removeEventListener('iframe-requests-changed', handler as EventListener);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/admin/iframe/allowlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: newOrigin }) });
      const json = await res.json();
      if (json.ok) {
        setNewOrigin('');
        fetchList();
      } else {
        setError(json.error || 'Erreur');
      }
    } catch (e) { setError('Erreur réseau'); }
  }

  async function toggleRemoved(id: string, removed: boolean) {
    setError(null);
    try {
      const res = await fetch('/api/admin/iframe/allowlist', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, removed }) });
      const json = await res.json();
      if (json.ok) fetchList(); else setError(json.error || 'Erreur');
    } catch (e) { setError('Erreur réseau'); }
  }

  async function deleteEntry(id: string) {
    if (!(await confirm('Confirmez-vous la suppression définitive de cette origine ?'))) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/iframe/allowlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const json = await res.json();
      if (res.ok && json.ok) fetchList(); else setError(json.error || 'Erreur suppression');
    } catch (e) { setError('Erreur réseau'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Allowlist iframe</h3>
          <p className="text-sm text-muted-foreground">Gérez les origines autorisées pour les iframes.</p>
        </div>

        <form onSubmit={handleAdd} className="flex items-center gap-3">
          <Input id="allow-origin" className="w-72" placeholder="https://example.com" value={newOrigin} onChange={e => setNewOrigin(e.target.value)} />
          <Button type="button" variant="outline" size="sm" onClick={async () => {
            // test the URL without adding
            setTesting(true);
            setTestResult(null);
            setError(null);
            let candidate = newOrigin || '';
            try {
              try { new URL(candidate); } catch { candidate = candidate.includes('://') ? candidate : `https://${candidate}`; }
              const res = await fetch('/api/iframe/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: candidate }) });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) {
                setTestResult({ ok: false, reason: body.error || 'Erreur de vérification' });
              } else {
                setTestResult({ ok: true, embeddable: body.embeddable === true, reason: body.reason });
              }
            } catch (e) {
              setTestResult({ ok: false, reason: 'Erreur réseau' });
            } finally { setTesting(false); }
          }}>
            {testing ? '...' : (
              <>
                <Check className="mr-2 h-4 w-4" />Tester
              </>
            )}
          </Button>
          <Button type="submit">
            <Plus className="mr-2 h-4 w-4" />Ajouter
          </Button>
        </form>
        {testResult && (
          <div className="text-sm mt-2">
            {testResult.ok ? (
              testResult.embeddable ? (
                <div className="text-green-500 flex items-center gap-2"><Check className="h-4 w-4"/> Embeddable{testResult.reason ? ` — ${testResult.reason}` : ''}</div>
              ) : (
                <div className="text-red-400 flex items-center gap-2"><X className="h-4 w-4"/> Bloqué{testResult.reason ? ` — ${testResult.reason}` : ''}</div>
              )
            ) : (
              <div className="text-yellow-400 flex items-center gap-2"><X className="h-4 w-4"/> Erreur: {testResult.reason}</div>
            )}
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

      <Card>
        <CardContent className="overflow-auto max-h-60 p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Aucune origine ajoutée.</div>
          ) : (
            <div className="divide-y">
              {list.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-4 hover:bg-accent/2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.origin}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(item.addedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.removed && <Badge variant="destructive">Désactivé</Badge>}
                    <Button variant="outline" size="sm" onClick={() => toggleRemoved(item.id, !item.removed)}>
                      {item.removed ? 'Réactiver' : 'Désactiver'}
                    </Button>
                    <Button variant="destructive" size="sm" className="h-8 w-8 p-1 rounded-full flex items-center justify-center" onClick={() => deleteEntry(item.id)} title="Supprimer">
                      <Trash className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
