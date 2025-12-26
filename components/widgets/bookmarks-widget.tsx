'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  ExternalLink,
  Bookmark,
  Star,
  Folder,
  Globe,
} from 'lucide-react';
import type { Widget } from '@/lib/db/schema';

interface BookmarksWidgetProps {
  widget: Widget;
}

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  category?: string;
  favorite?: boolean;
  addedAt: number;
}

const categories = ['Work', 'Social', 'Dev', 'Tools', 'Entertainment', 'Other'];

export function BookmarksWidget({ widget }: BookmarksWidgetProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Work');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const isCompact = widget.w <= 2 && widget.h <= 2;

  useEffect(() => {
    if (widget.options.bookmarks) {
      setBookmarks(widget.options.bookmarks as BookmarkItem[]);
    }
  }, [widget.options]);

  // Auto-save bookmarks
  useEffect(() => {
    const saveBookmarks = async () => {
      try {
        const { updateWidget } = await import('@/lib/actions/widgets');
        await updateWidget(widget.id, {
          options: {
            ...widget.options,
            bookmarks,
          },
        });
      } catch (error) {
        console.error('Error saving bookmarks:', error);
      }
    };

    const timer = setTimeout(saveBookmarks, 1000); // Debounce saves
    return () => clearTimeout(timer);
  }, [bookmarks]);

  const addBookmark = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;

    // Basic URL validation
    let validUrl = newUrl;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://') && !validUrl.startsWith('/')) {
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

    const updatedBookmarks = [...bookmarks, bookmark];
    setBookmarks(updatedBookmarks);
    setNewTitle('');
    setNewUrl('');
  };

  const toggleFavorite = (id: string) => {
    const updatedBookmarks = bookmarks.map((bookmark) =>
      bookmark.id === id ? { ...bookmark, favorite: !bookmark.favorite } : bookmark
    );
    setBookmarks(updatedBookmarks);
  };

  const deleteBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((bookmark) => bookmark.id !== id));
  };

  const openBookmark = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  let filteredBookmarks = bookmarks;
  if (showFavoritesOnly) {
    filteredBookmarks = filteredBookmarks.filter((b) => b.favorite);
  }
  if (filterCategory) {
    filteredBookmarks = filteredBookmarks.filter((b) => b.category === filterCategory);
  }

  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = bookmarks.filter((b) => b.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            {widget.options.title || 'Bookmarks'}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant={showFavoritesOnly ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star
                className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`}
              />
            </Button>
            <Badge variant="secondary">{bookmarks.length}</Badge>
          </div>
        </div>

        {/* Category Filter */}
        {!isCompact && (
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              <Button
                variant={filterCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(null)}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={filterCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat} ({categoryCounts[cat] || 0})
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Bookmarks Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className={`grid gap-3 ${isCompact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {filteredBookmarks.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No bookmarks yet</p>
            </div>
          ) : (
            filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="group relative p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
                onClick={() => openBookmark(bookmark.url)}
              >
                <div className="flex items-start gap-3">
                  {/* Favicon */}
                  <div className="shrink-0 mt-0.5">
                    {getFaviconUrl(bookmark.url) ? (
                      <img
                        src={getFaviconUrl(bookmark.url)!}
                        alt=""
                        className="w-5 h-5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {bookmark.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(bookmark.id);
                          }}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              bookmark.favorite
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {bookmark.url}
                    </p>
                    {bookmark.category && (
                      <Badge variant="outline" className="text-xs mt-2">
                        <Folder className="h-3 w-3 mr-1" />
                        {bookmark.category}
                      </Badge>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBookmark(bookmark.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Form */}
      <div className="p-4 border-t space-y-2">
        <div className="space-y-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Bookmark title..."
            className="text-sm"
          />
          <div className="flex gap-2">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBookmark()}
              placeholder="https://..."
              className="flex-1 text-sm"
            />
            <Button onClick={addBookmark} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!isCompact && (
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 text-xs rounded border ${
                  selectedCategory === cat
                    ? 'border-primary text-primary bg-accent'
                    : 'border-muted text-muted-foreground'
                } transition-colors`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
