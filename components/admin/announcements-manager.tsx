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
  Sparkles 
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

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "info",
      isPublished: false,
    });
  };

  const openCreateDialog = async () => {
    setEditingAnnouncement(null);
    resetForm();
    // Le formulaire sera affiché inline
  };

  const openEditDialog = (announcement: Announcement) => {
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
          <h2 className="text-2xl font-bold">Annonces & Patch Notes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérer les annonces visibles par tous les utilisateurs
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle annonce
        </Button>
      </div>

      {(editingAnnouncement !== null || formData.title || formData.content) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAnnouncement ? "Modifier l'annonce" : "Créer une annonce"}
            </CardTitle>
            <CardDescription>
              Les annonces publiées seront visibles par tous les utilisateurs
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
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune annonce créée
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getTypeIcon(announcement.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">
                          {announcement.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={getTypeBadgeColor(announcement.type)}
                        >
                          {announcement.type}
                        </Badge>
                        {announcement.isPublished ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            Publié
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                            Brouillon
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
