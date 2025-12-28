'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  ExternalLink,
  Bookmark,
  Star,
  Globe,
  X,
  Search,
  LayoutGrid,
  List as ListIcon,
  Check
} from 'lucide-react';
import type { Widget } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface BookmarksWidgetProps {
  widget: Widget;
}

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  category?: string;
  favorite?: boolean;
  addedAt: number;
}

const categories = ['Work', 'Social', 'Dev', 'Tools', 'Entertainment', 'Other'];

export function BookmarksWidget({ widget }: BookmarksWidgetProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Work');
  
  // Filter states
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const isCompact = widget.w <= 2 && widget.h <= 2;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (widget.options.bookmarks) {
      setBookmarks(widget.options.bookmarks as BookmarkItem[]);
    }
  }, [widget.options]);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Auto-save logic (Debounced)
  useEffect(() => {
    const saveBookmarks = async () => {
      try {
        const { updateWidget } = await import('@/lib/actions/widgets');
        await updateWidget(widget.id, {
          options: { ...widget.options, bookmarks },
        });
      } catch (error) {
        console.error('Error saving bookmarks:', error);
      }
    };
    const timer = setTimeout(saveBookmarks, 1000);
    return () => clearTimeout(timer);
  }, [bookmarks, widget.id, widget.options]); // Added correct deps

  const addBookmark = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;

    let validUrl = newUrl;
    if (!validUrl.match(/^https?:\/\//) && !validUrl.startsWith('/')) {
      validUrl = 'https://' + validUrl;
    }

    const bookmark: BookmarkItem = {
      id: Date.now().toString(),
      title: newTitle,
      url: validUrl,
      category: selectedCategory,
      favorite: false,
      addedAt: Date.now(),
    };

    setBookmarks([bookmark, ...bookmarks]); // Add to top
    setNewTitle('');
    setNewUrl('');
    setIsAdding(false);
  };

  const deleteBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  const toggleFavorite = (id: string) => {
    setBookmarks(bookmarks.map((b) => 
      b.id === id ? { ...b, favorite: !b.favorite } : b
    ));
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  };

  // Filtering
  const filteredBookmarks = bookmarks.filter((b) => {
    if (showFavoritesOnly && !b.favorite) return false;
    if (filterCategory && b.category !== filterCategory) return false;
    if (searchQuery && !b.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header */}
      <div className="flex flex-col border-b bg-card/50">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md">
               <Bookmark className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">{widget.options.title || 'Bookmarks'}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant={showFavoritesOnly ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              title="Favoris seulement"
            >
              <Star className={cn("h-3.5 w-3.5", showFavoritesOnly && "fill-yellow-500 text-yellow-500")} />
            </Button>
            <Button
              variant={isAdding ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsAdding(!isAdding)}
              title="Ajouter un favori"
            >
              {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Search & Categories (Compact view logic could hide this) */}
        {!isAdding && !isCompact && (
          <div className="px-3 pb-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input 
                placeholder="Rechercher..." 
                className="h-7 pl-7 text-xs bg-muted/50 border-none focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="w-full whitespace-nowrap pb-1">
              <div className="flex gap-1">
                <Badge 
                  variant={filterCategory === null ? "default" : "outline"}
                  className="cursor-pointer text-[10px] h-5 px-2 hover:bg-primary/90"
                  onClick={() => setFilterCategory(null)}
                >
                  Tous
                </Badge>
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={filterCategory === cat ? "default" : "outline"}
                    className="cursor-pointer text-[10px] h-5 px-2 hover:bg-primary/90"
                    onClick={() => setFilterCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Add Form Area */}
        {isAdding && (
          <div className="p-3 bg-accent/20 border-b space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <Input
                ref={inputRef}
                placeholder="Titre du site"
                className="h-8 text-xs bg-background"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Input
                placeholder="https://example.com"
                className="h-8 text-xs bg-background"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBookmark()}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
               <select 
                 className="h-7 text-xs rounded border border-input bg-background px-2 w-full max-w-[120px]"
                 value={selectedCategory}
                 onChange={(e) => setSelectedCategory(e.target.value)}
               >
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <Button size="sm" className="h-7 text-xs px-4" onClick={addBookmark}>
                 Ajouter
               </Button>
            </div>
          </div>
        )}
      </div>

      {/* List Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Bookmark className="h-5 w-5" />
              </div>
              <p className="text-xs">Aucun favori trouvé</p>
            </div>
          ) : (
            filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-all border border-transparent hover:border-border/50"
              >
                {/* Favicon / Icon */}
                <a 
                  href={bookmark.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="shrink-0 relative w-8 h-8 rounded-md bg-muted/50 border flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
                >
                   <FaviconImage url={bookmark.url} />
                </a>

                {/* Text Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <a 
                      href={bookmark.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-medium truncate hover:text-primary transition-colors"
                    >
                      {bookmark.title}
                    </a>
                    {bookmark.favorite && <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate max-w-[120px] opacity-70">{new URL(bookmark.url).hostname}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                    <span className="opacity-70">{bookmark.category}</span>
                  </div>
                </div>

                {/* Actions (Visible on Hover) */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-yellow-500"
                    onClick={() => toggleFavorite(bookmark.id)}
                  >
                    <Star className={cn("h-3 w-3", bookmark.favorite && "fill-current")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteBookmark(bookmark.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Composant Helper pour gérer proprement les favicons
function FaviconImage({ url }: { url: string }) {
  const [error, setError] = useState(false);
  const domain = new URL(url).hostname;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  if (error) {
    return <Globe className="h-4 w-4 text-muted-foreground/50" />;
  }

  return (
    <img
      src={faviconUrl}
      alt="icon"
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}