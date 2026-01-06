"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.requests) setRequests(body.requests);
      else setRequests([]);
    } catch (e) {
      console.error(e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const doAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/iframe/requests/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      });
      if (res.ok) {
        await fetchRequests();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('iframe-requests-changed'));
        }
      } else console.error('Action failed', await res.text());
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (requests.length === 0) return <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {requests.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm break-words">{r.url}</div>
                {r.reason && <div className="text-xs text-muted-foreground mt-1">Motif: {r.reason}</div>}
                <div className="text-xs text-muted-foreground mt-1">Soumis: {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="default" onClick={() => doAction(r.id, 'approve')}>Approuver</Button>
                <Button size="sm" variant="destructive" onClick={() => doAction(r.id, 'reject')}>Refuser</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
