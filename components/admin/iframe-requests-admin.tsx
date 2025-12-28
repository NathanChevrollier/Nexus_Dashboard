"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface IfRequest {
  id: string;
  userId: string;
  url: string;
  reason?: string | null;
  status: string;
  createdAt: string;
}

export default function IframeRequestsAdmin() {
  const [requests, setRequests] = useState<IfRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/iframe/requests');
      const body = await res.json();
      if (res.ok && body.requests) setRequests(body.requests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const doAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/iframe/requests/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      });
      if (res.ok) await fetchRequests();
      else console.error('Action failed', await res.text());
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (requests.length === 0) return <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>;

  return (
    <div className="space-y-3">
      {requests.map(r => (
        <div key={r.id} className="p-3 border rounded-lg flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium">{r.url}</p>
            {r.reason && <p className="text-xs text-muted-foreground">Motif: {r.reason}</p>}
            <p className="text-xs text-muted-foreground">Soumis: {new Date(r.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="default" onClick={() => doAction(r.id, 'approve')}>Approuver</Button>
            <Button size="sm" variant="destructive" onClick={() => doAction(r.id, 'reject')}>Refuser</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
