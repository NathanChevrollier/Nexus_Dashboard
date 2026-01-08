"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSocket } from "@/components/ui/socket-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area"; // Assure-toi d'avoir ce composant ou utilise une div overflow-auto
import { 
  X, 
  Minus, 
  Maximize2, 
  Send, 
  Plus, 
  MoreVertical, 
  Users, 
  Edit3, 
  Trash2, 
  Search,
  MessageSquarePlus,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils"; // Utilitaire standard shadcn pour les classes
import { useConfirm, usePrompt, useAlert } from "@/components/ui/confirm-provider";
import { useAlerts } from "./alerts-context";
import { useSession } from "next-auth/react";

// --- Types ---
type User = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

type Conversation = {
  id: string;
  title?: string | null;
  lastMessage?: { content: string; createdAt: string };
  otherParticipant?: { id: string; name?: string; role?: string } | null;
  participantCount?: number;
  highestRole?: string | null;
};

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type Participant = {
  id: string;
  userId: string;
  user?: User;
};

function roleClass(role?: string) {
  if (!role) return "bg-muted text-muted-foreground border border-border";
  switch ((role || "").toString().toLowerCase()) {
    case "admin":
    case "administrator":
      return "bg-red-950 text-red-200 border border-red-800";
    case "vip":
      return "bg-purple-950 text-purple-200 border border-purple-800";
    case "moderator":
    case "mod":
      return "bg-orange-950 text-orange-200 border border-orange-800";
    case "user":
    case "member":
    default:
      return "bg-green-950 text-green-200 border border-green-800";
  }
}

function formatRoleLabel(role?: string) {
  if (!role) return "Membre";
  const r = role.toString();
  // nicer mapping
  if (/admin/i.test(r)) return "Admin";
  if (/vip/i.test(r)) return "VIP";
  if (/mod/i.test(r)) return "Mod";
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function RoleBadge({ role }: { role?: string }) {
  const emoji = roleEmoji(role);
  return (
    <span className="inline-flex rounded-full p-[1px] bg-gradient-to-r from-white/10 via-white/5 to-white/8">
      <span className={`inline-flex items-center justify-center w-8 h-6 rounded-full shadow-sm ${roleClass(role)} text-sm`}>
        {emoji}
      </span>
    </span>
  );
}

function roleEmoji(role?: string) {
  if (!role) return '👥';
  const r = role.toString().toLowerCase();
  if (r.includes('admin')) return '🛡️';
  if (r.includes('vip')) return '⭐';
  if (r.includes('mod') || r.includes('moderator')) return '🔧';
  return '👤';
}

function RoleBadgeSmall({ role }: { role?: string }) {
  const emoji = roleEmoji(role);
  return (
    <span className="inline-flex rounded-full p-[1px] bg-gradient-to-r from-white/10 via-white/5 to-white/8">
      <span className={`inline-flex items-center justify-center w-7 h-6 rounded-full shadow-sm ${roleClass(role)} text-sm`}>
        {emoji}
      </span>
    </span>
  );
}

function CompositeGroupBadge({ count, highestRole }: { count?: number; highestRole?: string | null }) {
  const emoji = roleEmoji(highestRole ?? undefined);
  const showRoleLabel = highestRole && !/^(user|member)$/i.test(highestRole);
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-muted/10 text-muted-foreground ring-1 ring-border/20 shadow-sm">
      <span className="text-sm leading-none">{emoji}</span>
      <span className="truncate">{count ? `${count} membres` : 'Groupe'}</span>
      {showRoleLabel && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/6 text-muted-foreground ring-1 ring-border/10">
          {formatRoleLabel(highestRole || '')}
        </span>
      )}
    </span>
  );
}

// --- Hooks Utilitaires (Extraction de la logique) ---

