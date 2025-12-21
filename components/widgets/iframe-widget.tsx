import { Widget } from "@/lib/db/schema";

interface IframeWidgetProps {
  widget: Widget;
}

export function IframeWidget({ widget }: IframeWidgetProps) {
  const { title, iframeUrl } = widget.options;

  if (!iframeUrl) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-muted-foreground">URL non configurée</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <iframe
        src={iframeUrl}
        title={title || "Iframe"}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
