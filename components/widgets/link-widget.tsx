import { Widget } from "@/lib/db/schema";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface LinkWidgetProps {
  widget: Widget;
}

export function LinkWidget({ widget }: LinkWidgetProps) {
  const { title, url, icon, openInNewTab } = widget.options;

  return (
    <Link
      href={url || "#"}
      target={openInNewTab ? "_blank" : "_self"}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className="flex flex-col items-center justify-center h-full p-4 hover:bg-accent/50 transition-colors group"
    >
      <div className="text-4xl mb-2">
        {icon || "🔗"}
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
