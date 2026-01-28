'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  email: string;
  role: string;
  is_owner: boolean;
}

export default function DevDbPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/dev-db/users');
      if (!response.ok) throw new Error('Erreur chargement users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const toggleOwner = async (userId: string, currentStatus: boolean) => {
    setUpdating(userId);
    try {
      const response = await fetch('/api/debug/dev-db/toggle-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isOwner: !currentStatus }),
      });

      if (!response.ok) throw new Error('Erreur mise à jour');
      
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_owner: !currentStatus } : u
      ));
    } catch (err) {
      setError('Erreur lors de la mise à jour');
    } finally {
      setUpdating(null);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">⚠️ Non authentifié</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/debug/permissions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">🔧 Dev DB Manager</h1>
            <p className="text-sm text-muted-foreground">Gérez is_owner et autres données en dev</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <p><strong>⚠️ Dev Mode Only</strong></p>
                <p>Cette page est réservée au développement. En production, ce n'est pas accessible.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">{user.email}</span>
                        {user.is_owner && (
                          <Badge className="bg-amber-500/20 text-amber-700 shrink-0">👑 Owner</Badge>
                        )}
                        <Badge variant="outline" className="shrink-0">{user.role}</Badge>
                      </div>
                      {user.email === session?.user?.email && (
                        <p className="text-xs text-muted-foreground">← C'est toi</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={user.is_owner ? 'destructive' : 'default'}
                      onClick={() => toggleOwner(user.id, user.is_owner)}
                      disabled={updating === user.id}
                      className="ml-4 shrink-0"
                    >
                      {updating === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : user.is_owner ? (
                        '👑 Retirer Owner'
                      ) : (
                        '👑 Ajouter Owner'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Accès DB en Terminal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-blue-900 font-mono text-xs">
            <p className="text-blue-700 font-bold">Connexion:</p>
            <div className="bg-black/20 p-2 rounded">
              mysql -h localhost -u root -p nexus_dashboard_db
            </div>
            <p className="text-blue-700 font-bold mt-3">Voir les users:</p>
            <div className="bg-black/20 p-2 rounded">
              SELECT id, email, role, is_owner FROM users;
            </div>
            <p className="text-blue-700 font-bold mt-3">Ajouter owner:</p>
            <div className="bg-black/20 p-2 rounded">
              UPDATE users SET is_owner = 1 WHERE email = 'ton@email.com';
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
