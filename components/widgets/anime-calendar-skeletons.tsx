// Composants Skeleton pour les états de chargement
import { Skeleton } from '@/components/ui/skeleton';

export function AnimeScheduleCardSkeleton() {
  return (
    <div className="relative flex flex-col gap-3 p-3 rounded-lg border bg-card/50">
      <div className="flex gap-3">
        <Skeleton className="shrink-0 w-[60px] h-[90px] rounded-md" />
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded" />
    </div>
  );
}

export function AnimeWidgetLoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <AnimeScheduleCardSkeleton />
      <AnimeScheduleCardSkeleton />
      <AnimeScheduleCardSkeleton />
    </div>
  );
}
