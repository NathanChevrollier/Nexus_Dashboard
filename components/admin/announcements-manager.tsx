"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-provider";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Megaphone, 
  Info, 
  AlertTriangle,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  createAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/actions/announcements";
import type { Announcement } from "@/lib/db/schema";

export default function AnnouncementsManager() {
  const { push: pushToast } = useToast();
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info" as "info" | "update" | "alert",
    isPublished: false,
  });

  // Track explicit creation mode so the inline form can be shown when clicking "Nouvelle annonce"
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    const result = await getAllAnnouncements();
    if ("announcements" in result && result.announcements) {
      setAnnouncements(result.announcements);
    } else {
      pushToast({ title: "Erreur", description: result.error || "Erreur lors du chargement", type: "error" });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      pushToast({ title: "Erreur", description: "Titre et contenu requis", type: "error" });
      return;
    }

    if (editingAnnouncement) {
      const result = await updateAnnouncement(editingAnnouncement.id, formData);
      if (result.success) {
        pushToast({ title: "Succès", description: "Annonce mise à jour", type: "success" });
        setEditingAnnouncement(null);
        resetForm();
        loadAnnouncements();
      } else {
        pushToast({ title: "Erreur", description: result.error || "Erreur", type: "error" });
      }
    } else {
      const result = await createAnnouncement(formData);
      if (result.success) {
        pushToast({ title: "Succès", description: "Annonce créée", type: "success" });
        resetForm();
        loadAnnouncements();
      } else {
        pushToast({ title: "Erreur", description: result.error || "Erreur", type: "error" });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible."))) return;
    
    const result = await deleteAnnouncement(id);
    if (result.success) {
      pushToast({ title: "Succès", description: "Annonce supprimée", type: "success" });
      loadAnnouncements();
    } else {
      pushToast({ title: "Erreur", description: result.error || "Erreur", type: "error" });
    }
  };

  const handleTogglePublish = async (announcement: Announcement) => {
    const result = await updateAnnouncement(announcement.id, {
      isPublished: !announcement.isPublished,
    });
    
    if (result.success) {
      const action = announcement.isPublished ? "Dépubliée" : "Publiée";
      pushToast({ 
        title: "Succès", 
        description: `Annonce ${action.toLowerCase()}`, 
        type: "success" 
      });
      loadAnnouncements();
    } else {
      pushToast({ title: "Erreur", description: result.error || "Erreur", type: "error" });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "info",
      isPublished: false,
    });
    setIsCreating(false);
  };

  const openCreateDialog = async () => {
    setEditingAnnouncement(null);
    resetForm();
    // Le formulaire sera affiché inline
    setIsCreating(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    // disable creation mode when editing
    setIsCreating(false);
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type as "info" | "update" | "alert",
      isPublished: announcement.isPublished,
    });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📢 Annonces & Patch Notes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérer les annonces visibles par tous les utilisateurs
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle annonce
        </Button>
      </div>

      {(editingAnnouncement !== null || isCreating || formData.title || formData.content) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>
              {editingAnnouncement ? "✏️ Modifier l'annonce" : "✨ Créer une annonce"}
            </CardTitle>
            <CardDescription>
              Les annonces publiées seront visibles par tous les utilisateurs et des notifications seront envoyées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Titre de l'annonce"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "info" | "update" | "alert") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Info
                      </div>
                    </SelectItem>
                    <SelectItem value="update">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Mise à jour
                      </div>
                    </SelectItem>
                    <SelectItem value="alert">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Alerte
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Contenu de l'annonce (Markdown supporté)"
                  rows={8}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublished: checked })
                  }
                />
                <Label htmlFor="published">Publier immédiatement</Label>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingAnnouncement(null);
                    resetForm();
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editingAnnouncement ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-block">
            <div className="h-8 w-8 border-4 border-muted border-t-primary rounded-full animate-spin mb-3"></div>
            <p>Chargement des annonces...</p>
          </div>
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium">Aucune annonce créée</p>
            <p className="text-sm mt-1">Créez votre première annonce pour la partager avec vos utilisateurs</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Grouper les publiées et brouillons */}
          <div>
            <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Publiées ({announcements.filter(a => a.isPublished).length})
            </h3>
            <div className="space-y-2">
              {announcements.filter(a => a.isPublished).length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-2">Aucune annonce publiée</p>
              ) : (
                announcements.filter(a => a.isPublished).map((announcement) => (
                  <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="text-lg mt-0.5">
                            {announcement.type === 'info' ? '📋' : announcement.type === 'update' ? '🚀' : '⚠️'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <CardTitle className="text-base line-clamp-2">
                                {announcement.title}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className={getTypeBadgeColor(announcement.type)}
                                className="shrink-0"
                              >
                                {announcement.type}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs">
                              {new Date(announcement.createdAt).toLocaleDateString("fr-FR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublish(announcement)}
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            title="Dépublier cette annonce"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(announcement)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(announcement.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Brouillons */}
          {announcements.some(a => !a.isPublished) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-muted-foreground"></div>
                Brouillons ({announcements.filter(a => !a.isPublished).length})
              </h3>
              <div className="space-y-2 opacity-75">
                {announcements.filter(a => !a.isPublished).map((announcement) => (
                  <Card key={announcement.id} className="bg-muted/30 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="text-lg mt-0.5">
                            {announcement.type === 'info' ? '📋' : announcement.type === 'update' ? '🚀' : '⚠️'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <CardTitle className="text-base line-clamp-2">
                                {announcement.title}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className={getTypeBadgeColor(announcement.type)}
                                className="shrink-0"
                              >
                                {announcement.type}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs">
                              {new Date(announcement.createdAt).toLocaleDateString("fr-FR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublish(announcement)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                            title="Publier cette annonce"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(announcement)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(announcement.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
