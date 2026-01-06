'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Widget } from '@/lib/db/schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Clock, CheckCircle2 } from 'lucide-react';
import { getLibraryItems } from '@/lib/actions/library';

interface LibraryWidgetProps {
  widget: Widget;
}

export function LibraryWidget({ widget }: LibraryWidgetProps) {
  const router = useRouter();
  const [stats, setStats] = useState({ reading: 0, completed: 0, total: 0 });
  const [lastItem, setLastItem] = useState<any>(null);

  useEffect(() => {
    // Récupérer un aperçu rapide
    const fetchStats = async () => {
      try {
        const items = await getLibraryItems();
        setStats({
          reading: items.filter((i: any) => i.status === 'reading').length,
          completed: items.filter((i: any) => i.status === 'completed').length,
          total: items.length
        });
        // Le dernier item modifié (en cours de lecture)
        const current = items.find((i: any) => i.status === 'reading');
        setLastItem(current || items[0]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="h-full flex flex-col p-4 bg-gradient-to-br from-card to-background relative overflow-hidden group">
      
      {/* Fond décoratif */}
      <BookOpen className="absolute -bottom-4 -right-4 w-24 h-24 text-primary/5 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 z-10">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold leading-none">Ma Bibliothèque</h3>
          <p className="text-[10px] text-muted-foreground mt-1">
            {stats.reading} en cours • {stats.total} total
          </p>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="flex-1 flex flex-col justify-center z-10 gap-3">
        {lastItem ? (
          <div className="p-3 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm flex items-center gap-3">
            {lastItem.coverUrl ? (
              <img src={lastItem.coverUrl} alt="" className="w-10 h-14 object-cover rounded shadow-sm" />
            ) : (
              <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                <BookOpen className="w-4 h-4 opacity-30" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-primary uppercase font-bold tracking-wider mb-0.5">Reprendre</div>
              <div className="font-semibold text-sm truncate">{lastItem.title}</div>
              <div className="text-[10px] text-muted-foreground">Chap. {lastItem.currentProgress}</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-2">
            Aucune lecture en cours
          </div>
        )}
      </div>

      {/* Bouton d'action */}
      <Button 
        className="w-full mt-auto z-10 shadow-lg" 
        onClick={() => router.push('/dashboard/library')}
      >
        Ouvrir la Bibliothèque
      </Button>
    </div>
  );
}