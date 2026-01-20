'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  Film,
  Tv,
  Star,
  Check,
  Play,
  MoreVertical,
  Clapperboard,
  Search,
  Clock,
  RotateCcw
} from 'lucide-react';
import type { Widget } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator, 
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';

interface WatchlistWidgetProps {
  widget: Widget;
}

interface WatchItem {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'anime';
  status: 'to-watch' | 'watching' | 'watched';
  rating?: number;
  addedAt: number;
}

export function WatchlistWidget({ widget }: WatchlistWidgetProps) {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [selectedType, setSelectedType] = useState<'movie' | 'series' | 'anime'>('movie');
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('to-watch');

  // Initialisation
  useEffect(() => {
    if (widget.options.watchlist) {
      setItems(widget.options.watchlist as WatchItem[]);
    }
  }, [widget.options]);

  // Sauvegarde auto
  useEffect(() => {
    const saveWatchlist = async () => {
      try {
        const { updateWidget } = await import('@/lib/actions/widgets');
        await updateWidget(widget.id, {
          options: { ...widget.options, watchlist: items },
        }, true); // skipRevalidation = true pour éviter POST /dashboard excessifs
      } catch (error) {
        console.error(error);
      }
    };
    const timer = setTimeout(saveWatchlist, 1000);
    return () => clearTimeout(timer);
  }, [items, widget.id]);

  const addItem = () => {
    if (!newTitle.trim()) return;
    const item: WatchItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      type: selectedType,
      status: 'to-watch', // Par défaut dans "À voir"
      addedAt: Date.now(),
    };
    setItems([item, ...items]);
    setNewTitle('');
    setIsAdding(false);
    setActiveTab('to-watch'); // On bascule sur l'onglet "À voir"
  };

  const updateStatus = (id: string, status: WatchItem['status']) => {
    setItems(items.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const rateItem = (id: string, rating: number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, rating } : item)));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // --- HELPERS VISUELS ---

  const getPosterGradient = (title: string, type: string) => {
    const colors = [
      'from-blue-600 to-indigo-900',
      'from-emerald-500 to-teal-900',
      'from-orange-500 to-red-900',
      'from-purple-600 to-fuchsia-900',
      'from-pink-500 to-rose-900',
      'from-cyan-500 to-blue-900',
    ];
    const index = title.length % colors.length;
    return colors[index];
  };

  const getTypeIcon = (type: string, className?: string) => {
    const props = { className: className || "h-4 w-4" };
    switch (type) {
      case 'movie': return <Film {...props} />;
      case 'series': return <Tv {...props} />;
      case 'anime': return <Clapperboard {...props} />;
      default: return <Film {...props} />;
    }
  };

  // Filtrage par catégorie
  const getItemsByStatus = (status: WatchItem['status']) => items.filter(i => i.status === status);

  return (
    <div className="w-full h-full flex flex-col bg-card relative overflow-hidden group">
      
      {/* HEADER AVEC ONGLETS */}
      <div className="flex flex-col border-b bg-card/50 backdrop-blur-xl z-20 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            Ma Liste
          </h2>
          
          <Button 
            onClick={() => setIsAdding(!isAdding)} 
            size="sm"
            className={cn(
              "h-8 px-3 rounded-full transition-all duration-300 gap-1.5", 
              isAdding 
                ? "bg-muted text-foreground hover:bg-muted/80" 
                : "bg-primary text-primary-foreground shadow-md hover:scale-105"
            )}
          >
            {isAdding ? <XIcon className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isAdding ? "Fermer" : "Ajouter"}
          </Button>
        </div>

        {/* ZONE D'AJOUT (Collapsible) */}
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out bg-muted/30 border-b",
          isAdding ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="p-4 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                placeholder="Titre du film ou série..."
                className="pl-9 h-10 text-sm bg-background border-muted-foreground/20"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              {(['movie', 'series', 'anime'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all border",
                    selectedType === t 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "bg-background border-transparent text-muted-foreground hover:bg-background/80"
                  )}
                >
                  {getTypeIcon(t, "h-3 w-3")}
                  <span className="capitalize">{t === 'movie' ? 'Film' : t === 'series' ? 'Série' : 'Animé'}</span>
                </button>
              ))}
            </div>
            <Button onClick={addItem} size="sm" className="w-full h-8 text-xs">Valider</Button>
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL (TABS) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        
        {/* Barre d'onglets style "iOS Segmented Control" */}
        <div className="px-4 pt-3 pb-1 bg-card/50">
          <TabsList className="w-full grid grid-cols-3 h-9 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger value="to-watch" className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
              À voir ({getItemsByStatus('to-watch').length})
            </TabsTrigger>
            <TabsTrigger value="watching" className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:text-amber-500 data-[state=active]:shadow-sm transition-all">
              En cours ({getItemsByStatus('watching').length})
            </TabsTrigger>
            <TabsTrigger value="watched" className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:text-emerald-500 data-[state=active]:shadow-sm transition-all">
              Terminés ({getItemsByStatus('watched').length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Contenu des onglets */}
        <ScrollArea className="flex-1 bg-gradient-to-b from-background/5 to-transparent">
          <div className="p-4 min-h-full">
            
            {/* --- ONGLET À VOIR --- */}
            <TabsContent value="to-watch" className="mt-0 space-y-3 data-[state=inactive]:hidden">
              {getItemsByStatus('to-watch').length === 0 ? (
                <EmptyState icon={Film} message="Rien à voir pour l'instant" sub="Ajoutez des films à votre liste !" />
              ) : (
                getItemsByStatus('to-watch').map(item => (
                  <WatchListItem 
                    key={item.id} 
                    item={item} 
                    gradient={getPosterGradient(item.title, item.type)}
                    icon={getTypeIcon(item.type)}
                    onDelete={() => deleteItem(item.id)}
                    actionButton={
                      <Button 
                        onClick={() => updateStatus(item.id, 'watching')} 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs gap-1.5 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 w-full justify-start"
                      >
                        <Play className="h-3 w-3 fill-current" /> Commencer
                      </Button>
                    }
                  />
                ))
              )}
            </TabsContent>

            {/* --- ONGLET EN COURS --- */}
            <TabsContent value="watching" className="mt-0 space-y-3 data-[state=inactive]:hidden">
              {getItemsByStatus('watching').length === 0 ? (
                <EmptyState icon={Play} message="Aucun visionnage en cours" sub="Lancez-vous dans une série !" />
              ) : (
                getItemsByStatus('watching').map(item => (
                  <WatchListItem 
                    key={item.id} 
                    item={item} 
                    gradient={getPosterGradient(item.title, item.type)}
                    icon={getTypeIcon(item.type)}
                    onDelete={() => deleteItem(item.id)}
                    actionButton={
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => updateStatus(item.id, 'watched')} 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-xs gap-1.5 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 flex-1"
                        >
                          <Check className="h-3 w-3" /> Terminer
                        </Button>
                        <Button 
                          onClick={() => updateStatus(item.id, 'to-watch')} 
                          size="icon" 
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Remettre dans À voir"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    }
                  />
                ))
              )}
            </TabsContent>

            {/* --- ONGLET TERMINÉS --- */}
            <TabsContent value="watched" className="mt-0 space-y-3 data-[state=inactive]:hidden">
              {getItemsByStatus('watched').length === 0 ? (
                <EmptyState icon={Check} message="Aucun titre terminé" sub="Revenez quand vous aurez fini un film." />
              ) : (
                getItemsByStatus('watched').map(item => (
                  <WatchListItem 
                    key={item.id} 
                    item={item} 
                    gradient={getPosterGradient(item.title, item.type)}
                    icon={getTypeIcon(item.type)}
                    onDelete={() => deleteItem(item.id)}
                    isWatched
                    ratingComponent={
                      <div className="flex gap-0.5 mt-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => rateItem(item.id, star)}
                            className="p-0.5 hover:scale-125 transition-transform focus:outline-none"
                          >
                            <Star className={cn(
                              "h-3.5 w-3.5 transition-colors",
                              (item.rating || 0) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20 hover:text-amber-400"
                            )} />
                          </button>
                        ))}
                      </div>
                    }
                    actionButton={
                       <Button 
                          onClick={() => updateStatus(item.id, 'watching')} 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-[10px] text-muted-foreground hover:text-foreground p-0 h-auto justify-start mt-2"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Revoir
                        </Button>
                    }
                  />
                ))
              )}
            </TabsContent>

          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function WatchListItem({ item, gradient, icon, onDelete, actionButton, isWatched, ratingComponent }: any) {
  return (
    <div className="group relative flex gap-4 p-3 rounded-2xl bg-card border border-border/40 hover:border-border/80 hover:shadow-sm transition-all duration-200">
      
      {/* POSTER */}
      <div className={cn(
        "shrink-0 w-[55px] h-[85px] rounded-lg shadow-sm flex items-center justify-center text-white/90 bg-gradient-to-br relative overflow-hidden",
        gradient,
        isWatched && "grayscale opacity-80"
      )}>
        <div className="absolute inset-0 bg-white/10 opacity-50 mix-blend-overlay" />
        <div className="drop-shadow-md transform scale-110">{icon}</div>
        
        {/* Badge Note sur le poster si noté */}
        {isWatched && item.rating && (
          <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md rounded-md px-1 py-0.5 flex items-center gap-0.5 shadow-sm">
            <Star className="h-2 w-2 fill-yellow-400 text-yellow-400" />
            <span className="text-[9px] font-bold text-white">{item.rating}</span>
          </div>
        )}
      </div>

      {/* INFO & ACTIONS */}
      <div className="flex-1 flex flex-col min-w-0 py-0.5">
        <div className="flex justify-between items-start">
          <h3 className={cn(
            "font-bold text-sm leading-tight truncate pr-6 transition-all",
            isWatched ? "text-muted-foreground" : "text-foreground"
          )}>
            {item.title}
          </h3>
          
          {/* Menu Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-2">
          <span className="capitalize">{item.type}</span>
          <span>•</span>
          <span>{new Date(item.addedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
        </div>

        <div className="mt-auto pt-2">
          {ratingComponent}
          {actionButton}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub }: any) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/50 border-2 border-dashed border-muted/30 rounded-xl bg-muted/5 p-4 text-center">
      <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center mb-2">
        <Icon className="h-5 w-5 opacity-50" />
      </div>
      <p className="text-sm font-medium text-foreground/70">{message}</p>
      <p className="text-xs mt-0.5">{sub}</p>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}