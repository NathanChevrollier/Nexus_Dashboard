import { Widget } from "@/lib/db/schema";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { usePrompt, useAlert } from "@/components/ui/confirm-provider";

interface IframeWidgetProps {
  widget: Widget;
}

export function IframeWidget({ widget }: IframeWidgetProps) {
  const { title } = widget.options || {};
  const opts = (widget.options || {}) as any;
  let iframeUrl = opts?.iframeUrl || opts?.url || null;
  const [hasError, setHasError] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const prompt = usePrompt();
  const alert = useAlert();

  if (!iframeUrl) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-muted-foreground text-sm">URL non configurée</p>
      </div>
    );
  }

  // Normalize URL: allow entering host without protocol (e.g. example.com)
  let normalizedUrl: string | null = null;
  try {
    normalizedUrl = new URL(iframeUrl).toString();
  } catch {
    try {
      normalizedUrl = new URL(`https://${iframeUrl}`).toString();
    } catch {
      normalizedUrl = null;
    }
  }
  const isValidUrl = !!normalizedUrl;

  if (!isValidUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 gap-2">
        <AlertCircle className="h-6 w-6 text-yellow-500" />
        <p className="text-xs text-muted-foreground text-center">URL invalide</p>
        <p className="text-[11px] text-muted-foreground text-center break-all">{iframeUrl}</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 gap-2">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-xs text-muted-foreground">Erreur lors du chargement</p>
        {errorText && <p className="text-xs text-muted-foreground text-center">{errorText}</p>}
        <button
          onClick={() => setHasError(false)}
          className="text-xs text-blue-500 hover:underline mt-1"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Check embeddability on mount and when URL changes
  useEffect(() => {
    let mounted = true;
    async function check() {
      setErrorText(null);
      try {
        const res = await fetch('/api/iframe/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: normalizedUrl }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setHasError(true);
          setErrorText(body.error || 'Erreur lors de la vérification');
          return;
        }
        if (body && body.embeddable === false) {
          if (mounted) {
            setHasError(true);
            setErrorText(body.reason || 'Le site refuse d\'être embarqué (X-Frame-Options/CSP).');
          }
        } else {
          // clear any previous error
          setHasError(false);
          setErrorText(null);
        }
      } catch (e) {
        console.error('check iframe error', e);
      }
    }
    if (normalizedUrl) check();

    // refresh when admin approves requests (allowlist changes)
    const handler = () => { if (normalizedUrl) check(); };
    window.addEventListener('iframe-requests-changed', handler as EventListener);
    return () => { mounted = false; window.removeEventListener('iframe-requests-changed', handler as EventListener); };
  }, [normalizedUrl]);

  return (
    <div className="h-full w-full bg-background">
      <div className="p-2 flex items-center justify-end gap-2">
        <button
          className="text-xs text-primary hover:underline"
          onClick={async () => {
            if (!iframeUrl) return;
            const reason = await prompt('Raison de la demande (optionnel)', '');
            setRequesting(true);
            try {
              const res = await fetch('/api/iframe/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: normalizedUrl || iframeUrl, reason }),
              });
              const body = await res.json();
              if (res.ok && body.id) {
                setRequestSent('Demande envoyée');
                setTimeout(() => setRequestSent(null), 4000);
              } else {
                const errMsg = (body && (body.error || body.message)) ? (body.error || body.message) : 'Erreur lors de l\'envoi';
                setRequestSent(errMsg);
                console.error('Request iframe failed', body);
              }
            } catch (e) {
              console.error(e);
              setRequestSent('Erreur réseau');
            } finally {
              setRequesting(false);
            }
          }}
          disabled={requesting}
        >
          Demander autorisation
        </button>
        {requestSent && <span className="text-xs text-muted-foreground">{requestSent}</span>}
      </div>
      <iframe
        src={normalizedUrl || iframeUrl}
        title={title || "Iframe"}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="fullscreen; encrypted-media; picture-in-picture"
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setHasError(false)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
