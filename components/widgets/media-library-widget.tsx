"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Widget } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MonitorPlay,
  Film,
  Tv,
  Music2,
  ArrowRight,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaLibraryWidgetProps {
  widget: Widget;
}

export function MediaLibraryWidget({ widget }: MediaLibraryWidgetProps) {
  const title = (widget.options as any)?.title || "Médiathèque";
  const searchParams = useSearchParams();
  const currentTab = (searchParams?.get("tab") as string) || "movie";

  const navItems = [
    {
      title: "Films",
      subtitle: "Parcourir vos films",
      icon: Film,
      href: "/media-library?tab=movie",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Séries TV",
      subtitle: "Continuer vos séries",
      icon: Tv,
      href: "/media-library?tab=series",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Musique",
      subtitle: "Albums, artistes et morceaux",
      icon: Music2,
      href: "/media-library?tab=music",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
  ];

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden border-border/50 shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm shrink-0 h-14">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <Link href="/media-library">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <ScrollArea className="flex-1 w-full h-full">
        <div className="p-4 space-y-3">
          {navItems.map((item, idx) => (
            <NavCard key={idx} item={item} currentTab={currentTab} />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

function NavCard({ item, currentTab }: { item: any; currentTab?: string }) {
  const Icon = item.icon;
  const hrefTab = String(item.href).split("tab=")[1] || "";
  const active = hrefTab === currentTab;

  return (
    <Link href={item.href} className="block group" aria-label={`Ouvrir ${item.title} dans la médiathèque`}>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border bg-card/50 transition-all hover:shadow-sm cursor-pointer",
          active ? "border-primary bg-accent/50" : "hover:bg-accent/50 hover:border-primary/20"
        )}
      >
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-transform group-hover:scale-110", item.bgColor)}>
          <Icon className={cn("h-5 w-5", item.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={cn("font-medium text-sm text-foreground/90 transition-colors", active ? "text-primary" : "group-hover:text-primary")}>
              {item.title}
            </h4>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 -translate-x-1 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
        </div>
      </div>
    </Link>
  );
}