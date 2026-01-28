"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, Sparkles, Calendar, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface AnnouncementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'update' | 'alert';
    createdAt: Date | string;
  } | null;
}

const typeConfig = {
  info: {
    icon: Info,
    label: 'Information',
    badge: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200 dark:border-blue-800',
    headerGradient: 'from-blue-600 to-cyan-500',
    emoji: '📋'
  },
  update: {
    icon: Sparkles,
    label: 'Mise à jour',
    badge: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-800',
    headerGradient: 'from-emerald-600 to-teal-500',
    emoji: '🚀'
  },
  alert: {
    icon: AlertTriangle,
    label: 'Alerte',
    badge: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200 dark:border-red-800',
    headerGradient: 'from-red-600 to-orange-500',
    emoji: '⚠️'
  }
};

export function AnnouncementDetailDialog({ open, onOpenChange, announcement }: AnnouncementDetailDialogProps) {
  if (!announcement) return null;

  const config = typeConfig[announcement.type];
  const Icon = config.icon;
  
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden border-border/50 shadow-2xl flex flex-col">
        
        {/* Header Hero */}
        <div className={cn("relative p-6 text-white bg-gradient-to-br shrink-0", config.headerGradient)}>
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <span className="text-9xl leading-none select-none">{config.emoji}</span>
          </div>

          <DialogHeader className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                <Icon className="w-3 h-3 mr-1.5" />
                {config.label}
              </Badge>
              <div className="flex items-center text-white/80 text-xs bg-black/10 px-2 py-0.5 rounded-md backdrop-blur-sm">
                <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                {formatDate(announcement.createdAt)}
              </div>
            </div>
            
            <DialogTitle className="text-2xl font-bold tracking-tight text-white drop-shadow-sm leading-snug">
              {announcement.title}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background/50">
          <div className="prose prose-sm dark:prose-invert max-w-none 
            prose-headings:font-bold prose-headings:tracking-tight 
            prose-h1:text-xl prose-h1:text-primary 
            prose-h2:text-lg prose-h2:border-b prose-h2:pb-2 prose-h2:mt-6 
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-primary prose-code:font-mono prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
            prose-img:rounded-xl prose-img:shadow-md
            prose-li:marker:text-primary
          ">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 {...props} />,
                h2: ({node, ...props}) => <h2 {...props} />,
                a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} />,
              }}
            >
              {announcement.content}
            </ReactMarkdown>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}