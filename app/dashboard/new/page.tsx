"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewDashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState<{ public: any[]; shared: any[] } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/dashboards/available');
        if (!mounted) return;
        const data = await res.json();
        setAvailable(data);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleClone = async (templateId: string, templateName: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboards/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardId: templateId, name: name || `Clone de ${templateName}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors du clonage');
      } else {
        router.push(`/dashboard/${data.slug}`);
        router.refresh();
      }
    } catch (err) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isPublic }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de la création du dashboard");
      } else {
        router.push(`/dashboard/${data.slug}`);
        router.refresh();
      }
    } catch (error) {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Créer un Nouveau Dashboard</CardTitle>
            <CardDescription>
              Créez un espace personnalisé pour organiser vos widgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {available && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Templates publics ou partagés</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {available.public.map((p) => (
                    <div key={p.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">Public</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleClone(p.id, p.name)} disabled={loading}>
                            Utiliser ce template
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {available.shared.map((s) => (
                    <div key={s.shareId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">Partagé par {s.owner?.name || s.owner?.email} • {s.permission}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleClone(s.dashboardId, s.name)} disabled={loading}>
                            Cloner
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du Dashboard</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Home, Work, Monitoring..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="isPublic"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPublic" className="cursor-pointer">
                  Dashboard public (partageable en lecture seule)
                </Label>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Création..." : "Créer le Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
