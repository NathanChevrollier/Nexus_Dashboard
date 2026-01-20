"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    gradient: 'from-blue-500 to-cyan-500'
  },
  update: {
    icon: Sparkles,
    label: 'Mise à jour',
    color: 'bg-green-500/10 text-green-500 border-green-500/30',
    gradient: 'from-green-500 to-emerald-500'
  },
  alert: {
    icon: AlertTriangle,
    label: 'Alerte',
    color: 'bg-red-500/10 text-red-500 border-red-500/30',
    gradient: 'from-red-500 to-orange-500'
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
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className={`flex items-center gap-3 mb-4 p-4 -m-6 -mt-2 rounded-t-lg bg-gradient-to-r ${config.gradient}`}>
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-white text-xl">
                  {announcement.title}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${config.color} border`}>
                  {config.label}
                </Badge>
                <span className="text-white/80 text-xs">
                  {formatDate(announcement.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="prose prose-sm dark:prose-invert max-w-none py-4">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
              li: ({node, ...props}) => <li className="ml-4" {...props} />,
              code: ({node, inline, ...props}: any) => 
                inline 
                  ? <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                  : <code className="block bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto" {...props} />,
              blockquote: ({node, ...props}) => (
                <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props} />
              ),
              a: ({node, ...props}) => (
                <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
              ),
            }}
          >
            {announcement.content}
          </ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}
