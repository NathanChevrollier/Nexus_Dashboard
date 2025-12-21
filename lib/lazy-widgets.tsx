/**
 * Configuration du lazy loading pour les widgets
 * Permet de charger les widgets à la demande pour améliorer les performances
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton de chargement pour les widgets
function WidgetLoadingSkeleton({ size = '2x2' }: { size?: string }) {
  const height = size.includes('3') ? 'h-[300px]' : 'h-[200px]';
  
  return (
    <div className={`${height} rounded-lg bg-card border border-border p-4 animate-pulse`}>
      <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="h-4 bg-muted rounded w-4/6"></div>
      </div>
    </div>
  );
}

// Lazy load tous les widgets
export const LazyLinkWidget = lazy(() => import('@/components/widgets/link-widget').then(mod => ({ default: mod.LinkWidget })));
export const LazyPingWidget = lazy(() => import('@/components/widgets/ping-widget').then(mod => ({ default: mod.PingWidget })));
export const LazyIframeWidget = lazy(() => import('@/components/widgets/iframe-widget').then(mod => ({ default: mod.IframeWidget })));
export const LazyDateTimeWidget = lazy(() => import('@/components/widgets/datetime-widget').then(mod => ({ default: mod.DateTimeWidget })));
export const LazyWeatherWidget = lazy(() => import('@/components/widgets/weather-widget').then(mod => ({ default: mod.WeatherWidget })));
export const LazyNotesWidget = lazy(() => import('@/components/widgets/notes-widget').then(mod => ({ default: mod.NotesWidget })));
export const LazyChartWidget = lazy(() => import('@/components/widgets/chart-widget').then(mod => ({ default: mod.ChartWidget })));
export const LazyAnimeCalendarWidget = lazy(() => import('@/components/widgets/anime-calendar-widget').then(mod => ({ default: mod.AnimeCalendarWidget })));
export const LazyTodoListWidget = lazy(() => import('@/components/widgets/todo-list-widget').then(mod => ({ default: mod.TodoListWidget })));
export const LazyWatchlistWidget = lazy(() => import('@/components/widgets/watchlist-widget').then(mod => ({ default: mod.WatchlistWidget })));
export const LazyTimerWidget = lazy(() => import('@/components/widgets/timer-widget').then(mod => ({ default: mod.TimerWidget })));
export const LazyBookmarksWidget = lazy(() => import('@/components/widgets/bookmarks-widget').then(mod => ({ default: mod.BookmarksWidget })));
export const LazyQuoteWidget = lazy(() => import('@/components/widgets/quote-widget').then(mod => ({ default: mod.QuoteWidget })));
export const LazyCountdownWidget = lazy(() => import('@/components/widgets/countdown-widget').then(mod => ({ default: mod.CountdownWidget })));
export const LazyUniversalCalendarWidget = lazy(() => import('@/components/widgets/universal-calendar-widget').then(mod => ({ default: mod.UniversalCalendarWidget })));
export const LazyMoviesTVCalendarWidget = lazy(() => import('@/components/widgets/movies-tv-calendar-widget').then(mod => ({ default: mod.MoviesAndTVCalendarWidget })));

/**
 * Wrapper avec Suspense pour un widget lazy-loaded
 */
export function LazyWidget({ 
  component: Component, 
  size,
  ...props 
}: { 
  component: ComponentType<any>;
  size?: string;
  [key: string]: any;
}) {
  return (
    <Suspense fallback={<WidgetLoadingSkeleton size={size} />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Préchargement intelligent des widgets populaires
 * Charge les widgets fréquemment utilisés après le premier render
 */
export async function preloadPopularWidgets() {
  // Attendre que la page soit idle
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(async () => {
      await Promise.all([
        import('@/components/widgets/datetime-widget'),
        import('@/components/widgets/weather-widget'),
        import('@/components/widgets/notes-widget'),
        import('@/components/widgets/link-widget'),
      ]);
    });
  } else {
    // Fallback pour les navigateurs ne supportant pas requestIdleCallback
    setTimeout(async () => {
      await Promise.all([
        import('@/components/widgets/datetime-widget'),
        import('@/components/widgets/weather-widget'),
        import('@/components/widgets/notes-widget'),
        import('@/components/widgets/link-widget'),
      ]);
    }, 2000);
  }
}

/**
 * Map des types de widgets vers leurs composants lazy
 */
export const lazyWidgetMap = {
  link: LazyLinkWidget,
  ping: LazyPingWidget,
  iframe: LazyIframeWidget,
  datetime: LazyDateTimeWidget,
  weather: LazyWeatherWidget,
  notes: LazyNotesWidget,
  chart: LazyChartWidget,
  'anime-calendar': LazyAnimeCalendarWidget,
  'todo-list': LazyTodoListWidget,
  watchlist: LazyWatchlistWidget,
  timer: LazyTimerWidget,
  bookmarks: LazyBookmarksWidget,
  quote: LazyQuoteWidget,
  countdown: LazyCountdownWidget,
  'universal-calendar': LazyUniversalCalendarWidget,
  'movies-tv-calendar': LazyMoviesTVCalendarWidget,
} as const;
