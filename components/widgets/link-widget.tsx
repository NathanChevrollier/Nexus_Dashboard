import { Widget } from "@/lib/db/schema";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { getIconUrlForLink } from "@/lib/api/logos";

interface LinkWidgetProps {
  widget: Widget;
}

export function LinkWidget({ widget }: LinkWidgetProps) {
  const { title, url, icon, iconUrl, openInNewTab } = widget.options as any;

  // Validate URL
  const isValidUrl = url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'));
  const href = isValidUrl ? url : '#';

  const handleClick = (e: React.MouseEvent) => {
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
      className={`flex flex-col items-center justify-center h-full p-4 transition-colors group ${
        isValidUrl ? 'hover:bg-accent/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
      }`}
      title={isValidUrl ? '' : 'Invalid URL'}
    >
      <div className="mb-2 flex items-center justify-center">
        {resolvedIconUrl ? (
          // Afficher l'image si une URL d'icône est fournie
          <img
            src={resolvedIconUrl}
            alt={title || 'icon'}
            className="h-12 w-12 object-contain"
            onError={(e) => {
              // Fallback to emoji if image fails
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.innerHTML = `<div class="text-4xl">${icon || '🔗'}</div>`;
              }
            }}
          />
        ) : (
          <div className="text-4xl">{icon || "🔗"}</div>
        )}
      </div>
      <div className="text-center">
        <p className="font-medium group-hover:text-primary transition-colors">
          {title || "Link"}
        </p>
        {openInNewTab && (
          <ExternalLink className="h-3 w-3 text-muted-foreground mt-1 mx-auto" />
        )}
      </div>
    </Link>
  );
}
