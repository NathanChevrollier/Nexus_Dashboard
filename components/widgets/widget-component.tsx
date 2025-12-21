import { memo } from "react";
import { Widget } from "@/lib/db/schema";
import { LinkWidget } from "./link-widget";
import { PingWidget } from "./ping-widget";
import { IframeWidget } from "./iframe-widget";
import { DateTimeWidget } from "./datetime-widget";
import { WeatherWidget } from "./weather-widget";
import { NotesWidget } from "./notes-widget";
import { ChartWidget } from "./chart-widget";
import { AnimeCalendarWidget } from "./anime-calendar-widget";
import { TodoListWidget } from "./todo-list-widget";
import { WatchlistWidget } from "./watchlist-widget";
import { TimerWidget } from "./timer-widget";
import { BookmarksWidget } from "./bookmarks-widget";
import { QuoteWidget } from "./quote-widget";
import { CountdownWidget } from "./countdown-widget";
import { UniversalCalendarWidget } from "./universal-calendar-widget";
import { MoviesAndTVCalendarWidget } from "./movies-tv-calendar-widget";
import { MediaRequestsWidget } from "./media-requests-widget";
import { TorrentOverviewWidget } from "./torrent-overview-widget";
import { MonitoringWidget } from "./monitoring-widget";
import { MediaLibraryWidget } from "./media-library-widget";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, GripVertical } from "lucide-react";

interface WidgetComponentProps {
  widget: Widget;
  isEditMode: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const WidgetComponent = memo(function WidgetComponent({ widget, isEditMode, onEdit, onDelete }: WidgetComponentProps) {
  const handleActionMouseDown = (event: React.MouseEvent) => {
    // Empêche react-grid-layout de capturer le mousedown et de déclencher un drag
    event.stopPropagation();
  };
  const renderWidget = () => {
    switch (widget.type) {
      case "link":
        return <LinkWidget widget={widget} />;
      case "ping":
        return <PingWidget widget={widget} />;
      case "iframe":
        return <IframeWidget widget={widget} />;
      case "datetime":
        return <DateTimeWidget widget={widget} />;
      case "weather":
        return <WeatherWidget widget={widget} />;
      case "notes":
        return <NotesWidget widget={widget} />;
      case "chart":
        return <ChartWidget widget={widget} />;
      case "anime-calendar":
        return <AnimeCalendarWidget width={widget.w} height={widget.h} />;
      case "todo-list":
        return <TodoListWidget widget={widget} />;
      case "watchlist":
        return <WatchlistWidget widget={widget} />;
      case "timer":
        return <TimerWidget widget={widget} />;
      case "bookmarks":
        return <BookmarksWidget widget={widget} />;
      case "quote":
        return <QuoteWidget widget={widget} />;
      case "countdown":
        return <CountdownWidget widget={widget} />;
      case "universal-calendar":
        return <UniversalCalendarWidget />;
      case "movies-tv-calendar":
        return <MoviesAndTVCalendarWidget options={widget.options as any} />;
      case "media-requests":
        return <MediaRequestsWidget widget={widget} />;
      case "torrent-overview":
        return <TorrentOverviewWidget widget={widget} />;
      case "monitoring":
        return <MonitoringWidget widget={widget} />;
      case "media-library":
        return <MediaLibraryWidget widget={widget} />;
      default:
        return (
          <div className="p-4">
            <p className="text-muted-foreground">Type de widget inconnu: {widget.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {isEditMode && (
        <div className="px-3 py-2 border-b bg-muted/50 text-xs text-muted-foreground flex items-center justify-between gap-2">
          <div className="widget-drag-handle cursor-move select-none flex items-center gap-1">
            <GripVertical className="h-3 w-3 opacity-60" />
            <span>{widget.type}</span>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-1 widget-no-drag">
              {onEdit && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onMouseDown={handleActionMouseDown}
                  onClick={onEdit}
                  title="Modifier le widget"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-6 w-6"
                  onMouseDown={handleActionMouseDown}
                  onClick={onDelete}
                  title="Supprimer le widget"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-hidden widget-no-drag">
        {renderWidget()}
      </div>
    </div>
  );
});
