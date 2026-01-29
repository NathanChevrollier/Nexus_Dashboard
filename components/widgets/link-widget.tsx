import { Widget } from "@/lib/db/schema";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { getIconUrlForLink } from "@/lib/api/logos";
import { useState } from "react";

interface LinkWidgetProps {
  widget: Widget;
}

export function LinkWidget({ widget }: LinkWidgetProps) {
  const { title, url, icon, iconUrl, openInNewTab } = widget.options as any;
  const [imgError, setImgError] = useState(false);

  // Validate URL
  const isValidUrl = url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'));
  const href = isValidUrl ? url : '#';

  const handleClick = (e: React.MouseEvent) => {
    // Si on est en mode édition, on empêche le clic pour éviter d'ouvrir le lien pendant le drag
    // GridStack ajoute 'ui-draggable-dragging' mais c'est sur le parent.
    // Une méthode simple est de vérifier si le parent a une classe indiquant le drag, mais c'est complexe.
    // Mieux : Si on a bougé souris > X px, c'est un drag.
    // Mais ici on n'a que onClick.
    
    // Gestion du Ctrl+Click / Meta+Click pour ouvrir dans un nouvel onglet
    if (e.ctrlKey || e.metaKey || e.button === 1) {
       return;
    }

    if (!isValidUrl) {
      e.preventDefault();
      console.warn('Invalid URL:', url);
    }
  };

  const resolvedIconUrl = iconUrl || (isValidUrl ? getIconUrlForLink(url) : null);

  return (
    <Link
      href={href}
      target={openInNewTab ? "_blank" : "_self"}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      className={
        `flex flex-col items-center justify-center h-full p-2 transition-colors group relative overflow-hidden link-widget-trigger ` +
        (isValidUrl ? 'hover:bg-accent/50 cursor-pointer' : 'opacity-60 cursor-not-allowed')
      }
      title={isValidUrl ? (title || url) : 'Invalid URL'}
    >
      <div className="flex items-center justify-center transition-all duration-200 mb-2">
        {resolvedIconUrl && !imgError ? (
          // Afficher l'image si une URL d'icône est fournie
          <img
            src={resolvedIconUrl}
            alt={title || 'icon'}
            className="h-12 w-12 object-contain"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-4xl">{icon || "🔗"}</div>
        )}
      </div>

      <div className="text-center max-w-full px-1">
        <span className={`
          font-medium leading-tight line-clamp-2 block text-sm
          ${isValidUrl ? 'group-hover:text-primary' : ''}
        `}>
            {title || url || "Link"}
        </span>
      </div>
    </Link>
  );
}
