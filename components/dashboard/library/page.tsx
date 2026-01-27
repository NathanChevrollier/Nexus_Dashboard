'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, Play, MoreVertical, 
  CheckCircle2, PauseCircle, Clock, BookOpen, 
  Trash2, Loader2, Calendar as CalendarIcon, 
  LayoutGrid, ChevronLeft, ChevronRight, Eye, ArrowLeft,
  X, ListTodo, Tv, Globe, Languages
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { AddLibraryItemDialog } from '@/components/dashboard/library/add-item-dialog';
import { useConfirm } from '@/components/ui/confirm-provider';
import { getLibraryItems, updateLibraryItem, deleteLibraryItem } from '@/lib/actions/library';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, formatDistanceToNow, differenceInCalendarWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getMediaById } from '@/lib/api/anilist';
import { syncAllAnimeItems } from '@/lib/api/anime-sync';

export default function LibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAnime, setShowAnime] = useState(true);
  const [showScans, setShowScans] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [syncing, setSyncing] = useState(false);

  const confirm = useConfirm();
  const router = useRouter();

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getLibraryItems();
      const processedData = data.map((item: any) => ({
        ...item,
        updatedAt: new Date(item.updatedAt),
        lastReadAt: item.lastReadAt ? new Date(item.lastReadAt) : null,
      }));
      setItems(processedData);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAnime = async () => {
    setSyncing(true);
    try {
      const results = await syncAllAnimeItems(items);
      const updated = results.filter(r => r.updated).length;
      if (updated > 0) {
        alert(`${updated} anime(s) synchronisé(s) avec succès !`);
        await loadItems();
      } else {
        alert('Tous les animés sont à jour !');
      }
    } catch (error) {
      alert('Erreur lors de la synchronisation');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  // --- Hydration-safe : charger les préférences depuis localStorage au montage ---
  useEffect(() => {
    try {
      const rawView = localStorage.getItem('library-view');
      if (rawView === 'grid' || rawView === 'calendar') setView(rawView as 'grid' | 'calendar');

      const rawFilter = localStorage.getItem('library-filter');
      if (rawFilter) setFilter(rawFilter);

      const rawShowAnime = localStorage.getItem('library-show-anime');
      if (rawShowAnime !== null) setShowAnime(rawShowAnime === 'true');

      const rawShowScans = localStorage.getItem('library-show-scans');
      if (rawShowScans !== null) setShowScans(rawShowScans === 'true');
    } catch (e) {
      // ignore storage errors
      console.error('Failed to load library prefs from localStorage', e);
    }
  }, []);

  // --- Sauvegarder les préférences à chaque changement ---
  useEffect(() => {
    try {
      localStorage.setItem('library-view', view);
      localStorage.setItem('library-filter', filter);
      localStorage.setItem('library-show-anime', String(showAnime));
      localStorage.setItem('library-show-scans', String(showScans));
    } catch (e) {
      // ignore storage errors
      console.error('Failed to save library prefs to localStorage', e);
    }
  }, [view, filter, showAnime, showScans]);
  // Optimistic update helper: updates local state immediately and saves in background
  const handleOptimisticUpdate = async (itemId: string, newData: any) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...newData } : i));
    try {
      await updateLibraryItem(itemId, newData);
    } catch (e) {
      console.error('Optimistic save failed', e);
    }
  };

  const handleItemOpened = async (item: any) => {
    const now = new Date();
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, lastReadAt: now } : i));
    await updateLibraryItem(item.id, { lastReadAt: now, updatedAt: now });
  };

  const handleStatusChange = async (item: any, newStatus: string) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
    await updateLibraryItem(item.id, { status: newStatus });
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      
      let matchesFilter = true;
      if (filter === 'all') matchesFilter = true;
      else if (filter === 'reading') matchesFilter = item.status === 'reading';
      else if (filter === 'plan_to_read') matchesFilter = item.status === 'plan_to_read';
      else if (filter === 'completed') matchesFilter = item.status === 'completed';
      else if (filter === 'paused') matchesFilter = item.status === 'paused' || item.status === 'dropped';
      
      // Apply show toggles
      if (!showAnime && item.type === 'anime') return false;
      if (!showScans) {
        const isScanCandidate = !!item.linkUrl && item.type !== 'anime';
        if (isScanCandidate) return false;
      }

      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter, showAnime, showScans]);

  useEffect(() => {
    if (!search) { setSuggestions([]); return; }
    const q = search.toLowerCase();
    const s = items.filter(i => i.title && i.title.toLowerCase().includes(q)).slice(0, 6);
    setSuggestions(s);
  }, [search, items]);

  return (
    <div className="min-h-screen flex flex-col bg-background/50 relative">

      <div className="flex flex-col pt-2 px-6 pb-6 min-h-0 w-full space-y-6 flex-1">
        
        {/* HEADER */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" /> 
                <span>Nexus Library</span>
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 ml-1">
                <span>{items.length} œuvres suivies</span>
              </div>
            </div>

            {/* BOUTON RETOUR */}
            <div className="flex justify-center pt-6 pb-2 shrink-0 z-20">
              <div 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-6 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-sm hover:shadow-md hover:bg-accent/50 transition-all cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">Retour au Dashboard</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-muted/50 p-1 rounded-lg flex items-center gap-1 border border-border">
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => setView('grid')} title="Grille"><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={view === 'calendar' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => setView('calendar')} title="Calendrier"><CalendarIcon className="h-4 w-4" /></Button>
              </div>

              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-9 h-11 bg-card/50 shadow-sm" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                />

                {searchOpen && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 z-40 bg-popover border rounded-md shadow-md max-h-56 overflow-auto">
                    {suggestions.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={(e) => { e.preventDefault(); setSearch(s.title); setSearchOpen(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-3"
                      >
                        <div className="h-8 w-6 bg-muted rounded overflow-hidden shrink-0 border border-border/50">
                          {s.coverUrl ? <img src={s.coverUrl} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 text-muted-foreground m-1" />}
                        </div>
                        <div className="truncate text-sm">{s.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button onClick={() => setIsAddOpen(true)} className="h-11 px-6 shadow-md gap-2">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>

          {view !== 'calendar' && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: 'all', label: 'Tout', icon: Filter },
                { id: 'reading', label: 'En cours', icon: Clock },
                { id: 'plan_to_read', label: 'À lire', icon: ListTodo },
                { id: 'paused', label: 'En pause', icon: PauseCircle },
                { id: 'completed', label: 'Terminé', icon: CheckCircle2 },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                    filter === tab.id 
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" 
                      : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          
          {/* Bouton sync anime (visible seulement en vue calendrier) */}
          {view === 'calendar' && (
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSyncAnime} 
                disabled={syncing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                Synchroniser les animés
              </Button>
            </div>
          )}
          
          {/* Toggle affichage Animés / Scans */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Switch id="show-anime" checked={showAnime} onCheckedChange={(v: any) => setShowAnime(Boolean(v))} />
              <Label htmlFor="show-anime" className="text-sm">Afficher Animés</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="show-scans" checked={showScans} onCheckedChange={(v: any) => setShowScans(Boolean(v))} />
              <Label htmlFor="show-scans" className="text-sm">Afficher Scans</Label>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="h-full w-full pr-4 -mr-4">
            {loading ? (
              <div className="h-[50vh] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-muted-foreground" /></div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
                {filteredItems.map(item => (
                  <LibraryCard 
                    key={item.id} item={item} 
                    onUpdate={loadItems} 
                    onStatusChange={(status: string) => handleStatusChange(item, status)}
                    onLinkOpened={() => handleItemOpened(item)}
                    onEdit={() => { setEditingItem(item); setIsAddOpen(true); }}
                    onDelete={async () => {
                      if(await confirm('Supprimer définitivement ?')) { await deleteLibraryItem(item.id); loadItems(); }
                    }}
                    onOptimisticUpdate={handleOptimisticUpdate}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full h-full pb-6">
                <WeeklyCalendarView items={filteredItems} currentWeek={currentWeek} onWeekChange={setCurrentWeek} onLinkOpened={handleItemOpened} onItemsChange={setItems} />
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      <AddLibraryItemDialog 
        open={isAddOpen} 
        onOpenChange={(v: boolean) => { setIsAddOpen(v); if(!v) setEditingItem(null); }} 
        onSuccess={async () => { await loadItems(); setEditingItem(null); }} 
        initialData={editingItem} 
      />
    </div>
  );
}

// --- CARTE ITEM (Visuel amélioré + Dropdown Statut) ---
function LibraryCard({ item, onUpdate, onEdit, onDelete, onLinkOpened, onStatusChange, onOptimisticUpdate }: any) {
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const isInactive = item.status === 'paused' || item.status === 'dropped';
  const displayTotal = item.totalProgress ?? (item.type === 'anime' ? 12 : undefined);
  
  const [localProgress, setLocalProgress] = useState<number>(Number(item.currentProgress || 0));

  useEffect(() => {
    setLocalProgress(Number(item.currentProgress || 0));
  }, [item.currentProgress]);
  const handleOpenLink = () => {
    if (item.linkUrl) { window.open(item.linkUrl, '_blank'); onLinkOpened(item); }
  };

  const handleAutoSaveProgress = (newVal: number) => {
    // Update UI immediately
    setLocalProgress(newVal);
    // Fire-and-forget save via optimistic helper if provided
    if (onOptimisticUpdate) {
      onOptimisticUpdate(item.id, { currentProgress: newVal });
    } else {
      // fallback: attempt direct save but do not reload entire list
      updateLibraryItem(item.id, { currentProgress: newVal }).catch(e => console.error(e));
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'reading': return <Badge className="bg-green-500/80 hover:bg-green-500 text-[10px]">En cours</Badge>;
      case 'plan_to_read': return <Badge variant="secondary" className="text-[10px]">À lire</Badge>;
      case 'completed': return <Badge className="bg-blue-500/80 hover:bg-blue-500 text-[10px]">Terminé</Badge>;
      case 'paused': return <Badge className="bg-yellow-400/90 hover:bg-yellow-400 text-black text-[10px]">Pause</Badge>;
      case 'dropped': return <Badge variant="destructive" className="text-[10px]">Abandonné</Badge>;
      default: return null;
    }
  };

  return (
    <div className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 h-full">
      
      {/* SECTION IMAGE - Aspect Ratio 2:3 pour ressembler à une couverture */}
      <div className="relative w-full aspect-[2/3] bg-muted overflow-hidden shrink-0">
        {item.coverUrl ? (
          <img 
            src={item.coverUrl} 
            alt={item.title} 
            className={cn("w-full h-full object-cover transition-transform duration-700 group-hover:scale-105", isInactive ? "opacity-60" : "opacity-100")}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-600">
            <BookOpen className="h-10 w-10 mb-2 opacity-50" />
            <span className="text-xs font-medium opacity-50">Sans couverture</span>
          </div>
        )}
        
        {/* OVERLAY ACTIONS */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[1px]">
          {item.linkUrl ? (
            // Anime: single Play button. Scans: show book + flag icons for primary/alternate
                  item.type === 'anime' ? (
              <Button size="icon" className="h-12 w-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-110 transition-all" onClick={(e) => { e.stopPropagation(); handleOpenLink(); }} title="Ouvrir">
                <Play className="h-5 w-5 ml-1 fill-current" />
              </Button>
            ) : (
              item.additionalUrl ? (
                <div className="flex gap-3">
                  <Button size="icon" className="h-12 w-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-110 transition-all" onClick={(e) => { e.stopPropagation(); window.open(item.linkUrl, '_blank'); onLinkOpened(item); }} title="Source française">
                    <div className="relative flex items-center justify-center w-full h-full">
                      <BookOpen className="h-4 w-4" />
                      <span aria-hidden className="absolute -bottom-2 -right-2 text-[11px]">🇫🇷</span>
                    </div>
                  </Button>
                  <Button size="icon" className="h-12 w-12 rounded-full shadow-xl bg-secondary/80 hover:bg-secondary/90 hover:scale-110 transition-all" onClick={(e) => { e.stopPropagation(); window.open(item.additionalUrl, '_blank'); onLinkOpened(item); }} title="Source anglaise">
                    <div className="relative flex items-center justify-center w-full h-full">
                      <BookOpen className="h-4 w-4" />
                      <span aria-hidden className="absolute -bottom-2 -right-2 text-[11px]">en</span>
                    </div>
                  </Button>
                </div>
              ) : (
                <Button size="icon" className="h-12 w-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-110 transition-all" onClick={(e) => { e.stopPropagation(); handleOpenLink(); }} title="Ouvrir">
                  <div className="relative flex items-center justify-center w-full h-full">
                    <BookOpen className="h-4 w-4" />
                    <span aria-hidden className="absolute -bottom-2 -right-2 text-[11px]">🇫🇷</span>
                  </div>
                </Button>
              )
            )
          ) : (
            <span className="text-xs text-white/80 font-medium px-2 py-1 bg-black/50 rounded">Pas de lien</span>
          )}
        </div>

        {/* CHANTIER / PAUSED RIBBON */}
        {isInactive && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-6 -left-24 transform -rotate-12 w-[260px] h-12"
            style={{
              background: 'repeating-linear-gradient( -45deg, rgba(255,199,44,0.95) 0 12px, rgba(0,0,0,0.85) 12px 24px)',
              boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
              opacity: 0.95,
              borderRadius: 6,
            }}
          />
        )}

        {/* Status ribbons for other states (similar visual to PAUSED) */}
        {item.status === 'reading' && (
          <div aria-hidden className="pointer-events-none absolute -top-6 -left-24 transform -rotate-12 w-[260px] h-12" style={{background:'repeating-linear-gradient(-45deg, rgba(34,197,94,0.95) 0 12px, rgba(0,0,0,0.06) 12px 24px)', boxShadow:'0 6px 18px rgba(0,0,0,0.12)', borderRadius:6, opacity:0.95}} />
        )}
        {item.status === 'plan_to_read' && (
          <div aria-hidden className="pointer-events-none absolute -top-6 -left-24 transform -rotate-12 w-[260px] h-12" style={{background:'repeating-linear-gradient(-45deg, rgba(99,102,241,0.95) 0 12px, rgba(0,0,0,0.06) 12px 24px)', boxShadow:'0 6px 18px rgba(0,0,0,0.08)', borderRadius:6, opacity:0.95}} />
        )}
        {item.status === 'completed' && (
          <div aria-hidden className="pointer-events-none absolute -top-6 -left-24 transform -rotate-12 w-[260px] h-12" style={{background:'repeating-linear-gradient(-45deg, rgba(6,182,212,0.95) 0 12px, rgba(0,0,0,0.06) 12px 24px)', boxShadow:'0 6px 18px rgba(0,0,0,0.08)', borderRadius:6, opacity:0.95}} />
        )}

        {/* Badges Flottants */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1">
             {getStatusBadge()}
             {item.type === 'anime' && <Badge variant="secondary" className="bg-indigo-500/90 text-white text-[9px] backdrop-blur-md border-0"><Tv className="w-3 h-3 mr-1"/> Anime</Badge>}
          </div>
          {item.scheduleDay && (
            <Badge className="bg-background/80 text-foreground backdrop-blur-md border border-border/50 text-[9px] uppercase font-bold shadow-sm">
              {item.scheduleType === 'biweekly' ? '1/2 ' : ''} {item.scheduleDay.slice(0, 3)}
            </Badge>
          )}
        </div>
      </div>

      {/* SECTION CONTENU */}
      <div className="flex flex-col p-3 gap-2 flex-1 bg-card min-h-0">
        
        <div className="flex justify-between items-start gap-1">
          <h3 className="font-bold text-sm leading-tight line-clamp-2 text-foreground" title={item.title}>
            {item.title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mt-1 -mr-2 text-muted-foreground hover:text-foreground"><MoreVertical className="h-3 w-3" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsEditingProgress(!isEditingProgress)}>
                {isEditingProgress ? 'Masquer progression' : 'Modifier progression'}
              </DropdownMenuItem>
              
              {/* SOUS-MENU STATUT RETABLIS */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Changer le statut</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onStatusChange('reading')}>En cours</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange('plan_to_read')}>À lire</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange('completed')}>Terminé</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange('paused')}>En pause</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange('dropped')}>Abandonné</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}><Eye className="h-4 w-4 mr-2" /> Détails / Éditer</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* PROGRES */}
        <div className="mt-auto pt-2">
          {isEditingProgress ? (
            <InlineProgressEditor 
              item={{ ...item, currentProgress: localProgress }} 
              onClose={() => setIsEditingProgress(false)} 
              onAutoSave={handleAutoSaveProgress} 
            />
          ) : (
            <div className="space-y-1.5 cursor-pointer group/prog" onClick={() => setIsEditingProgress(true)} title="Cliquez pour changer rapidement">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground group-hover/prog:text-primary transition-colors">
                    {item.type === 'anime' ? 'Épisode' : 'Chap.'} {localProgress}
                </span>
                {displayTotal && <span className="opacity-60 text-[10px]">Sur {displayTotal}</span>}
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500 ease-out", item.status === 'completed' ? 'bg-green-500' : 'bg-primary')} 
                  style={{ width: `${Math.min(100, displayTotal ? (item.currentProgress / displayTotal) * 100 : (item.currentProgress > 0 ? 10 : 0))}%` }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- EDITEUR INLINE (Auto-Save lent) ---
function InlineProgressEditor({ item, onClose, onAutoSave }: { item: any, onClose: () => void, onAutoSave?: (val: number) => any }) {
  const [val, setVal] = useState(item.currentProgress || 0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const doSave = async () => {
        try {
          const res: any = onAutoSave?.(val);
          if (res && typeof res.then === 'function') {
            await res;
          }
        } catch (e) {
          console.error('Auto-save failed', e);
        }
        // Close the inline editor after save
        onClose();
      };
      if (val !== item.currentProgress) doSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [val, item.currentProgress, onAutoSave]);

  return (
    <div className="bg-muted/30 p-2 rounded-lg border border-border animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Progression</span>
        <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full hover:bg-destructive/20 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Button variant="outline" size="icon" className="h-6 w-6 shrink-0" onClick={() => setVal(Math.max(0, val - 1))}>-</Button>
        <Input 
          type="number" 
          value={val} 
          onChange={(e) => setVal(Math.max(0, parseInt(e.target.value) || 0))}
          className="h-6 text-center font-bold text-xs p-0 bg-background"
        />
        <Button variant="outline" size="icon" className="h-6 w-6 shrink-0" onClick={() => setVal(val + 1)}>+</Button>
      </div>
      <div className="text-[9px] text-center text-muted-foreground italic">
        Sauvegarde auto...
      </div>
    </div>
  );
}

// --- CALENDRIER HEBDOMADAIRE REFAIT (Taille et Interactivité) ---
function WeeklyCalendarView({ items, currentWeek, onWeekChange, onLinkOpened, onItemsChange }: any) {
  const [liveScheduleMap, setLiveScheduleMap] = useState<Record<number, any>>({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [incrementing, setIncrementing] = useState<string | null>(null);

  const handleIncrementProgress = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation(); // Empêcher l'ouverture du lien
    setIncrementing(item.id);
    try {
      const newProgress = (item.currentProgress || 0) + 1;
      // Mise à jour optimiste
      if (onItemsChange) {
        onItemsChange((prev: any[]) => prev.map((i: any) => i.id === item.id ? { ...i, currentProgress: newProgress } : i));
      }
      await updateLibraryItem(item.id, { currentProgress: newProgress });
      setIncrementing(null);
    } catch (e) {
      console.error('Failed to increment progress', e);
      setIncrementing(null);
    }
  };

  // Fetch live next-episode info for anime items that have anilistId
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingSchedule(true);
      try {
        const animeIds = Array.from(new Set(items.filter((it: any) => it.anilistId && it.type === 'anime').map((it: any) => Number(it.anilistId)))) as number[];
        if (animeIds.length === 0) {
          if (mounted) {
            setLiveScheduleMap({});
            setLoadingSchedule(false);
          }
          return;
        }

        const map: Record<number, any> = {};
        // fetch in sequence to avoid bursting proxy (could be batched later)
        for (const id of animeIds) {
          try {
            const media = await getMediaById(id);
            if (media) map[id] = media;
          } catch (e) {
            // ignore per-media errors
          }
        }

        if (mounted) {
          setLiveScheduleMap(map);
          setLoadingSchedule(false);
        }
      } catch (e) {
        if (mounted) setLoadingSchedule(false);
      }
    })();
    return () => { mounted = false; };
  }, [items, currentWeek]); // Re-fetch quand on change de semaine aussi
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getItemsForDay = (day: Date) => {
    const dayName = format(day, 'EEEE').toLowerCase();
    
    return items.filter((item: any) => {
      // Ne pas afficher les items en pause/abandonnés SAUF si l'utilisateur les a en "reading" localement
      if ((item.status === 'paused' || item.status === 'dropped') && item.status !== 'reading') {
        return false;
      }

      // Fonction helper pour vérifier l'horaire manuel
      const matchesManualSchedule = () => {
        if (!item.scheduleDay) return false;
        if (item.scheduleDay.toLowerCase() !== dayName) return false;
        
        const freq = (item.scheduleType || 'weekly');
        if (freq === 'weekly') return true;
        
        if (freq === 'biweekly') {
          const anchor = item.createdAt ? new Date(item.createdAt) : item.updatedAt ? new Date(item.updatedAt) : new Date();
          try {
            const anchorWeekStart = startOfWeek(anchor, { weekStartsOn: 1 });
            const targetWeekStart = startOfWeek(day, { weekStartsOn: 1 });
            const diffWeeks = Math.abs(differenceInCalendarWeeks(targetWeekStart, anchorWeekStart));
            return diffWeeks % 2 === 0;
          } catch (e) { return true; }
        }
        
        if (freq === 'monthly') {
          const anchor = item.createdAt ? new Date(item.createdAt) : new Date();
          return anchor.getDate() === day.getDate();
        }
        
        return true;
      };

      // Pour les animés avec AniList ID
      if (item.type === 'anime' && item.anilistId) {
        const media = liveScheduleMap?.[Number(item.anilistId)];
        
        // Si données AniList chargées
        if (media) {
          // 1. Si anime terminé sur AniList ET l'utilisateur l'a aussi marqué terminé → ne pas afficher
          if (media.status === 'FINISHED' && item.status === 'completed') {
            return false;
          }
          
          // 2. Si nextAiringEpisode existe
          if (media.nextAiringEpisode) {
            const airingDate = new Date(media.nextAiringEpisode.airingAt * 1000);
            const airingWeekStart = startOfWeek(airingDate, { weekStartsOn: 1 });
            const targetWeekStart = startOfWeek(day, { weekStartsOn: 1 });
            
            // Si on est dans la semaine de diffusion du prochain épisode, utiliser la date exacte AniList
            if (airingWeekStart.getTime() === targetWeekStart.getTime()) {
              return isSameDay(airingDate, day);
            }
            
            // Si on consulte une semaine future (après le prochain épisode), utiliser l'horaire manuel
            if (targetWeekStart > airingWeekStart) {
              return matchesManualSchedule();
            }
            
            // Si on consulte une semaine passée (avant le prochain épisode), utiliser l'horaire manuel
            if (targetWeekStart < airingWeekStart) {
              return matchesManualSchedule();
            }
          }
          
          // 3. Pas de nextAiringEpisode (horaire irrégulier ou anime terminé) → utiliser l'horaire manuel
          return matchesManualSchedule();
        }
        
        // Données pas encore chargées → utiliser l'horaire manuel temporairement
        return matchesManualSchedule();
      }

      // Pour les scans/manga ou animés sans AniList ID → horaire manuel uniquement
      return matchesManualSchedule();
    });
  };

  return (
    <div className="bg-card rounded-2xl border shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b bg-muted/20">
        <h2 className="font-bold flex gap-2 items-center text-lg">
          <CalendarIcon className="w-5 h-5 text-primary"/> 
          <span className="capitalize">{format(weekStart, 'MMMM yyyy', {locale:fr})}</span>
          {loadingSchedule && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />
          )}
        </h2>
        <div className="flex items-center bg-background rounded-lg border shadow-sm p-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => onWeekChange(subWeeks(currentWeek, 1))}><ChevronLeft className="w-4 h-4"/></Button>
          <span className="text-xs font-medium px-3 border-x h-5 flex items-center">Semaine {format(weekStart, 'w')}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => onWeekChange(addWeeks(currentWeek, 1))}><ChevronRight className="w-4 h-4"/></Button>
        </div>
      </div>
      
      {/* Grid stretched to fill height */}
      <div className="grid grid-cols-1 md:grid-cols-7 flex-1 min-h-[500px] divide-y md:divide-y-0 md:divide-x divide-border">
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          const dayItems = getItemsForDay(day);
          
          return (
            <div key={day.toISOString()} className={cn("flex flex-col h-full group transition-colors relative", isToday ? "bg-primary/5" : "hover:bg-accent/5")}>
              {/* En-tête jour */}
              <div className={cn("p-3 border-b flex flex-row md:flex-col justify-between items-center md:items-start sticky top-0 bg-inherit z-10", isToday && "text-primary font-bold")}>
                <span className="text-sm capitalize">{format(day, 'EEE', {locale:fr})}</span>
                <span className={cn("text-lg md:text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full", isToday ? "bg-primary text-primary-foreground shadow-md font-bold text-sm" : "")}>{format(day, 'd')}</span>
              </div>
              
              {/* Contenu Jour */}
              <div className="p-2 space-y-2 flex-1 flex flex-col">
                {loadingSchedule && dayItems.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-xs italic text-center px-2 min-h-[100px]">
                    <Loader2 className="w-6 h-6 mb-2 animate-spin opacity-50"/>
                    Chargement...
                  </div>
                )}
                
                {!loadingSchedule && dayItems.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-xs italic text-center px-2 min-h-[100px]">
                    <Clock className="w-8 h-8 mb-2 opacity-50"/>
                    {isToday ? "Rien aujourd'hui" : "Pas de sortie"}
                  </div>
                )}
                
                {dayItems.map((item: any) => {
                  // Déterminer si c'est un anime avec vraie date AniList ou horaire manuel
                  const media = item.type === 'anime' && item.anilistId ? liveScheduleMap?.[Number(item.anilistId)] : null;
                  const nextEp = media?.nextAiringEpisode;
                  const airingDate = nextEp ? new Date(nextEp.airingAt * 1000) : null;
                  
                  // Déterminer si on affiche les données exactes AniList ou une estimation
                  const airingWeekStart = airingDate ? startOfWeek(airingDate, { weekStartsOn: 1 }) : null;
                  const currentDayWeekStart = startOfWeek(day, { weekStartsOn: 1 });
                  const isExactAiringWeek = airingWeekStart !== null && airingWeekStart.getTime() === currentDayWeekStart.getTime() && airingDate !== null && isSameDay(airingDate, day);
                  const isManualSchedule = item.scheduleDay && !isExactAiringWeek;
                  
                  // Calculer le numéro d'épisode estimé pour les semaines futures
                  let estimatedEpisode = null;
                  if (item.type === 'anime' && nextEp && airingDate && !isExactAiringWeek) {
                    // Calculer combien de semaines se sont écoulées depuis l'épisode connu
                    const weeksDiff = differenceInCalendarWeeks(day, airingDate);
                    if (weeksDiff > 0 && item.scheduleType === 'weekly') {
                      // Pour un anime hebdomadaire, ajouter une semaine = +1 épisode
                      estimatedEpisode = nextEp.episode + weeksDiff;
                    } else if (weeksDiff > 0 && item.scheduleType === 'biweekly') {
                      // Pour un anime bimensuel, +1 épisode tous les 2 semaines
                      estimatedEpisode = nextEp.episode + Math.floor(weeksDiff / 2);
                    }
                  }
                  
                  return (
                  <div 
                    key={item.id} 
                    className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group/card",
                        item.type === 'anime' ? "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20" : "bg-card hover:border-primary/50"
                    )}
                    onClick={() => { if(item.linkUrl) window.open(item.linkUrl, '_blank'); onLinkOpened(item); }}
                    title={isManualSchedule ? "Horaire manuel (estimation)" : "Cliquez pour ouvrir"}
                  >
                    {/* Mini Cover */}
                    <div className="h-12 w-9 bg-muted rounded overflow-hidden shrink-0 border border-border/50 relative shadow-sm">
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800"><BookOpen className="w-3 h-3 text-white/30" /></div>
                      )}
                      {/* Badge indicateur horaire manuel */}
                      {isManualSchedule && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full border border-background" title="Horaire manuel" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate flex items-center gap-1">
                        {item.type === 'anime' && <Tv className="w-3 h-3 text-indigo-500"/>}
                        {item.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex flex-wrap gap-1 mt-1 items-center">
                        <span className="bg-background/50 px-1 rounded border">
                            {item.type === 'anime' ? 'Ep.' : 'Ch.'} {item.currentProgress}
                        </span>
                        {/* Show exact episode info from AniList */}
                        {isExactAiringWeek && nextEp && (
                          <>
                            <span className="text-[10px] text-primary font-semibold">
                              → Ep. {nextEp.episode}
                            </span>
                            {airingDate && (
                              <span className="text-[10px] text-muted-foreground opacity-90">
                                • {format(airingDate, 'HH:mm', { locale: fr })}
                              </span>
                            )}
                          </>
                        )}
                        {/* Show estimated episode number for future weeks */}
                        {!isExactAiringWeek && estimatedEpisode && (
                          <span className="text-[10px] text-yellow-600 dark:text-yellow-500 font-semibold">
                            → Ep. {estimatedEpisode} ~
                          </span>
                        )}
                        {/* Indicateur horaire manuel */}
                        {isManualSchedule && !estimatedEpisode && (
                          <span className="text-[10px] text-yellow-600 dark:text-yellow-500 italic opacity-80">
                            ~ horaire estimé
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Bouton +1 pour les animés */}
                    {item.type === 'anime' && (
                      <button
                        onClick={(e) => handleIncrementProgress(e, item)}
                        disabled={incrementing === item.id}
                        className="shrink-0 h-6 w-6 rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/40 flex items-center justify-center transition-all opacity-0 group-hover/card:opacity-100 disabled:opacity-50"
                        title="Marquer l'épisode comme vu (+1)"
                      >
                        {incrementing === item.id ? (
                          <Loader2 className="w-3 h-3 text-primary animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3 text-primary" />
                        )}
                      </button>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}