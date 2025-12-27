"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Code, Globe, Check } from "lucide-react";
import { updateDashboardCustomCss, updateGlobalCss } from "@/lib/actions/theme";
import { useTheme } from "@/components/theme-provider";
import { useAlert } from "@/components/ui/confirm-provider";

interface ThemeSettingsProps {
  user: {
    role: "USER" | "VIP" | "ADMIN";
  };
  dashboardId: string;
}

export function ThemeSettings({ user, dashboardId }: ThemeSettingsProps) {
  const alert = useAlert();
  const { 
    theme, 
    setTheme, 
    primaryColor, 
    setPrimaryColor, 
    borderRadius, 
    setBorderRadius, 
    backgroundImage, 
    setBackgroundImage 
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

  const saveGuiSettings = async () => {
    // Les settings GUI sont maintenant sauvés automatiquement via le ThemeProvider
    // Mais on peut aussi les persister en BDD ici si nécessaire
    showSavedMessage();
  };

  const saveScopedCss = async () => {
    setSaving(true);
    try {
      await updateDashboardCustomCss(dashboardId, scopedCss);
      showSavedMessage();
    } catch (error) {
      console.error("Erreur:", error);
      await alert("Erreur lors de la sauvegarde");
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
      await alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
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
          <Card>
            <CardHeader>
              <CardTitle>Personnalisation de l'Interface</CardTitle>
              <CardDescription>
                Modifiez l'apparence de votre dashboard (changements instantanés)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Thème d'Affichage</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "light" 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded bg-white border-2 shadow-sm"></div>
                      <span className="text-sm font-medium">Clair</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "dark" 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded bg-gray-800 border-2 shadow-sm"></div>
                      <span className="text-sm font-medium">Sombre</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setTheme("oled")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "oled" 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded bg-black border-2 shadow-sm"></div>
                      <span className="text-sm font-medium">OLED</span>
                    </div>
                  </button>
                </div>
              </div>

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
                    className="w-16 h-16 bg-primary" 
                    style={{ borderRadius: `${borderRadius}px` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backgroundImage">Image de Fond (URL)</Label>
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
                <p className="text-sm text-muted-foreground mb-4">
                  💡 Les changements sont appliqués instantanément et sauvegardés automatiquement dans votre navigateur
                </p>
              </div>
            </CardContent>
          </Card>
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
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md text-sm">
                <p className="font-medium mb-2">⚠️ Règles de sécurité</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Le CSS sera automatiquement préfixé par l'ID de votre dashboard</li>
                  <li>Les sélecteurs globaux (body, html) sont interdits</li>
                  <li>Les positions fixes en plein écran sont bloquées</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scopedCss">Votre CSS Personnalisé</Label>
                <textarea
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
                  className="w-full h-64 px-3 py-2 border rounded-md bg-background font-mono text-sm"
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
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-sm">
                <p className="font-medium mb-2 text-red-600 dark:text-red-400">⚠️ ATTENTION - Zone Administrateur</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Ces modifications affectent TOUS les utilisateurs</li>
                  <li>Aucune restriction de sécurité appliquée</li>
                  <li>Utilisez avec précaution !</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="globalCss">CSS Global de l'Application</Label>
                <textarea
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
                  className="w-full h-64 px-3 py-2 border rounded-md bg-background font-mono text-sm"
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
