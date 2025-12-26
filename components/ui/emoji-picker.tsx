"use client";

import React, { useState } from "react";
import { EMOJIS } from "@/lib/emojis";
import { Input } from "@/components/ui/input";

export function EmojiPicker({ value, onSelect }: { value?: string; onSelect: (e: string) => void }) {
  const [query, setQuery] = useState("");

  const filtered = EMOJIS.filter((e) => {
    if (!query) return true;
    return e.includes(query);
  });

  return (
    <div>
      <Input
        placeholder="Rechercher un emoji (ex: 🔥, 🎉)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-2 h-9"
      />
      <div className="grid grid-cols-8 gap-2 max-h-40 overflow-auto p-1">
        {filtered.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`p-1 rounded hover:bg-muted/30 ${value === emoji ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
          >
            <div className="text-2xl">{emoji}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmojiPicker;
