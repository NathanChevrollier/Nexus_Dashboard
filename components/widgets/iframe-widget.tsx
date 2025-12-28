import { Widget } from "@/lib/db/schema";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

interface IframeWidgetProps {
  widget: Widget;
}

export function IframeWidget({ widget }: IframeWidgetProps) {
  const { title, iframeUrl } = widget.options;
  const [hasError, setHasError] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);

  if (!iframeUrl) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-muted-foreground text-sm">URL non configurée</p>
      </div>
    );
  }

  // Basic URL validation
  let isValidUrl = false;
  try {
    new URL(iframeUrl);
    isValidUrl = true;
  } catch {
    isValidUrl = false;
  }

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
        <button
          onClick={() => setHasError(false)}
          className="text-xs text-blue-500 hover:underline mt-1"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background">
      <div className="p-2 flex items-center justify-end gap-2">
        <button
          className="text-xs text-primary hover:underline"
          onClick={async () => {
            if (!iframeUrl) return;
            const reason = window.prompt('Raison de la demande (optionnel)');
            setRequesting(true);
            try {
              const res = await fetch('/api/iframe/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: iframeUrl, reason }),
              });
              const body = await res.json();
              if (res.ok && body.id) {
                setRequestSent('Demande envoyée');
                setTimeout(() => setRequestSent(null), 4000);
              } else {
                setRequestSent('Erreur lors de l\'envoi');
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
        src={iframeUrl}
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
