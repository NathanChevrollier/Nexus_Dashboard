"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Palette, Code, Globe, Check, Sparkles, Clock } from "lucide-react";
import { updateDashboardCustomCss, updateGlobalCss } from "@/lib/actions/theme";
import { useTheme } from "@/components/theme-provider";

interface ThemeSettingsProps {
  user: {
    role: "USER" | "VIP" | "ADMIN";
  };
  dashboardId: string;
}

const themeOptions = [
  { id: "light", name: "Clair", color: "#ffffff", border: "#e5e7eb" },
  { id: "dark", name: "Sombre", color: "#1f2937", border: "#374151" },
  { id: "oled", name: "OLED", color: "#000000", border: "#1f2937" },
  { id: "cyber", name: "Cyber Blue", color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", emoji: "⚡", border: "transparent" },
  { id: "cyber-matrix", name: "Matrix", color: "linear-gradient(135deg, #0f0c29 0%, #24243e 100%)", emoji: "🔢", border: "transparent" },
  { id: "cyber-synthwave", name: "Synthwave", color: "linear-gradient(135deg, #ff0080 0%, #40e0d0 100%)", emoji: "🌆", border: "transparent" },
  { id: "cyber-arctic", name: "Arctic", color: "linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)", emoji: "❄️", border: "transparent" },
] as const;

const gradientOptions = [
  { id: "none", name: "Aucun", preview: "#ffffff" },
  { id: "aurora", name: "Aurora", preview: "linear-gradient(135deg, #00F260 0%, #0575E6 50%, #8E2DE2 100%)" },
  { id: "sunset", name: "Sunset", preview: "linear-gradient(135deg, #FF6B6B 0%, #FFD93D 50%, #6BCB77 100%)" },
  { id: "ocean", name: "Ocean", preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "forest", name: "Forest", preview: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)" },
  { id: "fire", name: "Fire", preview: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  { id: "purple-haze", name: "Purple Haze", preview: "linear-gradient(135deg, #360033 0%, #0b8793 100%)" },
] as const;

const colorPalettes = [
  {
    name: "Material",
    colors: ["#F44336", "#2196F3", "#4CAF50", "#FF9800", "#9C27B0"]
  },
  {
    name: "Pastel",
    colors: ["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF"]
  },
  {
    name: "Neon",
    colors: ["#FF006E", "#FFBE0B", "#06FFA5", "#3A86FF", "#8338EC"]
  },
  {
    name: "Earth",
    colors: ["#8B4513", "#CD853F", "#DEB887", "#D2691E", "#A0522D"]
  },
] as const;

export function ThemeSettingsEnhanced({ user, dashboardId }: ThemeSettingsProps) {
  const { 
    theme, 
    setTheme, 
    primaryColor, 
    setPrimaryColor, 
    borderRadius, 
    setBorderRadius, 
    backgroundImage, 
    setBackgroundImage,
    gradientPreset,
    setGradientPreset,
    timeBasedTheme,
    setTimeBasedTheme,
  } = useTheme();

  const [scopedCss, setScopedCss] = useState("");
  const [globalCss, setGlobalCss] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canAccessVIP = user.role === "VIP" || user.role === "ADMIN";
  const canAccessAdmin = user.role === "ADMIN";

  const showSavedMessage = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveScopedCss = async () => {
    setSaving(true);
    try {
      await updateDashboardCustomCss(dashboardId, scopedCss);
      showSavedMessage();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const saveGlobalCss = async () => {
    setSaving(true);
    try {
      await updateGlobalCss(globalCss);
      showSavedMessage();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const applyColorPalette = (colors: readonly string[]) => {
    setPrimaryColor(colors[0]);
    showSavedMessage();
  };

  return (
    <div className="space-y-4">
      {saved && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top z-50">
          <Check className="h-5 w-5" />
          Paramètres sauvegardés !
        </div>
      )}

      <Tabs defaultValue="gui" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gui" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Apparence
          </TabsTrigger>
          <TabsTrigger 
            value="scoped" 
            disabled={!canAccessVIP}
            className="flex items-center gap-2"
          >
            <Code className="h-4 w-4" />
            CSS Avancé
            {!canAccessVIP && " 🔒"}
          </TabsTrigger>
          <TabsTrigger 
            value="global" 
            disabled={!canAccessAdmin}
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            CSS Global
            {!canAccessAdmin && " 🔒"}
          </TabsTrigger>
        </TabsList>

        {/* Niveau 1: Interface Graphique */}
        <TabsContent value="gui">
          <div className="space-y-6">
            {/* Thèmes Principaux */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Thèmes d'Affichage
                </CardTitle>
                <CardDescription>
                  Choisissez un thème parmi les 7 disponibles (changements instantanés)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {themeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setTheme(option.id as any)}
                      className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                        theme === option.id
                          ? "border-primary ring-2 ring-primary/20 shadow-lg" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-16 h-16 rounded-lg shadow-md"
                          style={{ 
                            background: option.color,
                            border: `2px solid ${option.border}`
                          }}
                        >
                          {'emoji' in option && option.emoji && (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {option.emoji}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium">{option.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time-Based Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Thème Adaptatif
                </CardTitle>
                <CardDescription>
                  Le thème change automatiquement selon l'heure de la journée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Activer le thème selon l'heure</Label>
                    <p className="text-sm text-muted-foreground">
                      Matin (5h-8h) → Sunset | Jour (8h-17h) → Light | Soir (17h-20h) → Purple | Nuit (20h-5h) → Cyber
                    </p>
                  </div>
                  <Switch
                    checked={timeBasedTheme}
                    onCheckedChange={setTimeBasedTheme}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Gradients Animés */}
            <Card>
              <CardHeader>
                <CardTitle>Fonds Dégradés</CardTitle>
                <CardDescription>
                  Appliquez un dégradé animé en arrière-plan (Compatible avec thèmes Light, Dark et OLED uniquement)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {theme.startsWith('cyber') && (
                  <div className="mb-4 p-3 bg-yellow-500/10 dark:bg-yellow-500/10 oled:bg-yellow-500/15 border border-yellow-500/30 rounded-lg text-sm">
                    <p className="text-yellow-800 dark:text-yellow-200 oled:text-yellow-100">
                      ⚠️ Les dégradés ne sont pas compatibles avec les thèmes Cyber. Veuillez sélectionner Light.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {gradientOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => !theme.startsWith('cyber') && setGradientPreset(option.id as any)}
                      disabled={theme.startsWith('cyber')}
                      className={`p-3 rounded-lg border-2 transition-all ${theme.startsWith('cyber') ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} ${
                        gradientPreset === option.id && !theme.startsWith('cyber')
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-full h-12 rounded shadow-md"
                          style={{ background: option.preview }}
                        />
                        <span className="text-xs font-medium">{option.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Palettes de Couleurs */}
            <Card>
              <CardHeader>
                <CardTitle>Palettes de Couleurs</CardTitle>
                <CardDescription>
                  Modifie la couleur primaire (Compatible avec thèmes Light, Dark et OLED - Les thèmes Cyber ont leur propre palette)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {theme.startsWith('cyber') && (
                  <div className="mb-4 p-3 bg-yellow-500/10 dark:bg-yellow-500/10 oled:bg-yellow-500/15 border border-yellow-500/30 rounded-lg text-sm">
                    <p className="text-yellow-800 dark:text-yellow-200 oled:text-yellow-100">
                      ⚠️ Les palettes personnalisées ne modifient pas les thèmes Cyber qui utilisent des couleurs prédéfinies.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {colorPalettes.map((palette) => (
                    <div key={palette.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{palette.name}</p>
                        <div className="flex gap-1 mt-2">
                          {palette.colors.map((color) => (
                            <div 
                              key={color}
                              className="w-8 h-8 rounded shadow-sm border"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyColorPalette(palette.colors)}
                        disabled={theme.startsWith('cyber')}
                      >
                        Appliquer
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Personnalisation Détaillée */}
            <Card>
              <CardHeader>
                <CardTitle>Personnalisation Détaillée</CardTitle>
                <CardDescription>
                  Ajustez finement chaque paramètre visuel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Couleur Principale</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="borderRadius">Arrondi des Coins: {borderRadius}px</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="borderRadius"
                      type="range"
                      min="0"
                      max="32"
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(Number(e.target.value))}
                      className="flex-1 cursor-pointer"
                    />
                    <div 
                      className="w-16 h-16 bg-primary transition-all" 
                      style={{ borderRadius: `${borderRadius}px` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundImage">Image de Fond Personnalisée (URL)</Label>
                  <Input
                    id="backgroundImage"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={backgroundImage}
                    onChange={(e) => setBackgroundImage(e.target.value)}
                  />
                  {backgroundImage && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBackgroundImage("")}
                    >
                      Supprimer l'image
                    </Button>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    💡 Tous les changements sont appliqués <strong>instantanément</strong> et sauvegardés automatiquement dans votre navigateur
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Niveau 2: CSS Scoped (VIP uniquement) */}
        <TabsContent value="scoped">
          <Card>
            <CardHeader>
              <CardTitle>CSS Personnalisé (Scoped)</CardTitle>
              <CardDescription>
                Stylisez votre dashboard sans affecter le reste de l'application (Réservé aux VIP)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 oled:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 oled:border-yellow-700 p-4 rounded-md text-sm">
                <p className="font-medium mb-2 text-yellow-900 dark:text-yellow-200 oled:text-yellow-100">⚠️ Règles de sécurité</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-300 oled:text-yellow-200">
                  <li>Le CSS sera automatiquement préfixé par l'ID de votre dashboard</li>
                  <li>Les sélecteurs globaux (body, html) sont interdits</li>
                  <li>Les positions fixes en plein écran sont bloquées</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scopedCss">Votre CSS Personnalisé</Label>
                <Textarea
                  id="scopedCss"
                  value={scopedCss}
                  onChange={(e) => setScopedCss(e.target.value)}
                  placeholder=".widget {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.widget:hover {
  transform: translateY(-4px);
  transition: all 0.3s ease;
}"
                  className="w-full h-64 font-mono text-sm"
                />
              </div>

              <Button onClick={saveScopedCss} className="w-full" disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer le CSS Personnalisé"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Niveau 3: CSS Global (ADMIN uniquement) */}
        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle>CSS Global (ADMIN)</CardTitle>
              <CardDescription>
                Personnalisez l'ensemble de l'application (Pouvoir réservé aux administrateurs)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 oled:bg-red-900/30 border border-red-200 dark:border-red-800 oled:border-red-700 p-4 rounded-md text-sm">
                <p className="font-medium mb-2 text-red-700 dark:text-red-400 oled:text-red-300">⚠️ ATTENTION - Zone Administrateur</p>
                <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-300 oled:text-red-200">
                  <li>Ces modifications affectent TOUS les utilisateurs</li>
                  <li>Aucune restriction de sécurité appliquée</li>
                  <li>Utilisez avec précaution !</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="globalCss">CSS Global de l'Application</Label>
                <Textarea
                  id="globalCss"
                  value={globalCss}
                  onChange={(e) => setGlobalCss(e.target.value)}
                  placeholder="/* Personnalisation globale */
body {
  font-family: 'Inter', sans-serif;
}

.navbar {
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}"
                  className="w-full h-64 font-mono text-sm"
                />
              </div>

              <Button onClick={saveGlobalCss} variant="destructive" className="w-full" disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer le CSS Global"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
