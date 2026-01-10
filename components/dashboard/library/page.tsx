'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, Play, MoreVertical, 
  CheckCircle2, PauseCircle, Clock, BookOpen, 
  Trash2, Loader2, Calendar as CalendarIcon, 
  LayoutGrid, ChevronLeft, ChevronRight, Eye, Edit2, ArrowLeft,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddLibraryItemDialog } from '@/components/dashboard/library/add-item-dialog';
import { useConfirm } from '@/components/ui/confirm-provider';
import { getLibraryItems, updateLibraryItem, deleteLibraryItem } from '@/lib/actions/library';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, formatDistanceToNow, differenceInCalendarWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function LibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  useEffect(() => { loadItems(); }, []);

  const handleItemOpened = async (item: any) => {
    const now = new Date();
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, lastReadAt: now } : i));
    await updateLibraryItem(item.id, { lastReadAt: now, updatedAt: now });
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' ? true : item.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  useEffect(() => {
    if (!search) { setSuggestions([]); return; }
    const q = search.toLowerCase();
    const s = items.filter(i => i.title && i.title.toLowerCase().includes(q)).slice(0, 6);
    setSuggestions(s);
  }, [search, items]);

  return (
    <div className="h-full flex flex-col bg-background/50 relative">

      <div className="flex flex-col pt-2 px-6 pb-6 max-w-[1920px] mx-auto w-full space-y-6 flex-1 h-full overflow-hidden">
        
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

            {/* BOUTON RETOUR (Centré, flottant, sans casser le layout) */}
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
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="h-full w-full pr-4 -mr-4">
            {loading ? (
              <div className="h-[50vh] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-muted-foreground" /></div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {filteredItems.map(item => (
                  <LibraryCard 
                    key={item.id} item={item} 
                    onUpdate={loadItems} 
                    onLinkOpened={() => handleItemOpened(item)}
                    onEdit={() => { setEditingItem(item); setIsAddOpen(true); }}
                    onDelete={async () => {
                      if(await confirm('Supprimer définitivement ?')) { await deleteLibraryItem(item.id); loadItems(); }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full">
                <WeeklyCalendarView items={items} currentWeek={currentWeek} onWeekChange={setCurrentWeek} onLinkOpened={handleItemOpened} />
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

// --- CARTE ITEM (Progression Intégrée) ---
function LibraryCard({ item, onUpdate, onEdit, onDelete, onLinkOpened }: any) {
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  
  const handleOpenLink = () => {
    if (item.linkUrl) { window.open(item.linkUrl, '_blank'); onLinkOpened(item); }
  };

  const handleAutoSaveProgress = async (newVal: number) => {
    // Save auto silencieux sans fermer l'éditeur
    await updateLibraryItem(item.id, { currentProgress: newVal });
    onUpdate();
  };

  return (
    <div className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
      
      {/* SECTION IMAGE */}
      <div className="relative h-56 w-full bg-muted overflow-hidden shrink-0">
        {item.coverUrl ? (
          <img 
            src={item.coverUrl} 
            alt={item.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-600">
            <BookOpen className="h-10 w-10 mb-2 opacity-50" />
            <span className="text-xs font-medium opacity-50">Sans couverture</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
          {item.linkUrl ? (
            <Button size="icon" className="h-12 w-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-110 transition-all" onClick={handleOpenLink}>
              <Play className="h-5 w-5 ml-1 fill-current" />
            </Button>
          ) : (
            <span className="text-xs text-white/80 font-medium px-2 py-1 bg-black/50 rounded">Pas de lien</span>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="h-7 text-[10px] px-3 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md" onClick={onEdit}>
              Modifier
            </Button>
          </div>
        </div>

        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
          {item.scheduleDay && (
            <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground border-0 text-[10px] uppercase font-bold shadow-sm backdrop-blur-sm px-2">
              {item.scheduleType === 'biweekly' ? '1/2 ' : ''} {item.scheduleDay.slice(0, 3)}
            </Badge>
          )}
        </div>
      </div>

      {/* SECTION CONTENU */}
      <div className="flex flex-col p-3 gap-3 flex-1 bg-card min-h-0">
        
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-sm leading-tight line-clamp-2 text-foreground" title={item.title}>
            {item.title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mt-1 -mr-2 text-muted-foreground hover:text-foreground"><MoreVertical className="h-3 w-3" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingProgress(!isEditingProgress)}>
                {isEditingProgress ? 'Masquer progression' : 'Modifier progression'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>Éditer les infos</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* --- ZONE DE PROGRESSION (AUTO-SAVE) --- */}
        <div className="mt-auto">
          {isEditingProgress ? (
            <InlineProgressEditor 
              item={item} 
              onClose={() => setIsEditingProgress(false)} 
              onAutoSave={handleAutoSaveProgress} 
            />
          ) : (
            <div className="space-y-1.5 cursor-pointer group/prog" onClick={() => setIsEditingProgress(true)} title="Cliquez pour changer rapidement">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground group-hover/prog:text-primary transition-colors">Chap. {item.currentProgress}</span>
                {item.totalProgress && <span className="opacity-60 text-[10px]">Sur {item.totalProgress}</span>}
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(100, item.totalProgress ? (item.currentProgress / item.totalProgress) * 100 : 5)}%` }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {!isEditingProgress && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            {item.lastReadAt ? (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1" title={new Date(item.lastReadAt).toLocaleString()}>
                <Eye className="w-3 h-3 text-primary/70" /> 
                {formatDistanceToNow(new Date(item.lastReadAt), { addSuffix: true, locale: fr })}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground opacity-50 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Jamais lu
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- EDITEUR INLINE (Auto-Save lent) ---
function InlineProgressEditor({ item, onClose, onAutoSave }: { item: any, onClose: () => void, onAutoSave: (val: number) => void }) {
  const [val, setVal] = useState(item.currentProgress || 0);
  
  // Auto-Save avec délai allongé (3000ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (val !== item.currentProgress) {
        onAutoSave(val);
      }
    }, 3000); // 3 secondes

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

      <Slider 
        value={[val]} 
        max={item.totalProgress || Math.max(100, val + 20)} 
        step={1} 
        onValueChange={(v) => setVal(v[0])}
        className="mb-2"
      />
      <div className="text-[9px] text-center text-muted-foreground italic flex justify-center gap-1">
        Sauvegarde auto...
      </div>
    </div>
  );
}

// --- CALENDRIER HEBDOMADAIRE AMÉLIORÉ ---
function WeeklyCalendarView({ items, currentWeek, onWeekChange, onLinkOpened }: any) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getItemsForDay = (day: Date) => {
    const dayName = format(day, 'EEEE').toLowerCase();
    return items.filter((item: any) => {
      if (!item.scheduleDay) return false;
      if (item.scheduleDay.toLowerCase() !== dayName) return false;

      const freq = (item.scheduleType || 'weekly');

      if (freq === 'weekly') return true;

      if (freq === 'biweekly') {
        // Use item's createdAt (or updatedAt) as anchor to determine week parity
        const anchor = item.createdAt ? new Date(item.createdAt) : item.updatedAt ? new Date(item.updatedAt) : new Date();
        try {
          const anchorWeekStart = startOfWeek(anchor, { weekStartsOn: 1 });
          const targetWeekStart = startOfWeek(day, { weekStartsOn: 1 });
          const diffWeeks = Math.abs(differenceInCalendarWeeks(targetWeekStart, anchorWeekStart));
          return diffWeeks % 2 === 0;
        } catch (e) {
          return true;
        }
      }

      if (freq === 'monthly') {
        // Monthly fallback: include if the day-of-month of the anchor falls within the current week
        const anchor = item.createdAt ? new Date(item.createdAt) : item.updatedAt ? new Date(item.updatedAt) : new Date();
        const anchorDay = anchor.getDate();
        // if any day in the week has same day-of-month as anchor, show it
        const daysInWeek = eachDayOfInterval({ start: startOfWeek(day, { weekStartsOn: 1 }), end: endOfWeek(day, { weekStartsOn: 1 }) });
        return daysInWeek.some(d => d.getDate() === anchorDay);
      }

      return true;
    });
  };

  return (
    <div className="bg-card rounded-2xl border shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b bg-muted/20">
        <h2 className="font-bold flex gap-2 items-center text-lg">
          <CalendarIcon className="w-5 h-5 text-primary"/> 
          <span className="capitalize">{format(weekStart, 'MMMM yyyy', {locale:fr})}</span>
        </h2>
        <div className="flex items-center bg-background rounded-lg border shadow-sm p-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => onWeekChange(subWeeks(currentWeek, 1))}><ChevronLeft className="w-4 h-4"/></Button>
          <span className="text-xs font-medium px-3 border-x h-5 flex items-center">Semaine {format(weekStart, 'w')}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => onWeekChange(addWeeks(currentWeek, 1))}><ChevronRight className="w-4 h-4"/></Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-7 flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-border">
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          const dayItems = getItemsForDay(day);
          
          return (
            <div key={day.toISOString()} className={cn("flex flex-col min-h-[140px] md:h-full group transition-colors relative", isToday ? "bg-primary/5" : "hover:bg-accent/5")}>
              {/* En-tête jour */}
              <div className={cn("p-3 border-b flex justify-between items-center sticky top-0 bg-inherit z-10", isToday && "text-primary font-bold")}>
                <span className="text-sm capitalize">{format(day, 'EEE', {locale:fr})}</span>
                <span className={cn("text-xs w-6 h-6 flex items-center justify-center rounded-full", isToday ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground")}>{format(day, 'd')}</span>
              </div>
              
              {/* Contenu Jour */}
              <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                {dayItems.length === 0 && isToday && (
                  <div className="h-full flex items-center justify-center opacity-30 text-xs italic text-center px-2">
                    Rien de prévu aujourd'hui
                  </div>
                )}
                
                {dayItems.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-2 p-2 rounded-lg border bg-background hover:border-primary/50 hover:shadow-md cursor-pointer transition-all group/item" 
                    onClick={() => { if(item.linkUrl) window.open(item.linkUrl); onLinkOpened(item); }}
                  >
                    {/* Mini Cover */}
                    <div className="h-10 w-8 bg-muted rounded overflow-hidden shrink-0 border border-border/50">
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800"><BookOpen className="w-3 h-3 text-white/30" /></div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate group-hover/item:text-primary transition-colors">{item.title}</div>
                      <div className="text-[10px] text-muted-foreground flex justify-between items-center mt-0.5">
                        <span>Chap. {item.currentProgress}</span>
                        {item.scheduleType === 'biweekly' && <span className="text-[9px] bg-muted px-1 rounded">1/2</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}