"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Clock, Link as LinkIcon } from "lucide-react";

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

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Demandes d'autorisation iframe
        </CardTitle>
        <CardDescription>
          Examinez et approuvez les demandes d'intégration d'URLs externes dans des iframes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des demandes...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
            Aucune demande en attente. Les nouvelles demandes d'iframe apparaîtront ici.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-medium">Demandes en attente</span>
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((r) => (
                <div 
                  key={r.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm break-all">{r.url}</span>
                    </div>
                    {r.reason && (
                      <div className="text-xs text-muted-foreground ml-6 mb-2">
                        <span className="font-medium">Motif:</span> {r.reason}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground ml-6">
                      Soumis le {new Date(r.createdAt).toLocaleDateString('fr-FR')} à {new Date(r.createdAt).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                  <div className="flex w-full sm:w-auto gap-2">
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={() => doAction(r.id, 'approve')}
                      className="flex-1 sm:flex-none"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approuver
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => doAction(r.id, 'reject')}
                      className="flex-1 sm:flex-none"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
