'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Widget } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, ExternalLink, Loader2, Library } from 'lucide-react';
import { getLibraryItems } from '@/lib/actions/library';
import { cn } from '@/lib/utils';

interface LibraryWidgetProps {
  widget: Widget;
}

export function LibraryWidget({ widget }: LibraryWidgetProps) {
  const router = useRouter();
  const [stats, setStats] = useState({ reading: 0, completed: 0, total: 0 });
  const [lastItem, setLastItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const items = await getLibraryItems();
        if (isMounted) {
          setStats({
            reading: items.filter((i: any) => i.status === 'reading').length,
            completed: items.filter((i: any) => i.status === 'completed').length,
            total: items.length
          });
          
          const current = items.find((i: any) => i.status === 'reading') || items[0];
          setLastItem(current);
        }
      } catch (e) {
        console.error("Erreur chargement bibliothèque:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lastItem && (lastItem.linkUrl || lastItem.url)) {
      const url = lastItem.linkUrl || lastItem.url;
      window.open(url, '_blank');
    } else {
      router.push('/dashboard/library');
    }
  };

  const currentProgress = Number(lastItem?.currentProgress || 0);
  const totalProgress = Number(lastItem?.totalProgress || lastItem?.totalChapters || 0);
  const percent = totalProgress > 0 
    ? Math.min(100, Math.round((currentProgress / totalProgress) * 100)) 
    : 0;

  return (
    <div className="h-full w-full relative overflow-hidden bg-background flex flex-col group">
      
      {/* --- ARRIÈRE-PLAN --- */}
      {lastItem?.coverUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-20 blur-2xl scale-110 transition-all duration-700"
          style={{ backgroundImage: `url(${lastItem.coverUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />

      {/* --- CONTENU --- */}
      <div className="relative z-10 flex flex-col h-full p-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-primary/80">
            <Library className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Bibliothèque</span>
          </div>
          {!loading && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {stats.reading} en cours
            </span>
          )}
        </div>

        {/* Corps */}
        <div className="flex-1 flex flex-col justify-center min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Chargement...</span>
            </div>
          ) : lastItem ? (
            <div className="flex gap-4 items-center">
              {/* Couverture */}
              <div className="relative shrink-0 w-20 aspect-[2/3] rounded-md overflow-hidden shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-300">
                {lastItem.coverUrl ? (
                  <img 
                    src={lastItem.coverUrl} 
                    alt={lastItem.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                )}
                <div 
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[1px]"
                  onClick={handleResume}
                >
                  <Play className="w-8 h-8 text-white drop-shadow-md fill-white" />
                </div>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                <h3 className="font-bold text-base leading-tight line-clamp-2" title={lastItem.title}>
                  {lastItem.title}
                </h3>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Chap. {currentProgress}</span>
                    {totalProgress > 0 && <span>{percent}%</span>}
                  </div>
                  <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500 ease-out rounded-full" 
                      style={{ width: `${totalProgress > 0 ? percent : 5}%` }} 
                    />
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground mt-1 opacity-80">
                  {lastItem.updatedAt ? `Lu le ${new Date(lastItem.updatedAt).toLocaleDateString()}` : 'Récemment ajouté'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune lecture en cours</p>
            </div>
          )}
        </div>

        {/* Footer Actions (Boutons agrandis) */}
        <div className="mt-auto pt-4">
          {lastItem ? (
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="w-full gap-2 shadow-sm" 
                onClick={handleResume}
              >
                <Play className="w-4 h-4 fill-current" />
                <span className="truncate">Reprendre</span>
              </Button>
              <Button 
                variant="secondary" 
                className="w-full gap-2 shadow-sm bg-background/50 hover:bg-background/80 border border-border/50" 
                onClick={() => router.push('/dashboard/library')}
              >
                <Library className="w-4 h-4" />
                <span className="truncate">Bibliothèque</span>
              </Button>
            </div>
          ) : (
            <Button 
              className="w-full gap-2 shadow-md h-10" 
              onClick={() => router.push('/dashboard/library')}
            >
              <Library className="w-5 h-5" />
              Ouvrir ma Bibliothèque
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}