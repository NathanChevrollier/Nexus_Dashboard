"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// client-side module cache to avoid multiple fetches when component mounts repeatedly
let __ASSET_CACHE: any[] | null = (global as any).__ASSET_CACHE || null;

export default function AssetPicker({ onSelect, inline = false }: { onSelect: (url: string) => void; inline?: boolean }) {
  const [items, setItems] = useState<any[]>(__ASSET_CACHE || []);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (__ASSET_CACHE) return; // already loaded globally
      setLoading(true);
      try {
        const res = await fetch('/api/assets/from-repo');
        const body = await res.json();
        if (!mounted) return;
        __ASSET_CACHE = body.items || [];
        (global as any).__ASSET_CACHE = __ASSET_CACHE;
        setItems(__ASSET_CACHE || []);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    // set items from cache immediately if available
    if (__ASSET_CACHE && __ASSET_CACHE.length > 0) {
      setItems(__ASSET_CACHE);
    } else {
      load();
    }
    return () => { mounted = false; };
  }, []);

  const filtered = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));
  const visible = filtered.slice(0, visibleCount);

  const content = (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Input placeholder="Rechercher..." value={q} onChange={(e) => { setQ(e.target.value); setVisibleCount(60); }} className="h-9" />
        <div className="text-sm text-muted-foreground">{loading ? 'Chargement...' : `${filtered.length} trouvés`}</div>
      </div>

      <div className="grid grid-cols-6 gap-2 max-h-64 overflow-auto p-1">
        {visible.map((it) => {
          const proxyUrl = `/api/assets/proxy?path=${encodeURIComponent(it.path)}`;
          const placeholder = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' fill='%23222'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23bbb' font-size='10'>img</text></svg>`;
          return (
            <button
              key={it.path}
              onClick={() => { onSelect(proxyUrl); setOpen(false); }}
              className="flex flex-col items-center p-2 rounded hover:bg-muted/40"
              title={it.name}
            >
              <div className="h-12 w-12 mb-1 flex items-center justify-center bg-white/5 rounded">
                <img
                  src={proxyUrl}
                  alt={it.name}
                  loading="lazy"
                  className="max-h-10 max-w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground truncate w-24 text-center">{it.name}</div>
            </button>
          );
        })}
        {(!loading && filtered.length === 0) && (
          <div className="col-span-6 text-sm text-muted-foreground">Aucun résultat</div>
        )}
      </div>
      {filtered.length > visibleCount && (
        <div className="mt-2 flex justify-center">
          <button className="px-3 py-1 rounded bg-muted/20 hover:bg-muted/30 text-sm" onClick={() => setVisibleCount((c) => c + 60)}>Afficher plus</button>
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex">
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Rechercher...</Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Choisir une icône</DialogTitle>
        </DialogHeader>
        <div className="mt-2">{content}</div>
      </DialogContent>
    </Dialog>
  );
}