function useDraggable(ref: React.RefObject<any>, handleSelector: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handle = el.querySelector(handleSelector) as HTMLElement | null;
    if (!handle) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${initialLeft + dx}px`;
      el.style.top = `${initialTop + dy}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      // store absolute positions including scroll to avoid transform issues
      initialLeft = rect.left + window.scrollX;
      initialTop = rect.top + window.scrollY;
      // lock selection and remove centering transform so left/top px positioning works
      document.body.style.userSelect = "none";
      el.style.transform = "";
      el.style.left = `${initialLeft}px`;
      el.style.top = `${initialTop}px`;

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    handle.addEventListener("mousedown", onMouseDown);
    return () => {
      handle.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [ref, handleSelector]);
}

// --- Composant Principal ---

export default function ChatDialog({ onClose }: { onClose?: () => void }) {
  const socket: any = useSocket();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const alert = useAlert();
  const { data: session } = useSession();
  const dialogRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Layout State
  const [size, setSize] = useState({ width: 800, height: 550 });
  const [isResizing, setIsResizing] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Data State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // UI State
  const [msgInput, setMsgInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Pour responsive si besoin
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Create / Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsersForNew, setSelectedUsersForNew] = useState<User[]>([]);
  const [newConvTitle, setNewConvTitle] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination State
  const [canLoadMore, setCanLoadMore] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Unread messages tracking
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Custom Hooks calls
  useDraggable(dialogRef, "[data-drag-handle]");

  const { addAlert } = useAlerts();

  // --- Initial Fetch ---
  useEffect(() => {
    setConversationsLoading(true);
    fetch("/api/chat/conversations")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setConversations(data || []);
        if (data?.[0]) setSelectedId(data[0].id);
      })
      .catch((e) => {
        console.error(e);
        addAlert({ type: "error", title: "Erreur chargement discussions", message: String(e), ttl: 7000 });
      })
      .finally(() => setConversationsLoading(false));
  }, []);

  // --- Fetch Conversation Details ---
  useEffect(() => {
    if (!selectedId) return;
    
    const fetchData = async () => {
      setMessages([]); // Reset visuel rapide
      setMessagesLoading(true);
      setParticipantsLoading(true);
      try {
        // Parallel fetch for speed
        const [msgsRes, partsRes] = await Promise.all([
          fetch(`/api/chat/conversations/${selectedId}/messages?limit=50`),
          fetch(`/api/chat/conversations/${selectedId}/participants`)
        ]);

        if (msgsRes.ok) {
          const data = await msgsRes.json();
          setMessages(data || []);
          setCanLoadMore((data || []).length === 50);
          scrollToBottom(false);
        }
        
        if (partsRes.ok) {
          const data = await partsRes.json();
          setParticipants(data || []);
        }
      } catch (e) { console.error(e); addAlert({ type: "error", title: "Erreur chargement conversation", message: String(e), ttl: 7000 }); }
      finally { setMessagesLoading(false); setParticipantsLoading(false); }
    };

    fetchData();
    setShowInviteMenu(false); // Close menus on switch
    
    // Reset unread count for this conversation
    if (selectedId) {
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[selectedId];
        return newCounts;
      });
    }
  }, [selectedId]);

  // --- Socket Listeners ---
  useEffect(() => {
    if (!socket) return;

    const onMessage = (payload: { conversationId: string; message: Message }) => {
      const { conversationId, message } = payload || {};
      if (!conversationId || !message) return;

      if (conversationId === selectedId) {
        setMessages(prev => {
           if (prev.some(m => m.id === message.id)) return prev;
           return [...prev, message];
        });
        scrollToBottom(true);
      } else {
        // Increment unread count for non-selected conversations
        setUnreadCounts(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1
        }));
      }

      // Update sidebar preview
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conversationId);
        if (idx === -1) return prev; // Ou re-fetch si nouvelle conv
        const newConvs = [...prev];
        newConvs[idx] = { ...newConvs[idx], lastMessage: message };
        // Optionnel : déplacer la conversation en haut
        const [moved] = newConvs.splice(idx, 1);
        return [moved, ...newConvs];
      });
    };

    const onTyping = (payload: { conversationId: string; userId: string; typing: boolean }) => {
       if (payload.conversationId !== selectedId) return;
       setTypingUsers(prev => ({ ...prev, [payload.userId]: payload.typing }));
       if (payload.typing) {
         setTimeout(() => setTypingUsers(prev => ({ ...prev, [payload.userId]: false })), 4000);
       }
    };

    socket.on("message:new", onMessage);
    socket.on("chat:typing", onTyping);

    return () => {
      socket.off("message:new", onMessage);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, selectedId]);

  // --- Helpers ---
  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      }
    }, 50);
  };

  const handleResize = useCallback((e: MouseEvent) => {
    if (!dialogRef.current) return;
    const rect = dialogRef.current.getBoundingClientRect();
    const newW = Math.max(600, e.clientX - rect.left); // Min width
    const newH = Math.max(400, e.clientY - rect.top);  // Min height
    setSize({ width: newW, height: newH });
  }, []);

  const stopResize = useCallback(() => {
    setIsResizing(false);
    window.removeEventListener("mousemove", handleResize);
    window.removeEventListener("mouseup", stopResize);
  }, [handleResize]);

  const startResize = () => {
    setIsResizing(true);
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stopResize);
  };

  // --- Actions ---
  const handleSendMessage = async () => {
    if (!selectedId || !msgInput.trim()) return;
    const content = msgInput.trim();
    setMsgInput(""); // Optimistic clear
    
    try {
      const res = await fetch(`/api/chat/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      // Update UI immediately with returned message or optimistic fallback
      if (res.ok) {
        const returned = await res.json().catch(() => null);
        if (returned && returned.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === returned.id)) return prev;
            return [...prev, returned];
          });
          scrollToBottom(true);
        } else {
          const temp = { id: `temp-${Date.now()}`, senderId: session?.user?.id || 'me', content, createdAt: new Date().toISOString() } as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === temp.id)) return prev;
            return [...prev, temp];
          });
          scrollToBottom(true);
        }
      } else {
        setMsgInput(content);
        addAlert({ type: 'error', title: 'Erreur envoi message', message: 'Impossible d\'envoyer le message.', ttl: 6000 });
      }
    } catch (e) {
      setMsgInput(content); // Restore on error
      addAlert({ type: "error", title: "Erreur envoi message", message: String(e), ttl: 6000 });
    }
  };

  const handleTyping = (val: string) => {
    setMsgInput(val);
    if (!socket || !selectedId) return;
    
    // Emit start typing
    socket.emit("chat:typing", { conversationId: selectedId, typing: true }); // Adapter selon ton backend
    // Ou via fetch si ton backend n'écoute pas directement les emits client
    fetch('/api/chat/typing', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, typing: true }) 
    }).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
       fetch('/api/chat/typing', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: selectedId, typing: false }) 
      }).catch(() => {});
    }, 1500);
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      setSearchLoading(true);
      setSearchResults([]);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const all = await res.json();
        const filtered = (all || []).filter((u: User) => u.id !== session?.user?.id);
        setSearchResults(filtered);
      }
    } catch (e) { addAlert({ type: 'error', title: 'Erreur recherche utilisateurs', message: String(e), ttl: 5000 }); }
    finally { setSearchLoading(false); }
  };

  const createConversation = async () => {
    // ensure no self-only conversation
    const filtered = selectedUsersForNew.filter(u => u.id !== session?.user?.id);
    if (filtered.length === 0) {
      setErrorMsg("Sélectionnez au moins un membre (vous ne pouvez pas créer une conversation uniquement avec vous-même).");
      return;
    }
    try {
      const res = await fetch('/api/chat/conversations', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          participantIds: filtered.map(u => u.id), 
          title: newConvTitle 
        }) 
      });
      if (res.ok) {
        const newConv = await res.json();
        // refresh full conversations list so otherParticipant/highestRole are present
        const listRes = await fetch('/api/chat/conversations');
        if (listRes.ok) {
          const list = await listRes.json();
          setConversations(list || []);
        } else {
          // fallback: insert the returned conv
          setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
        }
        setSelectedId(newConv.id);
        setViewMode('LIST');
        setSelectedUsersForNew([]);
        setNewConvTitle("");
      }
    } catch (e) { setErrorMsg("Erreur lors de la création."); addAlert({ type: 'error', title: 'Erreur création', message: String(e), ttl: 6000 }); }
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isEditMode) {
      await alert("Activez le mode 'Modifier' pour supprimer une conversation.");
      return;
    }
    const ok = await confirm("Voulez-vous vraiment supprimer cette conversation ?", "Confirmer la suppression");
    if (!ok) return;
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations(s => s.filter(c => c.id !== id));
        if (selectedId === id) setSelectedId(null);
        // Exit edit mode after a successful destructive action
        setIsEditMode(false);
      } else {
        addAlert({ type: 'error', title: 'Suppression échouée', message: 'Impossible de supprimer la conversation.', ttl: 6000 });
      }
    } catch (e) {
      console.error(e);
      addAlert({ type: 'error', title: 'Erreur', message: String(e), ttl: 6000 });
    }
  };

  const inviteUser = async (user: User) => {
    if (!selectedId) return;
    // prevent adding same user twice locally
    if (user.id === session?.user?.id) {
      await alert("Vous ne pouvez pas vous ajouter vous-même.");
      return;
    }
    if (participants.some(p => p.userId === user.id)) {
      await alert("L'utilisateur est déjà membre de la conversation.");
      return;
    }

    const resPost = await fetch(`/api/chat/conversations/${selectedId}/participants`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ participantIds: [user.id] })
    });
    const payload = await resPost.json().catch(() => ({}));
    if (payload?.errors && payload.errors.length) {
      const msg = payload.errors.map((e: any) => {
        if (e.error === 'cannot_add_self') return 'Impossible de s\'ajouter soi-même.';
        if (e.error === 'already_participant') return 'L\'utilisateur est déjà membre.';
        return 'Erreur lors de l\'ajout.';
      }).join(' ');
      await alert(msg);
      addAlert({ type: 'warning', title: 'Problème ajout membre', message: msg, ttl: 6000 });
    }
    // Refresh participants
    const res = await fetch(`/api/chat/conversations/${selectedId}/participants`);
    if (res.ok) setParticipants(await res.json());
    setSearchQuery("");
  };

  const currentConv = conversations.find(c => c.id === selectedId);

  // --- Rendu ---
  const content = (
    <div 
      ref={dialogRef}
      style={{ width: size.width, height: size.height, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      className="fixed z-[9999] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-border/50 text-foreground"
    >
      {/* --- HEADER SUPERIEUR (Drag handle) --- */}
      <div 
        className="h-10 border-b bg-muted/20 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none"
        data-drag-handle
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${socket ? "bg-green-500" : "bg-red-500"}`} />
          Messagerie
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        
        {/* --- SIDEBAR --- */}
        <aside className="w-64 border-r flex flex-col bg-muted/5">
          <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-muted/5 z-10">
            <h2 className="font-semibold text-sm">Discussions</h2>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => setViewMode(viewMode === 'LIST' ? 'CREATE' : 'LIST')}
                title={viewMode === 'LIST' ? "Nouvelle conversation" : "Retour liste"}
              >
                {viewMode === 'LIST' ? <MessageSquarePlus size={16} /> : <Minus size={16} />}
              </Button>
              <Button size="icon" variant={isEditMode ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => setIsEditMode(s => !s)} title="Modifier">
                <Edit3 size={14} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {viewMode === 'CREATE' ? (
              <div className="space-y-3 animate-in fade-in duration-200">
                <Input 
                  placeholder="Titre (optionnel)" 
                  value={newConvTitle}
                  onChange={e => setNewConvTitle(e.target.value)}
                  className="bg-background"
                />
                <div className="relative">
                  <Input 
                    placeholder="Chercher un utilisateur..." 
                    value={searchQuery}
                    onChange={e => handleSearchUsers(e.target.value)}
                    className="bg-background"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-popover border rounded-md shadow-lg z-20 max-h-40 overflow-auto">
                      {searchResults.map(u => (
                          <div key={u.id}
                               className="p-2 text-sm hover:bg-accent cursor-pointer flex items-center justify-between"
                               onClick={() => {
                                 if(!selectedUsersForNew.find(x => x.id === u.id)) {
                                   setSelectedUsersForNew(prev => [...prev, u]);
                                 }
                                 setSearchQuery("");
                                 setSearchResults([]);
                               }}>
                            <div className="truncate mr-2">{u.name || u.email}</div>
                            <div className="ml-2">
                              <RoleBadge role={u.role} />
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Selected Chips */}
                <div className="flex flex-wrap gap-1">
                  {selectedUsersForNew.map(u => (
                        <div key={u.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[160px]">{u.name || u.email}</span>
                        <RoleBadge role={u.role} />
                      </div>
                      <X size={10} className="cursor-pointer" onClick={() => setSelectedUsersForNew(s => s.filter(x => x.id !== u.id))} />
                    </div>
                  ))}
                </div>

                {errorMsg && <div className="text-xs text-red-500">{errorMsg}</div>}
                
                <Button className="w-full" size="sm" onClick={createConversation}>
                  Créer
                </Button>
              </div>
            ) : (
              <>
                {conversationsLoading ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-10 bg-muted/20 rounded-md animate-pulse" />
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground mt-10 p-4">Aucune conversation.</div>
                ) : (
                  conversations.map(conv => (
                    <div 
                      key={conv.id} 
                      onClick={() => setSelectedId(conv.id)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer group transition-colors relative",
                        selectedId === conv.id
                          ? "bg-gradient-to-r from-white/3 to-white/6 shadow-inner ring-1 ring-white/10"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex justify-between items-start mb-0.5">
                        <div className="font-medium text-sm truncate max-w-[160px] flex items-center gap-2">
                          {isEditMode && selectedId === conv.id ? (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const t = await prompt('Nouveau titre', conv.title || '', 'Renommer la conversation');
                                if (t === null) return;
                                const trimmed = t.trim();
                                if (!trimmed) return;
                                try {
                                  const res = await fetch(`/api/chat/conversations/${conv.id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ title: trimmed }) });
                                  if (res.ok) {
                                    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, title: trimmed } : c));
                                    setIsEditMode(false);
                                  } else {
                                    addAlert({ type: 'error', title: 'Erreur renommage', message: 'Impossible de renommer la conversation.', ttl: 6000 });
                                  }
                                } catch (e) {
                                  console.error(e);
                                  addAlert({ type: 'error', title: 'Erreur', message: String(e), ttl: 6000 });
                                }
                              }}
                              className="underline text-xs"
                            >
                              Renommer
                            </button>
                          ) : (
                            (conv as any)?.otherParticipant ? (
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[120px]">{conv.otherParticipant?.name || 'Utilisateur'}</span>
                                <RoleBadge role={conv.otherParticipant?.role} />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[140px]">{conv.title || "Conversation"}</span>
                                {(conv as any)?.participantCount && (conv as any).participantCount > 2 && (
                                  <CompositeGroupBadge count={(conv as any).participantCount} highestRole={(conv as any).highestRole} />
                                )}
                              </div>
                            )
                          )}
                          {unreadCounts[conv.id] && unreadCounts[conv.id] > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-600 rounded-full animate-pulse">
                              {unreadCounts[conv.id]}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : ''}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate pr-6">
                        {conv.lastMessage?.content || "Aucun message"}
                      </div>
                      {isEditMode && (
                        <button 
                          onClick={(e) => deleteConversation(e, conv.id)}
                          className="absolute right-2 bottom-2 p-1 text-red-600 bg-red-50 rounded"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </aside>

        {/* --- MAIN CHAT AREA --- */}
        <main className="flex-1 flex flex-col bg-background relative min-w-0">
          {selectedId ? (
            <>
              {/* Chat Header */}
              <div className="h-14 border-b flex items-center justify-between px-4 bg-background/50 backdrop-blur-sm z-10">
                <div className="flex flex-col">
                   <div className="font-semibold text-sm flex items-center gap-2">
                     {(currentConv as any)?.otherParticipant ? (
                       <div className="flex items-center gap-2">
                         <span className="truncate">{currentConv?.otherParticipant?.name || 'Utilisateur'}</span>
                         <RoleBadge role={currentConv?.otherParticipant?.role} />
                       </div>
                     ) : (
                       <div className="flex items-center gap-2">
                         <span className="truncate">{currentConv?.title || "Conversation"}</span>
                         {(currentConv as any)?.participantCount && (currentConv as any).participantCount > 2 && (
                           <CompositeGroupBadge count={(currentConv as any).participantCount} highestRole={(currentConv as any).highestRole} />
                         )}
                       </div>
                     )}
                   </div>
                   {/* Typing Indicator */}
                   <div className="h-3 text-[10px] text-primary transition-opacity duration-300">
                     {Object.entries(typingUsers).filter(([_, isTyping]) => isTyping).length > 0 && "Quelqu'un écrit..."}
                   </div>
                </div>

                <div className="flex items-center gap-1 relative">
                  <Button variant="ghost" size="sm" onClick={() => setShowInviteMenu(!showInviteMenu)} className={showInviteMenu ? "bg-accent" : ""}>
                    <Users size={16} className="mr-2" />
                    <span className="text-xs">Inviter</span>
                  </Button>
                  {isEditMode && (
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const t = await prompt('Nouveau titre', currentConv?.title || '', 'Renommer la conversation');
                      if (t === null) return;
                      const trimmed = t.trim();
                      if (!trimmed || !selectedId) return;
                      try {
                        const res = await fetch(`/api/chat/conversations/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ title: trimmed }) });
                        if (res.ok) {
                          setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, title: trimmed } : c));
                          setIsEditMode(false);
                        } else {
                          addAlert({ type: 'error', title: 'Erreur renommage', message: 'Impossible de renommer la conversation.', ttl: 6000 });
                        }
                      } catch (e) {
                        console.error(e);
                        addAlert({ type: 'error', title: 'Erreur', message: String(e), ttl: 6000 });
                      }
                    }} className="ml-2">
                      <Edit3 size={14} />
                    </Button>
                  )}
                  
                  {/* Invite Popover */}
                  {showInviteMenu && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-popover border rounded-md shadow-xl p-3 z-30 animate-in zoom-in-95">
                      <h4 className="text-xs font-semibold mb-2">Ajouter un membre</h4>
                      <Input 
                        placeholder="Rechercher..." 
                        value={searchQuery}
                        onChange={(e) => handleSearchUsers(e.target.value)}
                        className="h-8 text-xs mb-2"
                        autoFocus
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                          {searchLoading ? (
                            <div className="p-2 text-sm text-muted-foreground">Chargement...</div>
                          ) : (
                            searchResults.map(u => (
                              <div key={u.id} className="flex items-center justify-between p-1.5 hover:bg-muted rounded cursor-pointer text-xs" onClick={() => inviteUser(u)}>
                                <span className="truncate max-w-[140px]">{u.name || u.email}</span>
                                <Plus size={12} />
                              </div>
                            ))
                          )}
                          {!searchLoading && searchResults.length === 0 && searchQuery && <div className="text-xs text-muted-foreground p-1">Aucun résultat</div>}
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <h4 className="text-xs font-semibold mb-1">Membres actuels</h4>
                        <div className="space-y-1">
                            {participantsLoading ? (
                              Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
                              ))
                            ) : (
                              participants && participants.length > 2 ? (
                                participants.map(p => (
                                  <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground truncate">
                                    <div className="truncate">{p.user?.name || p.user?.email || "User"}</div>
                                    <div className="ml-2">
                                      <RoleBadge role={p.user?.role} />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-muted-foreground p-1">La liste des membres est visible uniquement pour les groupes (plus de 2 participants).</div>
                              )
                            )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/10">
                 {messagesLoading ? (
                   <div className="space-y-3">
                     {Array.from({ length: 5 }).map((_, i) => (
                       <div key={i} className={i % 2 === 0 ? "w-3/4 ml-0 bg-muted/20 h-8 rounded-md animate-pulse" : "w-2/3 ml-auto bg-muted/20 h-8 rounded-md animate-pulse"} />
                     ))}
                   </div>
                 ) : null}
                 {canLoadMore && (
                   <div className="flex justify-center py-2">
                     <Button variant="ghost" size="sm" disabled={isLoadingHistory} onClick={async () => {
                        setIsLoadingHistory(true);
                        try {
                           const earliest = messages[0];
                           const res = await fetch(`/api/chat/conversations/${selectedId}/messages?limit=50&before=${earliest.createdAt}`);
                           if (res.ok) {
                             const old = await res.json();
                             if (old.length === 0) setCanLoadMore(false);
                             else {
                               setMessages(prev => [...old, ...prev]);
                               setCanLoadMore(old.length === 50);
                             }
                           }
                        } finally { setIsLoadingHistory(false); }
                     }}>
                        {isLoadingHistory ? <Loader2 className="animate-spin h-3 w-3" /> : "Charger plus"}
                     </Button>
                   </div>
                 )}
                 
                 {messages.map((msg, i) => {
                   const userId = session?.user?.id;
                   const isMe = userId ? msg.senderId === userId : false;
                   const sender = participants.find(p => p.userId === msg.senderId);
                   const isLastFromUser = i > 0 && messages[i-1].senderId === msg.senderId;

                   const msgDate = new Date(msg.createdAt);
                   const isDifferentDay = msgDate.toDateString() !== new Date().toDateString();
                   const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                   const dateStr = msgDate.toLocaleDateString();

                   return (
                     <div key={msg.id} className="w-full">
                       {/* Message card with proper structure */}
                       <div className="rounded-xl shadow-md border border-border/50 overflow-hidden transition-all hover:shadow-lg bg-card/50 backdrop-blur-sm">
                         {/* Header */}
                         <div className="px-4 py-2.5 bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/30 flex items-center justify-between">
                           <div className="flex items-center gap-2.5">
                             <span className="text-sm font-semibold text-foreground">{sender?.user?.name || (isMe ? 'Vous' : 'Utilisateur')}</span>
                             <RoleBadgeSmall role={sender?.user?.role} />
                           </div>
                           <div className="text-xs text-muted-foreground font-medium">
                             {isDifferentDay ? <span className="mr-2">{dateStr}</span> : null}
                             <span>{timeStr}</span>
                           </div>
                         </div>

                         {/* Body */}
                         <div className="px-5 py-4 bg-background/95">
                           <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
                         </div>
                       </div>
                     </div>
                   );
                 })}
                 <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-background border-t">
                <form 
                  className="flex items-end gap-2"
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                >
                  <Input 
                    value={msgInput}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1 bg-muted/30 focus-visible:ring-1 min-h-[40px]"
                    autoFocus
                  />
                  <Button type="submit" size="icon" disabled={!msgInput.trim()}>
                    <Send size={18} />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-muted/5">
               <MessageSquarePlus size={48} className="mb-4 opacity-20" />
               <h3 className="text-lg font-medium">Sélectionnez une conversation</h3>
               <p className="text-sm opacity-60 max-w-xs mt-2">Choisissez une discussion dans la liste de gauche ou commencez-en une nouvelle.</p>
            </div>
          )}
        </main>
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50 flex items-end justify-end p-[2px]"
        onMouseDown={(e) => { e.preventDefault(); startResize(); }}
      >
        <div className="w-2 h-2 border-r-2 border-b-2 border-muted-foreground/40 rounded-br-sm" />
      </div>

      {/* Resize Overlay (empêche la perte de focus de souris sur les iframes/inputs pendant le resize) */}
      {isResizing && <div className="fixed inset-0 z-[99999] cursor-nwse-resize" />}
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}