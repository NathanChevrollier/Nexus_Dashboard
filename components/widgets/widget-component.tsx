"use client";

import { memo } from "react";
import { Widget } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, Trash2, GripVertical, AlertTriangle } from "lucide-react";
import { useCrossGridDrag } from "@/lib/contexts/cross-grid-drag-context";
import ErrorBoundary from "@/components/ui/error-boundary";

// Imports des widgets
import { LinkWidget } from "./link-widget";
import { PingWidget } from "./ping-widget";
import { LinkPingWidget } from "./link-ping-widget";
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
import { LibraryWidget } from './library-widget';
import { SpotifyPersonalWidget } from './spotify-personal-widget';
import GamesWidget from './games-widget';

import GameLeaderboardWidget from './game-leaderboard-widget';

interface WidgetComponentProps {
  widget: Widget;
  isEditMode: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  sourceType?: 'main' | 'category';
  sourceCategoryId?: string;
}

const WIDGET_REGISTRY: Record<string, React.ComponentType<any>> = {
  "link": LinkWidget,
  "ping": PingWidget,
  "link-ping": LinkPingWidget,
  "iframe": IframeWidget,
  "datetime": DateTimeWidget,
  "weather": WeatherWidget,
  "notes": NotesWidget,
  "chart": ChartWidget,
  "anime-calendar": AnimeCalendarWidget,
  "todo-list": TodoListWidget,
  "watchlist": WatchlistWidget,
  "timer": TimerWidget,
  "bookmarks": BookmarksWidget,
  "quote": QuoteWidget,
  "countdown": CountdownWidget,
  "universal-calendar": UniversalCalendarWidget,
  "movies-tv-calendar": MoviesAndTVCalendarWidget,
  "media-requests": MediaRequestsWidget,
  "torrent-overview": TorrentOverviewWidget,
  "monitoring": MonitoringWidget,
  "media-library": MediaLibraryWidget,
  "library": LibraryWidget,
  "spotify-personal": SpotifyPersonalWidget,
  "games": GamesWidget,

  "game-leaderboard": GameLeaderboardWidget,
};

// Widgets "Seamless" (Sans bordures par le parent)
const SEAMLESS_WIDGETS = [
  "link-ping",
];

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

  const isSeamless = SEAMLESS_WIDGETS.includes(widget.type);

  // Gestion du Drag
  // Gridstack handles drag natively via .widget-drag-handle class
  const handleDragHandlePointerDown = (event: React.PointerEvent) => {
     // Legacy handler kept empty just to satisfy interface if needed
  };

  const WidgetToRender = WIDGET_REGISTRY[widget.type];

  const renderContent = () => {
    if (!WidgetToRender) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-4 bg-muted/20 text-muted-foreground border-2 border-dashed rounded-lg">
          <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-xs font-medium">Widget inconnu: {widget.type}</p>
        </div>
      );
    }
    // Props spécifiques
    if (widget.type === "anime-calendar") return <AnimeCalendarWidget width={widget.w} height={widget.h} />;
    if (widget.type === "movies-tv-calendar") return <MoviesAndTVCalendarWidget options={widget.options as any} />;
    
    return <WidgetToRender widget={widget} />;
  };

  return (
    <div
      className={cn(
        'widget-container h-full w-full flex flex-col transition-all duration-200 min-w-0 relative group',
        // On retire le z-index élevé ici pour éviter les conflits de stacking context
        isThisWidgetDragging ? 'opacity-50 scale-95 z-50' : 'z-0'
      )}
    >
      {/* CONTROLS D'ÉDITION 
        Positionnés en absolute mais à l'INTÉRIEUR (top-2) pour éviter d'être coupés par l'overflow des grilles.
        Z-Index 50 pour passer au dessus du contenu du widget (images, etc).
      */}
      {isEditMode && (
        <WidgetEditControls 
          type={widget.type}
          onEdit={onEdit}
          onDelete={onDelete}
          onPointerDown={handleDragHandlePointerDown}
        />
      )}

      {/* CONTENEUR DU WIDGET */}
      <div 
        className={cn(
          "flex-1 overflow-hidden widget-no-drag h-full w-full relative z-0",
          isSeamless 
            ? "rounded-xl" // Pas de bordure/bg pour les widgets seamless
            : "rounded-xl bg-card border shadow-sm"
        )}
      >
        <ErrorBoundary isWidget>
          <div className="h-full w-full">
            {renderContent()}
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
});

// --- Sous-composant Controls ---

interface WidgetEditControlsProps {
  type: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
}

function WidgetEditControls({ type, onEdit, onDelete, onPointerDown }: WidgetEditControlsProps) {
  // IMPORTANT: Do NOT stop propagation here for mouse down.
  // Gridstack needs to receive the mousedown event to initiate dragging.
  // If we stop propagation, the drag handle becomes a dead zone.
  
  return (
    <div 
      className="absolute top-2 inset-x-0 z-[60] flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      // Important : pointer-events-none sur le conteneur large pour ne pas bloquer les clics sur le widget en dessous
      style={{ pointerEvents: 'none' }}
    >
      <div 
        className="flex items-center gap-1 p-1 rounded-full bg-foreground/90 text-background backdrop-blur-md border border-white/20 shadow-xl transform translate-y-[-2px] hover:translate-y-0 transition-transform"
        // Réactiver les pointer-events sur la bulle elle-même
        style={{ pointerEvents: 'auto' }}
      >
        
        {/* HANDLE DE DRAG */}
        <div
          className="widget-drag-handle widget-header cursor-grab active:cursor-grabbing flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-white/20 transition-colors"
          // We don't need manual pointer down handler anymore as Gridstack handles it via class selector
          title="Maintenir pour déplacer"
          // Empêcher la propagation pour éviter les conflits
          onPointerDown={(e) => {
            // Marquer comme zone de drag prioritaire
            e.currentTarget.setAttribute('data-drag-priority', 'true');
          }}
        >
          <GripVertical className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider max-w-[80px] truncate select-none">
            {type.replace("-", " ")}
          </span>
        </div>

        <div className="w-px h-3 bg-white/20 mx-0.5" />

        {/* ACTIONS */}
        <div className="flex items-center gap-1 pr-1 ui-disable-drag" style={{ pointerEvents: 'auto' }}>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-blue-500 hover:text-white text-inherit"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title="Configurer"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-red-500 hover:text-white text-inherit"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}