"use client";
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Plus, Trash, Check, X, Globe, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Liste blanche des origines iframe
        </CardTitle>
        <CardDescription>
          Gérez les origines autorisées pour l'intégration d'iframes. Testez la compatibilité avant d'ajouter une origine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulaire d'ajout */}
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="allow-origin">Nouvelle origine</Label>
            <div className="flex gap-2">
              <Input 
                id="allow-origin" 
                placeholder="https://example.com" 
                value={newOrigin} 
                onChange={e => setNewOrigin(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                disabled={testing || !newOrigin}
                onClick={async () => {
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
                }}
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Tester
                  </>
                )}
              </Button>
              <Button type="submit" disabled={!newOrigin}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>

          {/* Résultat du test */}
          {testResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                testResult.ok
                  ? testResult.embeddable
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              }`}
            >
              {testResult.ok ? (
                testResult.embeddable ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>✅ Embeddable{testResult.reason ? ` — ${testResult.reason}` : ''}</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 shrink-0" />
                    <span>❌ Bloqué par X-Frame-Options{testResult.reason ? ` — ${testResult.reason}` : ''}</span>
                  </>
                )
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>⚠️ Erreur: {testResult.reason}</span>
                </>
              )}
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Liste des origines */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">Origines configurées</span>
            <Badge variant="secondary">{list.length}</Badge>
          </div>
          
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : list.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
              Aucune origine ajoutée. Commencez par tester et ajouter une origine ci-dessus.
            </div>
          ) : (
            <div className="space-y-2">
              {list.map(item => (
                <div 
                  key={item.id} 
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg ${
                    item.removed ? 'bg-red-50/50 dark:bg-red-950/20' : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{item.origin}</span>
                      {item.removed && <Badge variant="destructive">Désactivé</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground ml-6">
                      Ajouté le {new Date(item.addedAt).toLocaleDateString('fr-FR')} à {new Date(item.addedAt).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                  <div className="flex w-full sm:w-auto gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleRemoved(item.id, !item.removed)}
                      className="flex-1 sm:flex-none"
                    >
                      {item.removed ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Réactiver
                        </>
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Désactiver
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteEntry(item.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
