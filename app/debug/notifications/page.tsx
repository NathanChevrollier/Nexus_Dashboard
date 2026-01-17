"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/ui/socket-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, X, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";

export default function NotificationDebugPage() {
  const socket = useSocket();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [serverNotifs, setServerNotifs] = useState<any[]>([]);
  const [eventType, setEventType] = useState('share:created');
  const [customPayload, setCustomPayload] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      setEvents(prev => [`✅ Socket connecté (${new Date().toLocaleTimeString()})`, ...prev]);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setEvents(prev => [`❌ Socket déconnecté (${new Date().toLocaleTimeString()})`, ...prev]);
    };

    const onShareCreated = (payload: any) => {
      setEvents(prev => [`📨 share:created - ${JSON.stringify(payload)}`, ...prev]);
    };

    const onShareAccepted = (payload: any) => {
      setEvents(prev => [`✅ share:accepted - ${JSON.stringify(payload)}`, ...prev]);
    };

    const onShareRejected = (payload: any) => {
      setEvents(prev => [`❌ share:rejected - ${JSON.stringify(payload)}`, ...prev]);
    };

    const onIframeRequest = (payload: any) => {
      setEvents(prev => [`🔲 iframe_request - ${JSON.stringify(payload)}`, ...prev]);
    };

    const onIframeApproved = (payload: any) => {
      setEvents(prev => [`✅ iframe_request_approved - ${JSON.stringify(payload)}`, ...prev]);
    };

    const onUserPending = (payload: any) => {
      setEvents(prev => [`🧑‍💼 user:pending - ${JSON.stringify(payload)}`, ...prev]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('share:created', onShareCreated);
    socket.on('share:accepted', onShareAccepted);
    socket.on('share:rejected', onShareRejected);
    socket.on('iframe_request', onIframeRequest);
    socket.on('iframe_request_approved', onIframeApproved);
    socket.on('user:pending', onUserPending);

    // Check initial connection status
    if (socket.connected) {
      setIsConnected(true);
      setEvents(prev => [`✅ Socket déjà connecté au chargement`, ...prev]);
    }

    // fetch current unread notifications from server on connect
    (async () => {
      try {
        const res = await fetch('/api/notifications?unread=1');
        if (!res.ok) return;
        const data = await res.json();
        setServerNotifs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn('Failed to fetch server notifications', e);
      }
    })();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('share:created', onShareCreated);
      socket.off('share:accepted', onShareAccepted);
      socket.off('share:rejected', onShareRejected);
      socket.off('iframe_request', onIframeRequest);
      socket.off('iframe_request_approved', onIframeApproved);
      socket.off('user:pending', onUserPending);
    };
  }, [socket]);

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('Les notifications ne sont pas supportées dans ce navigateur');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const sendTestNotification = async () => {
    if (!socket || !isConnected) {
      alert('Socket non connecté !');
      return;
    }

    setEvents(prev => [`⏳ Envoi de l'événement test...`, ...prev]);

    try {
      // Appeler l'API backend pour émettre l'événement via le serveur Socket.io
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            eventType: eventType,
            payload: customPayload ? JSON.parse(customPayload) : { dashboardId: 'test-dashboard-123', message: 'Ceci est un test de notification' },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEvents(prev => [`✅ Événement émis avec succès: ${data.event} → ${data.targetUserId}`, ...prev]);
      } else {
        setEvents(prev => [`❌ Erreur: ${data.error}`, ...prev]);
        alert(`Erreur: ${data.error}`);
      }
    } catch (error: any) {
      setEvents(prev => [`❌ Erreur réseau: ${error.message}`, ...prev]);
      alert(`Erreur réseau: ${error.message}`);
    }
  };

  const refreshServerNotifs = async () => {
    try {
      const res = await fetch('/api/notifications?unread=1');
      if (!res.ok) return;
      const data = await res.json();
      setServerNotifs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('refreshServerNotifs error', e);
    }
  };

  const markServerNotifRead = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
      refreshServerNotifs();
    } catch (e) {}
  };

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated or not admin
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Debug Notifications</h1>
            <p className="text-muted-foreground mt-1">Test du système de notifications en temps réel</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Retour au dashboard</Button>
          </Link>
        </div>

        {/* Statut Socket */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  Socket Connecté
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-500" />
                  Socket Déconnecté
                </>
              )}
            </CardTitle>
            <CardDescription>
              État de la connexion WebSocket en temps réel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Session:</span>
              <Badge variant={session ? "default" : "destructive"}>
                {session ? `${session.user?.name || session.user?.email}` : 'Non connecté'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Socket:</span>
              <Badge variant={socket ? "default" : "destructive"}>
                {socket ? 'Initialisé' : 'Non initialisé'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Connexion:</span>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Permissions Notifications
            </CardTitle>
            <CardDescription>
              Statut des permissions de notifications navigateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Permission:</span>
              <Badge 
                variant={
                  notificationPermission === 'granted' ? 'default' :
                  notificationPermission === 'denied' ? 'destructive' : 'secondary'
                }
              >
                {notificationPermission === 'granted' ? '✅ Accordée' :
                 notificationPermission === 'denied' ? '❌ Refusée' : '⏳ Non demandée'}
              </Badge>
            </div>
            {notificationPermission !== 'granted' && (
              <Button onClick={requestNotificationPermission} variant="outline" size="sm">
                Demander la permission
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Actions de test */}
        <Card>
          <CardHeader>
            <CardTitle>Actions de Test</CardTitle>
            <CardDescription>
              Émettre des événements pour tester le système
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="col-span-2 p-2 rounded border bg-background">
                <option value="share:created">share:created</option>
                <option value="share:accepted">share:accepted</option>
                <option value="share:rejected">share:rejected</option>
                <option value="iframe_request">iframe_request</option>
                <option value="iframe_request_approved">iframe_request_approved</option>
                <option value="user:pending">user:pending</option>
                <option value="message:new">message:new</option>
              </select>
              <Button onClick={sendTestNotification} disabled={!isConnected} className="w-full">📤 Émettre</Button>
            </div>

            <div>
              <label className="text-xs font-medium">Payload JSON (optionnel)</label>
              <textarea value={customPayload} onChange={(e) => setCustomPayload(e.target.value)} placeholder='{"dashboardId":"test","message":"hello"}' className="mt-1 w-full p-2 rounded border bg-background text-xs" rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">
              Cliquez sur le bouton pour émettre un événement test. La notification devrait apparaître en bas à droite de l'écran dans quelques secondes.
            </p>
            <div className="bg-muted/50 p-3 rounded-lg border">
              <p className="text-xs font-semibold mb-1">ℹ️ Comment ça fonctionne:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Le bouton envoie une requête à l'API Next.js</li>
                <li>L'API contacte le serveur Socket.io</li>
                <li>Le serveur envoie l'événement à votre socket</li>
                <li>NotificationBell reçoit l'événement et affiche la notification</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Log des événements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Log des Événements</CardTitle>
                <CardDescription>
                  Tous les événements Socket reçus (max 20 derniers)
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEvents([])}
              >
                Effacer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun événement reçu. Essayez d'émettre un événement test ou déclenchez une action dans l'app.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.slice(0, 20).map((event, idx) => (
                  <div 
                    key={idx}
                    className="text-xs font-mono bg-muted p-2 rounded border"
                  >
                    {event}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Server unread notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notifications Serveur (non-lues)</CardTitle>
                <CardDescription>Notifications persistées côté serveur</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={refreshServerNotifs}>Rafraîchir</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {serverNotifs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune notification serveur non-lue.</p>
            ) : (
              <div className="space-y-2">
                {serverNotifs.map((n) => (
                  <div key={n.id} className="p-2 border rounded flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{n.title} <span className="text-xs text-muted-foreground">({n.type})</span></div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground/60">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-col gap-1 ml-3">
                      <Button size="sm" onClick={() => markServerNotifRead(n.id)}>Marquer lue</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guide de test */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>📖 Guide de Test</CardTitle>
            <CardDescription>Comment tester les notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">1. Invitation Dashboard:</h4>
              <p className="text-muted-foreground">
                Allez sur un dashboard → Partagez-le avec un autre utilisateur → 
                L'utilisateur recevra une notification <code className="bg-muted px-1 rounded">share:created</code>
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">2. Requête Iframe:</h4>
              <p className="text-muted-foreground">
                Ajoutez un widget Iframe avec une URL non autorisée → 
                Les admins recevront une notification <code className="bg-muted px-1 rounded">iframe_request</code>
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">3. Approbation Iframe:</h4>
              <p className="text-muted-foreground">
                Admin approuve une requête → 
                L'utilisateur recevra <code className="bg-muted px-1 rounded">iframe_request_approved</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
