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
  const isCompact = widget.w === 1 && widget.h === 1;
  const isBanner = widget.w >= 3 && widget.h === 1;
  const [imgError, setImgError] = useState(false);

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
      className={
        `flex flex-col items-center justify-center h-full p-2 transition-colors group relative overflow-hidden ` +
        (isValidUrl ? 'hover:bg-accent/50 cursor-pointer' : 'opacity-60 cursor-not-allowed')
      }
      title={isValidUrl ? (title || url) : 'Invalid URL'}
    >
      <div className={`
        flex items-center justify-center transition-all duration-200
        ${isCompact ? 'mb-0 scale-110' : 'mb-2'}
        ${isBanner ? 'mr-3 mb-0' : ''}
      `}>
        {resolvedIconUrl && !imgError ? (
          // Afficher l'image si une URL d'icône est fournie
          <img
            src={resolvedIconUrl}
            alt={title || 'icon'}
            className={`${isCompact ? 'h-10 w-10' : 'h-12 w-12'} object-contain`}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={isCompact ? "text-3xl" : "text-4xl"}>{icon || "🔗"}</div>
        )}
      </div>

      {!isCompact && (
        <div className={`
          text-center max-w-full px-1 
          ${isBanner ? 'text-left flex-1' : ''}
        `}>
          <span className={`
            font-medium leading-tight line-clamp-2 block
            ${isValidUrl ? 'group-hover:text-primary' : ''}
            ${isBanner ? 'text-lg' : 'text-sm'}
          `}>
              {title || url || "Link"}
          </span>
          {isBanner && url && <span className="text-xs text-muted-foreground truncate block max-w-[200px]">{url}</span>}
        </div>
      )}
      
      {/* Icone externe discrète ou tooltip compacte */}
      {isCompact && (
         <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 pt-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center pointer-events-none">
            <span className="text-[10px] text-white truncate max-w-full font-medium">{title || "Link"}</span>
         </div>
      )}
    </Link>
  );
}
