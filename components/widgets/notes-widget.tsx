"use client";

import { useState, useEffect } from "react";
import { Save, Edit3, Eye, FileText, Check } from "lucide-react";
import { Widget } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { updateWidget } from "@/lib/actions/widgets";

interface NotesWidgetProps {
  widget: Widget;
}

export function NotesWidget({ widget }: NotesWidgetProps) {
  const options = widget.options as { content?: string; title?: string };
  const [content, setContent] = useState(options.content || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textColor, setTextColor] = useState<string>((options as any).textColor || "#000000");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setContent(options.content || "");
    setTextColor((options as any).textColor || "#000000");
  }, [options.content]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateWidget(widget.id, {
        options: {
          ...(widget.options || {}),
          content,
          textColor,
        },
      });
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      setSaveError("Erreur lors de la sauvegarde des notes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {options.title || "Notes"}
        </div>
        <div className="flex items-center gap-1">
          {saved && (
            <div className="flex items-center gap-1 text-xs text-green-600 mr-2">
              <Check className="h-3 w-3" />
              Sauvegardé
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
            disabled={isSaving}
          >
            {isEditing ? (
              isSaving ? (
                <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )
            ) : (
              <Edit3 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      
      {saveError && (
        <div className="mb-2 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded p-2">
          {saveError}
        </div>
      )}

      {isEditing ? (
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-8">
            <TabsTrigger value="edit" className="text-xs flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              Éditer
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Aperçu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 mt-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-3 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              placeholder="# Titre

**Gras** _italique_ ~~barré~~

- Liste à puces
- Point 2

1. Liste numérotée
2. Point 2

[Lien](https://example.com)

```code
Code block
```

> Citation

---

Tableau :
| Col 1 | Col 2 |
|-------|-------|
| A     | B     |"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="text-xs text-muted-foreground">Couleur du texte :</div>
              {["#000000","#ffffff","#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6"].map((c) => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  className={`w-6 h-6 rounded-full border ${textColor === c ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              💡 Supporte Markdown : **gras**, _italique_, listes, liens, code, etc.
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 mt-0 overflow-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none p-3 border rounded-md bg-accent/20">
              {content ? (
                <div style={{ color: textColor }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground italic">Aucun contenu à prévisualiser</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 overflow-auto">
          {content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none" style={{ color: textColor }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
              Cliquez sur <Edit3 className="h-3 w-3 inline mx-1" /> pour ajouter des notes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
