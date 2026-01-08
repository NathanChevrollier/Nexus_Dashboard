"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DebugMessagesPage() {
  const [targetUserId, setTargetUserId] = useState('');
  const [text, setText] = useState('Hello from debug page');
  const [status, setStatus] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data?.users || []);
      } catch (e) {}
    })();
  }, []);

  const send = async () => {
    setStatus('sending');
    try {
      const res = await fetch('/api/debug/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId, eventType: 'message:new', payload: { text } }) });
      const json = await res.json();
      if (!res.ok) {
        setStatus('error: ' + (json?.error || res.statusText));
      } else {
        setStatus('sent');
      }
    } catch (e: any) {
      setStatus('error: ' + e.message);
    }
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto bg-card/60 dark:bg-card/60 rounded-lg shadow-md border border-border/40 p-6">
        <h1 className="text-2xl font-semibold mb-2 text-foreground">Debug Messages</h1>
        <div className="flex items-start justify-between gap-4">
          <p className="mb-4 text-sm text-muted-foreground">Page de test locale pour émettre des événements de message via le serveur socket.</p>
          <div className="ml-auto">
            <Link href="/dashboard" className="inline-block text-sm px-3 py-1 border border-border rounded bg-transparent hover:bg-accent/10 text-foreground">Retour au dashboard</Link>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-foreground">Choisir un utilisateur (admin uniquement)</label>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="mt-2 p-2 border border-border rounded w-full bg-card/50 text-foreground placeholder:text-muted-foreground"
          >
            <option value="">-- sélectionnez un utilisateur --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-foreground">Message</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-2 p-2 border border-border rounded w-full h-36 bg-card/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded shadow-sm hover:opacity-95" onClick={send}>Envoyer</button>
          <div className="text-sm text-muted-foreground">{status}</div>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold text-foreground mb-2">Utilisateurs récupérés</h2>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            {users.slice(0,50).map(u => (
              <div key={u.id} className="p-2 rounded border border-border/30 bg-card/30 text-foreground text-sm break-words">
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.id} — {u.role}</div>
              </div>
            ))}
            {users.length === 0 && <div className="text-sm text-muted-foreground">Aucun utilisateur trouvé</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
