"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/components/ui/confirm-provider";
import { Command } from "cmdk";
import { 
  Search, Settings, Plus, LayoutDashboard, Palette, 
  Download, Upload, Moon, Sun, Sparkles, Clock,
  Link as LinkIcon, Activity, Frame, Cloud, StickyNote, BarChart3
} from "lucide-react";

interface CommandPaletteProps {
  dashboardId?: string;
  onAddWidget?: (type: string) => void;
  onOpenSettings?: () => void;
}

export function CommandPalette({ dashboardId, onAddWidget, onOpenSettings }: CommandPaletteProps) {
  const alert = useAlert();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Toggle with Cmd/Ctrl + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleAction = useCallback((action: () => void) => {
    action();
    setOpen(false);
  }, []);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm font-medium">Rechercher</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded text-xs">
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Command Palette */}
      <Command.Dialog 
        open={open} 
        onOpenChange={setOpen}
        label="Command Menu"
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-card border-2 shadow-2xl rounded-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Command.Input
            placeholder="Rechercher une action, widget, ou page..."
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>

        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="py-12 text-center text-sm text-muted-foreground">
            Aucun résultat trouvé
          </Command.Empty>

          {/* Navigation */}
          <Command.Group heading="Navigation" className="mb-2">
            <CommandItem
              icon={LayoutDashboard}
              onSelect={() => handleAction(() => router.push("/dashboard"))}
            >
              Aller au Dashboard
            </CommandItem>
            <CommandItem
              icon={Settings}
              onSelect={() => handleAction(() => {
                if (onOpenSettings) {
                  onOpenSettings();
                } else {
                  router.push("/settings");
                }
              })}
            >
              Ouvrir les Paramètres
            </CommandItem>
          </Command.Group>

          {/* Widgets */}
          {dashboardId && onAddWidget && (
            <Command.Group heading="Ajouter un Widget" className="mb-2">
              <CommandItem
                icon={LinkIcon}
                onSelect={() => handleAction(() => onAddWidget("link"))}
              >
                Widget Lien
              </CommandItem>
              <CommandItem
                icon={Activity}
                onSelect={() => handleAction(() => onAddWidget("ping"))}
              >
                Widget Ping/Status
              </CommandItem>
              <CommandItem
                icon={Cloud}
                onSelect={() => handleAction(() => onAddWidget("weather"))}
              >
                Widget Météo
              </CommandItem>
              <CommandItem
                icon={StickyNote}
                onSelect={() => handleAction(() => onAddWidget("notes"))}
              >
                Widget Notes
              </CommandItem>
              <CommandItem
                icon={BarChart3}
                onSelect={() => handleAction(() => onAddWidget("chart"))}
              >
                Widget Graphique
              </CommandItem>
              <CommandItem
                icon={Frame}
                onSelect={() => handleAction(() => onAddWidget("iframe"))}
              >
                Widget iFrame
              </CommandItem>
              <CommandItem
                icon={Clock}
                onSelect={() => handleAction(() => onAddWidget("datetime"))}
              >
                Widget Horloge
              </CommandItem>
            </Command.Group>
          )}

          {/* Thèmes */}
          <Command.Group heading="Thèmes Rapides" className="mb-2">
            <CommandItem
              icon={Sun}
              onSelect={() => handleAction(() => {
                document.body.classList.remove("dark", "oled", "cyber");
                document.documentElement.classList.add("light");
              })}
            >
              Thème Clair
            </CommandItem>
            <CommandItem
              icon={Moon}
              onSelect={() => handleAction(() => {
                document.body.classList.remove("light", "oled", "cyber");
                document.documentElement.classList.add("dark");
              })}
            >
              Thème Sombre
            </CommandItem>
            <CommandItem
              icon={Sparkles}
              onSelect={() => handleAction(() => {
                document.documentElement.classList.remove("light", "dark", "oled");
                document.body.classList.add("cyber");
              })}
            >
              Thème Cyber
            </CommandItem>
          </Command.Group>

          {/* Actions Dashboard */}
          {dashboardId && (
            <Command.Group heading="Actions Dashboard" className="mb-2">
              <CommandItem
                icon={Download}
                onSelect={() => handleAction(async () => {
                  // Trigger export (you'll need to implement this)
                  await alert("Export du dashboard");
                })}
              >
                Exporter le Dashboard
              </CommandItem>
              <CommandItem
                icon={Upload}
                onSelect={() => handleAction(async () => {
                  // Trigger import dialog
                  await alert("Importer un dashboard");
                })}
              >
                Importer un Dashboard
              </CommandItem>
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-accent/50">
          <div className="flex items-center justify-between">
            <span>Utilisez ↑ ↓ pour naviguer</span>
            <span>↵ pour sélectionner</span>
            <span>ESC pour fermer</span>
          </div>
        </div>
      </Command.Dialog>
    </>
  );
}

function CommandItem({ 
  icon: Icon, 
  children, 
  onSelect 
}: { 
  icon: any; 
  children: React.ReactNode; 
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-accent aria-selected:bg-accent"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{children}</span>
    </Command.Item>
  );
}
