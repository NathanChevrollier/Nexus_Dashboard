"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Sparkles, AlertTriangle, Megaphone } from "lucide-react";
import { getLatestAnnouncements } from "@/lib/actions/announcements";
import type { Announcement } from "@/lib/db/schema";

export default function AnnouncementsFeed({ limit = 3 }: { limit?: number }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    const result = await getLatestAnnouncements(limit);
    setAnnouncements(result);
    setLoading(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "info": return <Info className="h-4 w-4" />;
      case "update": return <Sparkles className="h-4 w-4" />;
      case "alert": return <AlertTriangle className="h-4 w-4" />;
      default: return <Megaphone className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "info": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "update": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "alert": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "info": return "border-blue-500/20";
      case "update": return "border-green-500/20";
      case "alert": return "border-red-500/20";
      default: return "";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 bg-muted rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => (
        <Card key={announcement.id} className={`${getTypeColor(announcement.type)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {getTypeIcon(announcement.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">
                    {announcement.title}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`${getTypeBadgeColor(announcement.type)} text-xs`}
                  >
                    {announcement.type === "info" && "Info"}
                    {announcement.type === "update" && "Mise à jour"}
                    {announcement.type === "alert" && "Alerte"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(announcement.createdAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {announcement.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
