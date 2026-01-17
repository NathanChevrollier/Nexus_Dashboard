"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/ui/socket-provider";
import { Bell, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Notification {
  id: string;
  type: 'share:created' | 'share:accepted' | 'share:rejected' | 'iframe_request' | 'iframe_request_approved' | 'message:received' | 'user:pending';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  payload: any;
  link?: string;
}

export default function NotificationCenter() {
  const socket = useSocket();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Charger les notifications depuis localStorage au montage
  useEffect(() => {
    const stored = localStorage.getItem('nexus-notifications');
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error('Erreur chargement notifications:', e);
      }
    }
  }, []);

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('nexus-notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (!socket) {
      console.log('[NotificationCenter] Socket not available yet');
      return;
    }

    console.log('[NotificationCenter] Setting up socket listeners');

    const addNotification = (type: Notification['type'], title: string, message: string, payload: any, link?: string) => {
      console.log('[NotificationCenter] Adding notification:', { type, title, message, payload });
      
      const newNotif: Notification = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false,
        payload,
        link,
      };

      setNotifications((prev) => {
        const updated = [newNotif, ...prev];
        console.log('[NotificationCenter] Notifications updated:', updated.length);
        return updated;
      });

      // Notification navigateur
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(title, { body: message });
        }
      } catch (e) {}
    };

    const onShareCreated = (payload: any) => {
      console.log('[NotificationCenter] share:created event received:', payload);
      addNotification(
        'share:created',
        'Nouvelle invitation',
        `Invitation reçue pour le dashboard ${payload.dashboardId}`,
        payload,
        `/dashboard/${payload.dashboardId}`
      );
    };

    const onShareAccepted = (payload: any) => {
      addNotification(
        'share:accepted',
        'Invitation acceptée',
        `Votre invitation a été acceptée par ${payload.targetUserId}`,
        payload
      );
    };

    const onShareRejected = (payload: any) => {
      addNotification(
        'share:rejected',
        'Invitation refusée',
        `Votre invitation a été refusée par ${payload.targetUserId}`,
        payload
      );
    };

    const onIframeRequest = (payload: any) => {
      addNotification(
        'iframe_request',
        'Demande Iframe',
        `Nouvelle demande d'iframe: ${payload.url || payload.origin || payload.id}`,
        payload,
        '/settings?tab=admin'
      );
    };

    const onIframeApproved = (payload: any) => {
      addNotification(
        'iframe_request_approved',
        'Iframe approuvée',
        `Votre demande iframe a été approuvée (${payload.origin || payload.requestId})`,
        payload
      );
    };

    const onUserPending = (payload: any) => {
      console.log('[NotificationCenter] user:pending event received:', payload);
      addNotification(
        'user:pending',
        "Nouvel utilisateur en attente",
        `Utilisateur ${payload.name || payload.email || payload.userId} en attente de validation`,
        payload,
        '/admin/users'
      );
    };

    const onMessageNew = (payload: any) => {
      try {
        const { conversationId, message } = payload || {};
        addNotification(
          'message:received',
          'Nouveau message',
          message?.content ? `${message.content}` : 'Vous avez reçu un nouveau message',
          payload,
        );
      } catch (e) {
        console.warn('onMessageNew error', e);
      }
    };

    console.log('[NotificationCenter] Registering socket event listeners');
    socket.on('share:created', onShareCreated);
    socket.on('share:accepted', onShareAccepted);
    socket.on('share:rejected', onShareRejected);
    socket.on('iframe_request', onIframeRequest);
    socket.on('iframe_request_approved', onIframeApproved);
    socket.on('user:pending', onUserPending);
    socket.on('message:new', onMessageNew);

    // Test de connexion
    socket.on('connect', () => {
      console.log('[NotificationCenter] Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[NotificationCenter] Socket disconnected');
    });

    console.log('[NotificationCenter] Socket connected status:', socket.connected);

    // On connect, fetch unread notifications from server and merge
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications?unread=1');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          // map server rows into Notification interface
          const mapped = data.map((d: any) => ({
            id: d.id,
            type: d.type,
            title: d.title,
            message: d.message || '',
            timestamp: new Date(d.createdAt).getTime(),
            read: !!d.read,
            payload: d.payload || {},
            link: d.link || undefined,
          } as Notification));

          setNotifications((prev) => {
            // merge, avoiding duplicates by id
            const existingIds = new Set(prev.map(p => p.id));
            const merged = [...mapped.filter(m => !existingIds.has(m.id)), ...prev];
            return merged;
          });
        }
      } catch (e) {
        console.warn('Failed to fetch unread notifications', e);
      }
    };

    fetchUnread();

    return () => {
      console.log('[NotificationCenter] Cleaning up socket listeners');
      socket.off('share:created', onShareCreated);
      socket.off('share:accepted', onShareAccepted);
      socket.off('share:rejected', onShareRejected);
      socket.off('iframe_request', onIframeRequest);
      socket.off('iframe_request_approved', onIframeApproved);
      socket.off('user:pending', onUserPending);
      socket.off('message:new', onMessageNew);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      // notify server
      try {
        fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) }).catch(() => {});
      } catch (e) {}
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const ids = prev.filter(n => !n.read).map(n => n.id);
      try {
        if (ids.length) fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).catch(() => {});
        else fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).catch(() => {});
      } catch (e) {}
      return prev.map(n => ({ ...n, read: true }));
    });
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const deleteAllNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'share:created':
        return '📨';
      case 'share:accepted':
        return '✅';
      case 'share:rejected':
        return '❌';
      case 'iframe_request':
        return '🔲';
      case 'iframe_request_approved':
        return '✅';
      default:
        return '🔔';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <DropdownMenuLabel className="p-0 text-base font-semibold">
              Notifications
            </DropdownMenuLabel>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune nouvelle notification'}
            </p>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Tout lire
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteAllNotifications}
                className="h-8 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Effacer
              </Button>
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vous serez notifié ici
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    relative group flex gap-3 p-3 rounded-lg transition-all cursor-pointer
                    ${notification.read 
                      ? 'bg-background hover:bg-accent/50' 
                      : 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                    }
                  `}
                >
                  {/* Icône */}
                  <div className="text-2xl shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm leading-tight">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>

                  {/* Bouton supprimer */}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer la notification"
                    title="Supprimer"
                    onClick={(e) => deleteNotification(notification.id, e)}
                    className="h-8 w-8 opacity-100 group-hover:opacity-100 transition-colors shrink-0 rounded-md bg-destructive/5 text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
