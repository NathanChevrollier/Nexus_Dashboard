"use client";

import { useTheme as useCustomTheme } from "@/components/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Monitor, Zap, Eye, Sparkles, Image as ImageIcon, Palette, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ThemeSettings() {
  const {
    theme,
    setTheme,
    primaryColor,
    setPrimaryColor,
    backgroundColor,
    setBackgroundColor,
    borderRadius,
    setBorderRadius,
    backgroundImage,
    setBackgroundImage,
    gradientPreset,
    setGradientPreset,
    timeBasedTheme,
    setTimeBasedTheme,
  } = useCustomTheme();

  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'upload");
      }

      // Définir l'image uploadée comme fond
      setBackgroundImage(data.url);
      setGradientPreset("none"); // Clear gradient when setting image
    } catch (error: any) {
      setUploadError(error.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  if (!mounted) return null;

  const themes = [
    { id: "light", label: "Clair", icon: Sun, color: "bg-white border-gray-200", description: "Thème lumineux" },
    { id: "dark", label: "Sombre", icon: Moon, color: "bg-zinc-950 border-zinc-800", description: "Thème sombre" },
    { id: "oled", label: "OLED", icon: Monitor, color: "bg-black border-zinc-900", description: "Noir pur" },
    { id: "cyber", label: "Cyber", icon: Zap, color: "bg-gradient-to-br from-[#3d4db7] to-[#6b4fa0] border-[#00d9ff]", description: "Bleu futuriste" },
    { id: "cyber-matrix", label: "Matrix", icon: Zap, color: "bg-gradient-to-br from-[#0d1117] to-[#0d1b2a] border-[#00ff41]", description: "Vert Matrix" },
    { id: "cyber-synthwave", label: "Synthwave", icon: Zap, color: "bg-gradient-to-br from-[#ff006e] to-[#8338ec] border-[#ff006e]", description: "Rétro coloré" },
    { id: "cyber-arctic", label: "Arctic", icon: Zap, color: "bg-gradient-to-br from-[#e0f7fa] to-[#80deea] border-[#00acc1]", description: "Bleu glacé" },
  ];

  const gradients = [
    { id: "none", label: "Aucun", preview: "bg-zinc-800" },
    { id: "aurora", label: "Aurora", preview: "bg-gradient-to-br from-[#00F260] via-[#0575E6] to-[#8E2DE2]" },
    { id: "sunset", label: "Sunset", preview: "bg-gradient-to-br from-[#FF6B6B] via-[#FFD93D] to-[#6BCB77]" },
    { id: "ocean", label: "Ocean", preview: "bg-gradient-to-br from-[#667eea] to-[#764ba2]" },
    { id: "forest", label: "Forest", preview: "bg-gradient-to-br from-[#134E5E] to-[#71B280]" },
    { id: "fire", label: "Fire", preview: "bg-gradient-to-br from-[#f12711] to-[#f5af19]" },
    { id: "purple-haze", label: "Purple Haze", preview: "bg-gradient-to-br from-[#360033] to-[#0b8793]" },
  ];

  return (
    <div className="space-y-6">
      
      {/* Sélection du thème principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Thème principal
          </CardTitle>
          <CardDescription>
            Choisissez le thème visuel de votre dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={cn(
                  "relative group overflow-hidden rounded-xl border-2 text-left transition-all",
                  theme === t.id ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn("h-20 w-full flex items-center justify-center", t.color)}>
                  <t.icon className="h-8 w-8 text-white/80" />
                </div>
                <div className="p-3 bg-card">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {t.label}
                    {theme === t.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gradients de fond */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Dégradés de fond
          </CardTitle>
          <CardDescription>
            Appliquez un dégradé animé en fond du dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gradients.map((g) => (
              <button
                key={g.id}
                onClick={() => setGradientPreset(g.id as any)}
                className={cn(
                  "relative group overflow-hidden rounded-xl border-2 text-left transition-all",
                  gradientPreset === g.id ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn("h-16 w-full", g.preview)} />
                <div className="p-3 bg-card">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {g.label}
                    {gradientPreset === g.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Image de fond */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Image de fond personnalisée
          </CardTitle>
          <CardDescription>
            Uploadez votre propre image comme arrière-plan du dashboard (max 5MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {backgroundImage && (
            <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border">
              <img src={backgroundImage} alt="Fond actuel" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBackgroundImage("")}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById("background-upload")?.click()}
                className="relative"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Choisir une image
                  </>
                )}
              </Button>
              <input
                id="background-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              <span className="text-sm text-muted-foreground">
                JPG, PNG, GIF ou WebP (max 5MB)
              </span>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-500/10 text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Couleurs personnalisées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Couleurs personnalisées
          </CardTitle>
          <CardDescription>
            Personnalisez les couleurs principales de l'interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Couleur primaire</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1"
                placeholder="#3b82f6"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrimaryColor("#3b82f6")}
              >
                Réinitialiser
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background-color">Couleur de fond</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="background-color"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1"
                placeholder="#171717"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBackgroundColor("#171717")}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Arrondissement des bordures
          </CardTitle>
          <CardDescription>
            Ajustez le niveau d'arrondissement des éléments de l'interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rayon : {borderRadius}px</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBorderRadius(8)}
              >
                Réinitialiser
              </Button>
            </div>
            <Slider
              value={[borderRadius]}
              onValueChange={(values: number[]) => setBorderRadius(values[0])}
              min={0}
              max={24}
              step={2}
              className="w-full"
            />
            <div className="flex gap-4 mt-4">
              <div
                className="flex-1 p-4 border-2 bg-card"
                style={{ borderRadius: `${borderRadius}px` }}
              >
                <p className="text-sm font-medium">Exemple de carte</p>
                <p className="text-xs text-muted-foreground mt-1">Avec borderRadius: {borderRadius}px</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options avancées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Options avancées
          </CardTitle>
          <CardDescription>
            Fonctionnalités supplémentaires de personnalisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Thème basé sur l'heure</Label>
              <p className="text-sm text-muted-foreground">
                Change automatiquement le thème selon l'heure de la journée
              </p>
            </div>
            <Switch
              checked={timeBasedTheme}
              onCheckedChange={setTimeBasedTheme}
            />
          </div>
        </CardContent>
      </Card>

      {/* Aperçu des composants */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu des composants</CardTitle>
          <CardDescription>
            Visualisez comment les composants apparaissent avec vos paramètres actuels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-bold">Carte Standard</h4>
              <p className="text-sm text-muted-foreground">Contenu de la carte</p>
            </Card>
            <div className="p-4 rounded-xl bg-muted">
              <h4 className="font-bold">Zone Muted</h4>
              <p className="text-sm text-muted-foreground">Zone désaturée</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}