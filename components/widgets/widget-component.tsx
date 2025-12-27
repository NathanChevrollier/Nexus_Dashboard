"use client";

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
import { useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-v2";
import ErrorBoundary from "@/components/ui/error-boundary";

interface WidgetComponentProps {
  widget: Widget;
  isEditMode: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  sourceType?: 'main' | 'category';
  sourceCategoryId?: string;
}

export const WidgetComponent = memo(function WidgetComponent({ 
  widget, 
  isEditMode, 
  onEdit, 
  onDelete,
  sourceType = 'main',
  sourceCategoryId
}: WidgetComponentProps) {
  const { startDrag, isDragging, draggedWidget } = useCrossGridDrag();
  const isThisWidgetDragging = isDragging && draggedWidget?.id === widget.id;

  const handleActionMouseDown = (event: React.MouseEvent) => {
    // Empêche le drag de capturer le mousedown
    event.stopPropagation();
  };

  // Gérer le Ctrl/Cmd+Drag pour le cross-grid drag avec animation
  const handleDragHandlePointerDown = (event: React.PointerEvent) => {
    // Supporter Command (⌘) sur macOS via metaKey
    const activateCrossGrid = event.ctrlKey || event.metaKey;
    if (isEditMode && activateCrossGrid) {
      event.preventDefault();
      event.stopPropagation();
      
      // Ajouter une classe d'animation temporaire
      const widgetElement = event.currentTarget.closest('.h-full.w-full.flex.flex-col') as HTMLElement;
      if (widgetElement) {
        widgetElement.style.transform = 'scale(1.05)';
        widgetElement.style.transition = 'transform 0.2s ease-out';
        widgetElement.style.boxShadow = '0 10px 40px rgba(var(--primary-rgb, 59, 130, 246), 0.4)';
        
        setTimeout(() => {
          widgetElement.style.transform = 'scale(1)';
          widgetElement.style.boxShadow = 'none';
        }, 200);
      }
      
      startDrag(widget, sourceType, sourceCategoryId);
    }
    // Sinon, laisser le drag normal se produire (géré par CustomGridLayout)
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
    <div className={`h-full w-full flex flex-col transition-all duration-200 ${isThisWidgetDragging ? 'opacity-70 scale-95 ring-2 ring-primary ring-offset-2' : ''}`}>
      {isEditMode && (
        <div className="px-3 py-2 border-b bg-muted/50 text-xs text-muted-foreground flex items-center justify-between gap-2">
          <div 
            className="widget-drag-handle cursor-move select-none flex items-center gap-1 hover:text-primary transition-colors"
            onPointerDown={handleDragHandlePointerDown}
            title="Glisser pour déplacer | Ctrl+Glisser pour changer de catégorie"
          >
            <GripVertical className="h-3 w-3 opacity-60" />
            <span>{widget.type}</span>
            <span className="text-[10px] opacity-50 ml-1">(Ctrl/Cmd = 🔄)</span>
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
        <ErrorBoundary>
          {renderWidget()}
        </ErrorBoundary>
      </div>
    </div>
  );
});
