'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Widget } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { BookOpen, PlusCircle, Loader2, Library, ChevronRight, Play } from 'lucide-react';
import { getLibraryItems, updateLibraryItem } from '@/lib/actions/library';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlerts } from '@/components/chat/alerts-context';

interface LibraryWidgetProps {
  widget: Widget;
}

export function LibraryWidget({ widget }: LibraryWidgetProps) {
  const router = useRouter();
  const { addAlert } = useAlerts();
  const [readingItems, setReadingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string, src?: string) => {
    console.warn('[library-widget] image failed to load for', id, src);
    setFailedImages((s) => ({ ...s, [id]: true }));
  };

  // Détection "Mode Compact" (si le widget est petit : width < 3 ou height < 3)
  // Ajuste ces valeurs selon tes préférences de taille de grille
  const isCompact = widget.w < 3 || widget.h < 3;

  const fetchLibrary = async () => {
    try {
      const items = await getLibraryItems();
      // Filtre : En cours, trié par date de mise à jour desc
      const reading = items
        .filter((i: any) => i.status === 'reading')
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, isCompact ? 1 : 6); // 1 seul item si compact, sinon 6
      
      setReadingItems(reading);
    } catch (e) {
      console.error("Erreur chargement bibliothèque:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [isCompact]); // Re-fetch si la taille change (pour le slice)

  const handleQuickIncrement = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const newProgress = (item.currentProgress || 0) + 1;
    
    // Optimistic Update
    setReadingItems(prev => prev.map(i => i.id === item.id ? { ...i, currentProgress: newProgress } : i));
    
    try {
      await updateLibraryItem(item.id, { 
        currentProgress: newProgress,
        updatedAt: new Date()
      });
      addAlert({ type: 'success', title: '+1 Chapitre', message: `${item.title} : ${newProgress}`, ttl: 2000 });
    } catch (error) {
      setReadingItems(prev => prev.map(i => i.id === item.id ? { ...i, currentProgress: item.currentProgress } : i));
      addAlert({ type: 'error', title: 'Erreur', message: 'Mise à jour échouée', ttl: 3000 });
    }
  };

  const handleOpenLink = (item: any) => {
    if (item.linkUrl) {
      window.open(item.linkUrl, '_blank');
      updateLibraryItem(item.id, { lastReadAt: new Date() });
    } else {
      router.push('/dashboard/library');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background relative overflow-hidden group">
      
      {/* Header Widget */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 text-primary font-medium">
          <Library className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">
            {isCompact ? 'En cours' : 'Lectures'}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 gap-1 hover:bg-primary/10 text-xs font-normal" 
          onClick={() => router.push('/dashboard/library')}
        >
          Voir tout <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : readingItems.length > 0 ? (
          
          isCompact ? (
            // --- VUE COMPACTE (Focus sur le dernier lu) ---
            <div className="h-full w-full relative">
               {/* Background Cover Flou */}
               {readingItems[0].coverUrl && (
                  !failedImages[readingItems[0].id] && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm scale-110"
                      style={{ backgroundImage: `url(${readingItems[0].coverUrl})` }}
                    />
                  )
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

               <div className="relative z-10 h-full flex flex-col p-4 justify-end gap-2">
                  <div className="flex items-end gap-3">
                     {/* Mini Cover */}
                    <div 
                      className="w-16 aspect-[2/3] rounded-md overflow-hidden shadow-lg border border-white/10 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => handleOpenLink(readingItems[0])}
                    >
                      {readingItems[0].coverUrl && !failedImages[readingItems[0].id] ? (
                        <img
                          src={readingItems[0].coverUrl}
                          alt={readingItems[0].title || ''}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={() => handleImageError(readingItems[0].id, readingItems[0].coverUrl)}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center"><BookOpen className="w-4 h-4 opacity-50"/></div>
                      )}
                    </div>
                     
                     <div className="flex-1 min-w-0 pb-1">
                        <h4 className="font-bold text-sm leading-tight line-clamp-2 mb-1" title={readingItems[0].title}>
                           {readingItems[0].title}
                        </h4>
                        <div className="flex items-center justify-between">
                           <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              {readingItems[0].type === 'anime' ? 'Ep.' : 'Ch.'} {readingItems[0].currentProgress}
                           </span>
                           <Button 
                              size="icon" 
                              variant="secondary" 
                              className="h-6 w-6 rounded-full shadow-sm"
                              onClick={(e) => handleQuickIncrement(e, readingItems[0])}
                           >
                              <PlusCircle className="w-3 h-3" />
                           </Button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          ) : (
            // --- VUE NORMALE (Grille) ---
            <ScrollArea className="h-full">
              <div className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-3">
                {readingItems.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleOpenLink(item)}
                    className="group/item relative flex flex-col bg-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/50 transition-all cursor-pointer hover:shadow-md h-full"
                  >
                    {/* Image Cover */}
                    <div className="relative aspect-[2/3] w-full bg-muted overflow-hidden">
                      {item.coverUrl && !failedImages[item.id] ? (
                        <img 
                          src={item.coverUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110" 
                          loading="lazy"
                          referrerPolicy="no-referrer" // Fix pour certaines images AniList/Externes
                          onError={() => handleImageError(item.id, item.coverUrl)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                          <BookOpen className="w-6 h-6 text-white/20" />
                        </div>
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover/item:opacity-80 transition-opacity" />
                      
                      {/* Badge Progression */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/10">
                          {item.type === 'anime' ? 'Ep.' : 'Ch.'} {item.currentProgress}
                        </span>
                      </div>

                      {/* Bouton +1 */}
                      <button
                        onClick={(e) => handleQuickIncrement(e, item)}
                        className="absolute bottom-2 right-2 p-1.5 rounded-full bg-primary text-primary-foreground opacity-0 group-hover/item:opacity-100 hover:scale-110 transition-all shadow-lg translate-y-2 group-hover/item:translate-y-0"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Titre */}
                    <div className="p-2 bg-card border-t border-border/10 flex-1 flex items-center">
                      <h4 className="text-[10px] font-medium leading-tight line-clamp-2 w-full group-hover/item:text-primary transition-colors">
                        {item.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )

        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
               <p className="text-sm font-medium">Aucune lecture</p>
               <p className="text-xs text-muted-foreground">Commencez une oeuvre pour la voir ici.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/library')}>
              Explorer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}