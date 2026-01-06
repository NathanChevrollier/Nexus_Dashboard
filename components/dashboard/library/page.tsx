'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Play, MoreVertical, 
  CheckCircle2, PauseCircle, Clock, BookOpen, ExternalLink, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddLibraryItemDialog } from '@/components/dashboard/library/add-item-dialog';
import { useConfirm, useAlert } from '@/components/ui/confirm-provider';
import { getLibraryItems, updateLibraryItem, deleteLibraryItem } from '@/lib/actions/library';
import { cn } from '@/lib/utils';

export default function LibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const confirm = useConfirm();
  const alert = useAlert();
  const router = useRouter();

  // Chargement
  const loadItems = async () => {
    const data = await getLibraryItems();
    setItems(data);
  };

  useEffect(() => { loadItems(); }, []);

  // Filtrage
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ? true : item.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Action rapide : +1 Chapitre
  const handleQuickProgress = async (item: any) => {
    // Optimistic Update (Mise à jour visuelle immédiate)
    const newProgress = (item.currentProgress || 0) + 1;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentProgress: newProgress } : i));
    
    // Appel Serveur
    await updateLibraryItem(item.id, { currentProgress: newProgress });
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-[1800px] mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Nexus Library
          </h1>
          <p className="text-muted-foreground">Votre collection de scans et lectures.</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>Retour</Button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher..." 
              className="pl-9 bg-card/50" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter
          </Button>
        </div>
      </div>

      {/* FILTRES */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'all', label: 'Tout', icon: Filter },
          { id: 'reading', label: 'En cours', icon: Clock },
          { id: 'paused', label: 'En pause', icon: PauseCircle },
          { id: 'completed', label: 'Terminé', icon: CheckCircle2 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
              filter === tab.id 
                ? "bg-primary text-primary-foreground border-primary shadow-md" 
                : "bg-card text-muted-foreground border-border hover:bg-accent"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* GRILLE */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
          
          {/* Carte Ajout Rapide */}
          <button 
            onClick={() => setIsAddOpen(true)}
            className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted rounded-xl hover:border-primary/50 hover:bg-accent/5 transition-all min-h-[320px]"
          >
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
              <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="font-medium text-muted-foreground group-hover:text-primary">Ajouter une œuvre</span>
          </button>

          {/* Cartes Items */}
          {filteredItems.map(item => (
            <div key={item.id} className="group relative bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col h-[360px]">
              
              {/* IMAGE */}
              <div className="relative h-56 w-full bg-muted overflow-hidden">
                {item.coverUrl ? (
                  <img 
                    src={item.coverUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <BookOpen className="h-12 w-12 text-slate-700" />
                  </div>
                )}
                
                {/* Overlay Hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 backdrop-blur-[2px]">
                  {item.linkUrl && (
                    <a 
                      href={item.linkUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 hover:bg-primary/90 transition-all shadow-lg"
                      title="Lire le scan"
                    >
                      <Play className="h-6 w-6 fill-current ml-1" />
                    </a>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleQuickProgress(item)}>
                      +1 Chapitre
                    </Button>
                  </div>
                </div>

                {/* Badge Type */}
                <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border-0 text-white uppercase text-[10px] tracking-wider">
                  {item.type}
                </Badge>
              </div>

              {/* CONTENU */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base line-clamp-1 mb-1" title={item.title}>{item.title}</h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Chap. {item.currentProgress}</span>
                    {item.totalProgress && <span className="opacity-50">/ {item.totalProgress}</span>}
                  </div>
                  {/* Barre progression */}
                  <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${Math.min(100, item.totalProgress ? (item.currentProgress / item.totalProgress) * 100 : 5)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <Badge variant="outline" className="text-[10px] h-5 border-border/50 text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingItem(item);
                          setIsAddOpen(true);
                        }}>
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={item.linkUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir le site
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={async () => {
                          if (!(await confirm('Supprimer cet élément ?'))) return;
                          try {
                            await deleteLibraryItem(item.id);
                            await loadItems();
                            await alert('Élément supprimé');
                          } catch (e) {
                            console.error(e);
                            await alert('Erreur lors de la suppression');
                          }
                        }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <AddLibraryItemDialog 
        open={isAddOpen} 
        onOpenChange={(v: boolean) => { setIsAddOpen(v); if (!v) setEditingItem(null); }} 
        onSuccess={async () => { await loadItems(); setEditingItem(null); }} 
        initialData={editingItem}
      />
    </div>
  );
}