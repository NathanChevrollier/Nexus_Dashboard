'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  Eye,
  Film,
  Tv,
  Star,
  Clock,
  Check,
  X,
} from 'lucide-react';
import type { Widget } from '@/lib/db/schema';

interface WatchlistWidgetProps {
  widget: Widget;
}

interface WatchItem {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'anime';
  status: 'to-watch' | 'watching' | 'watched';
  rating?: number;
  cover?: string;
  year?: string;
  addedAt: number;
}

export function WatchlistWidget({ widget }: WatchlistWidgetProps) {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [selectedType, setSelectedType] = useState<'movie' | 'series' | 'anime'>('movie');
  const [filterStatus, setFilterStatus] = useState<'all' | WatchItem['status']>('all');

  const isCompact = widget.w <= 2 && widget.h <= 2;

  useEffect(() => {
    if (widget.options.watchlist) {
      setItems(widget.options.watchlist as WatchItem[]);
    }
  }, [widget.options]);

  // Auto-save watchlist
  useEffect(() => {
    const saveWatchlist = async () => {
      try {
        const { updateWidget } = await import('@/lib/actions/widgets');
        await updateWidget(widget.id, {
          options: {
            ...widget.options,
            watchlist: items,
          },
        });
      } catch (error) {
        console.error('Error saving watchlist:', error);
      }
    };

    const timer = setTimeout(saveWatchlist, 1000); // Debounce saves
    return () => clearTimeout(timer);
  }, [items]);

  const addItem = () => {
    if (!newTitle.trim()) return;

    const item: WatchItem = {
      id: Date.now().toString(),
      title: newTitle,
      type: selectedType,
      status: 'to-watch',
      addedAt: Date.now(),
    };

    const updatedItems = [...items, item];
    setItems(updatedItems);
    setNewTitle('');
  };

  const updateStatus = (id: string, status: WatchItem['status']) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    setItems(updatedItems);
  };

  const rateItem = (id: string, rating: number) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, rating } : item
    );
    setItems(updatedItems);
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'movie':
        return <Film className="h-4 w-4" />;
      case 'series':
        return <Tv className="h-4 w-4" />;
      case 'anime':
        return <Eye className="h-4 w-4" />;
      default:
        return <Film className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to-watch':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'watching':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'watched':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const filteredItems =
    filterStatus === 'all'
      ? items
      : items.filter((item) => item.status === filterStatus);

  const stats = {
    toWatch: items.filter((i) => i.status === 'to-watch').length,
    watching: items.filter((i) => i.status === 'watching').length,
    watched: items.filter((i) => i.status === 'watched').length,
  };

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {widget.options.title || 'Watchlist'}
          </h3>
          <Badge variant="secondary">{items.length}</Badge>
        </div>

        {/* Stats */}
        {!isCompact && (
          <div className="flex gap-2 text-xs">
            <Badge variant="outline" className="border-blue-500/20 text-blue-500">
              To Watch: {stats.toWatch}
            </Badge>
            <Badge variant="outline" className="border-yellow-500/20 text-yellow-500">
              Watching: {stats.watching}
            </Badge>
            <Badge variant="outline" className="border-green-500/20 text-green-500">
              Watched: {stats.watched}
            </Badge>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      {!isCompact && (
        <div className="px-4 pt-2">
          <div className="flex gap-1">
            {(['all', 'to-watch', 'watching', 'watched'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="text-xs"
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Items List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items in watchlist</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="group p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Type Icon */}
                  <div className="shrink-0 mt-0.5">{getTypeIcon(item.type)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(item.status)}`}
                      >
                        {item.status.replace('-', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.type}
                      </Badge>
                      {item.rating && (
                        <div className="flex items-center gap-1 text-xs text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          {item.rating}/5
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    {!isCompact && (
                      <div className="flex gap-1 mt-2">
                        {item.status !== 'watching' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(item.id, 'watching')}
                            className="h-6 px-2 text-xs"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Watch
                          </Button>
                        )}
                        {item.status !== 'watched' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(item.id, 'watched')}
                            className="h-6 px-2 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Done
                          </Button>
                        )}
                        {item.status === 'watched' && !item.rating && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => rateItem(item.id, rating)}
                                className="hover:scale-110 transition-transform"
                              >
                                <Star className="h-3 w-3 text-yellow-500 hover:fill-current" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Form */}
      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Add movie, series, anime..."
            className="flex-1"
          />
          <Button onClick={addItem} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {!isCompact && (
          <div className="flex gap-2">
            {(['movie', 'series', 'anime'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-1 px-2 py-1 text-xs rounded border capitalize ${
                  selectedType === type
                    ? 'border-primary text-primary bg-accent'
                    : 'border-muted text-muted-foreground'
                } transition-colors`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
