"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getLatestAnnouncements } from "@/lib/actions/announcements";
import type { Announcement } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, AlertTriangle, Sparkles, Clock, Search, Calendar, User, ChevronRight, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// Configuration visuelle par type
const typeConfig = {
  info: {
    icon: Info,
    label: 'Information',
    badge: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200 dark:border-blue-800',
    activeBorder: 'border-l-blue-500',
    emoji: '📋',
    headerGradient: 'from-blue-600 to-cyan-500',
    iconColor: 'text-blue-500'
  },
  update: {
    icon: Sparkles,
    label: 'Mise à jour',
    badge: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-800',
    activeBorder: 'border-l-emerald-500',
    emoji: '🚀',
    headerGradient: 'from-emerald-600 to-teal-500',
    iconColor: 'text-emerald-500'
  },
  alert: {
    icon: AlertTriangle,
    label: 'Alerte',
    badge: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200 dark:border-red-800',
    activeBorder: 'border-l-red-500',
    emoji: '⚠️',
    headerGradient: 'from-red-600 to-orange-500',
    iconColor: 'text-red-500'
  }
};

export default function AnnouncementsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const announcementId = searchParams.get('announcement');
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Chargement des données
  useEffect(() => {
    const loadAnnouncements = async () => {
      setLoading(true);
      try {
        const result = await getLatestAnnouncements(50);
        setAnnouncements(result);
        
        // Sélection automatique basée sur l'URL ou le premier item
        if (announcementId) {
          const selected = result.find(a => a.id === announcementId);
          if (selected) {
            setSelectedAnnouncement(selected);
          } else {
            // Fallback: fetch individuel si non trouvé dans la liste (ex: vieille annonce)
            try {
              const res = await fetch(`/api/announcements/${announcementId}`);
              if (res.ok) {
                const data = await res.json();
                setSelectedAnnouncement(data);
              }
            } catch (e) { console.error(e); }
          }
        } else if (result.length > 0 && !selectedAnnouncement) {
          setSelectedAnnouncement(result[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementId]);

  // Gestion du clic
  const handleSelect = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    const params = new URLSearchParams(searchParams.toString());
    params.set('announcement', announcement.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-4 lg:p-6 max-w-[1800px] mx-auto flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Annonces</h1>
            <p className="text-muted-foreground">Historique des mises à jour et communications</p>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher..." 
            className="pl-9 bg-background/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Contenu Principal - Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Colonne Gauche : Liste */}
        <Card className="lg:col-span-4 flex flex-col overflow-hidden bg-card/50 border-border/50 shadow-sm h-full">
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">Récents</span>
            <Badge variant="outline" className="text-xs font-normal">{filteredAnnouncements.length}</Badge>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loading ? (
                // Skeletons de chargement
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse m-1" />
                ))
              ) : filteredAnnouncements.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm">
                  <Search className="h-8 w-8 mb-2 opacity-20" />
                  Aucun résultat
                </div>
              ) : (
                filteredAnnouncements.map((item) => {
                  const isActive = selectedAnnouncement?.id === item.id;
                  const config = typeConfig[item.type];
                  const Icon = config.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "w-full text-left relative p-4 rounded-xl transition-all duration-200 group border border-transparent",
                        isActive 
                          ? "bg-background shadow-sm border-border ring-1 ring-primary/5" 
                          : "hover:bg-muted/50 hover:border-border/50"
                      )}
                    >
                      {/* Barre latérale colorée active */}
                      {isActive && (
                        <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", config.activeBorder.replace('border-l-', 'bg-'))} />
                      )}

                      <div className="flex gap-3">
                        <div className={cn("mt-0.5 p-2 rounded-lg shrink-0 h-fit transition-colors", isActive ? "bg-muted" : "bg-muted/50 group-hover:bg-muted")}>
                          <Icon className={cn("h-4 w-4", config.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={cn("font-medium text-sm truncate", isActive ? "text-foreground" : "text-foreground/90")}>
                              {item.title}
                            </span>
                            {isActive && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.content.replace(/[#*`]/g, '')}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Colonne Droite : Détail (Lecture) */}
        <div className="lg:col-span-8 h-full min-h-[500px] flex flex-col">
          {selectedAnnouncement ? (
            <Card className="flex-1 flex flex-col overflow-hidden shadow-lg border-border/60 animate-in fade-in zoom-in-[0.99] duration-300">
              
              {/* Hero Banner Header */}
              <div className={cn("relative p-8 md:p-10 text-white overflow-hidden shrink-0 bg-gradient-to-br", typeConfig[selectedAnnouncement.type].headerGradient)}>
                {/* Icône décorative en arrière-plan */}
                <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none">
                  <span className="text-[180px] leading-none">{typeConfig[selectedAnnouncement.type].emoji}</span>
                </div>
                
                <div className="relative z-10 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                      {(() => {
                        const Icon = typeConfig[selectedAnnouncement.type].icon;
                        return <Icon className="w-3 h-3 mr-1.5" />;
                      })()}
                      {typeConfig[selectedAnnouncement.type].label}
                    </Badge>
                    <div className="flex items-center text-white/80 text-sm bg-black/10 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                      {formatDate(selectedAnnouncement.createdAt)}
                    </div>
                  </div>
                  
                  <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight text-white drop-shadow-sm">
                    {selectedAnnouncement.title}
                  </h1>
                </div>
              </div>

              {/* Contenu Markdown */}
              <ScrollArea className="flex-1 bg-background/50">
                <div className="p-6 md:p-10 max-w-4xl mx-auto">
                  <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border/50">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Équipe Nexus</p>
                      <p className="text-xs text-muted-foreground">Administration</p>
                    </div>
                  </div>

                  <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none 
                    prose-headings:font-bold prose-headings:tracking-tight 
                    prose-h1:text-2xl prose-h1:text-primary 
                    prose-h2:text-xl prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                    prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-primary prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                    prose-img:rounded-xl prose-img:shadow-md prose-img:border prose-img:border-border/50
                    prose-li:marker:text-primary
                  ">
                    <ReactMarkdown>{selectedAnnouncement.content}</ReactMarkdown>
                  </div>
                </div>
              </ScrollArea>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5 text-center p-8">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sélectionnez une annonce</h3>
              <p className="text-muted-foreground max-w-sm">
                Choisissez une mise à jour ou une information dans la liste pour en afficher les détails complets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}