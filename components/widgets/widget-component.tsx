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

interface WidgetComponentProps {
  widget: Widget;
  isEditMode: boolean;
}

export const WidgetComponent = memo(function WidgetComponent({ widget, isEditMode }: WidgetComponentProps) {
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
        <div className="px-3 py-2 border-b bg-muted/50 text-xs text-muted-foreground widget-drag-handle">
          {widget.type}
        </div>
      )}
      <div className="flex-1 overflow-hidden widget-no-drag">
        {renderWidget()}
      </div>
    </div>
  );
});
