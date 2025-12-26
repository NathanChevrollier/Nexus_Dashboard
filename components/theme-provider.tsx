"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { CyberParticles } from "./themes/cyber-particles";

type Theme = "light" | "dark" | "oled" | "cyber" | "cyber-matrix" | "cyber-synthwave" | "cyber-arctic";
type GradientPreset = "none" | "aurora" | "sunset" | "ocean" | "forest" | "fire" | "purple-haze";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  borderRadius: number;
  setBorderRadius: (radius: number) => void;
  backgroundImage: string;
  setBackgroundImage: (url: string) => void;
  gradientPreset: GradientPreset;
  setGradientPreset: (preset: GradientPreset) => void;
  timeBasedTheme: boolean;
  setTimeBasedTheme: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const gradientPresets: Record<GradientPreset, string> = {
  none: "",
  aurora: "linear-gradient(135deg, #00F260 0%, #0575E6 50%, #8E2DE2 100%)",
  sunset: "linear-gradient(135deg, #FF6B6B 0%, #FFD93D 50%, #6BCB77 100%)",
  ocean: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  forest: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)",
  fire: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
  "purple-haze": "linear-gradient(135deg, #360033 0%, #0b8793 100%)"
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [backgroundColor, setBackgroundColor] = useState("#171717");
  const [borderRadius, setBorderRadius] = useState(8);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [gradientPreset, setGradientPresetState] = useState<GradientPreset>("none");
  const [timeBasedTheme, setTimeBasedTheme] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("nexus-theme") as Theme;
    const savedPrimaryColor = localStorage.getItem("nexus-primary-color");
    const savedBackgroundColor = localStorage.getItem("nexus-background-color");
    const savedBorderRadius = localStorage.getItem("nexus-border-radius");
    const savedBackgroundImage = localStorage.getItem("nexus-background-image");
    const savedGradient = localStorage.getItem("nexus-gradient-preset") as GradientPreset;
    const savedTimeBased = localStorage.getItem("nexus-time-based-theme");

    if (savedTheme) setThemeState(savedTheme);
    if (savedPrimaryColor) setPrimaryColor(savedPrimaryColor);
    if (savedBackgroundColor) setBackgroundColor(savedBackgroundColor);
    if (savedBorderRadius) setBorderRadius(Number(savedBorderRadius));
    if (savedBackgroundImage) setBackgroundImage(savedBackgroundImage);
    if (savedGradient) setGradientPresetState(savedGradient);
    if (savedTimeBased) setTimeBasedTheme(savedTimeBased === "true");
  }, []);

  // Time-based theme switcher
  useEffect(() => {
    if (!timeBasedTheme) return;

    const updateThemeByTime = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 8) {
        // Sunrise: 5am-8am
        setGradientPresetState("sunset");
        setPrimaryColor("#FF6B35");
      } else if (hour >= 8 && hour < 17) {
        // Daylight: 8am-5pm
        setThemeState("light");
        setGradientPresetState("none");
      } else if (hour >= 17 && hour < 20) {
        // Sunset: 5pm-8pm
        setGradientPresetState("purple-haze");
        setPrimaryColor("#E63946");
      } else {
        // Night: 8pm-5am
        setThemeState("cyber");
        setGradientPresetState("none");
      }
    };

    updateThemeByTime();
    const interval = setInterval(updateThemeByTime, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [timeBasedTheme]);

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove all theme classes from both html and body
    root.classList.remove("light", "dark", "oled", "cyber");
    body.classList.remove("light", "dark", "oled", "cyber", "matrix", "synthwave", "arctic");
    
    // Add current theme class to both html and body
    if (theme.startsWith("cyber")) {
      root.classList.add("cyber");
      body.classList.add("cyber");
      
      // Add variant class
      if (theme === "cyber-matrix") body.classList.add("matrix");
      else if (theme === "cyber-synthwave") body.classList.add("synthwave");
      else if (theme === "cyber-arctic") body.classList.add("arctic");
    } else {
      root.classList.add(theme);
      body.classList.add(theme);
    }
    
    // Apply CSS variables
    root.style.setProperty("--primary", primaryColor);
    root.style.setProperty("--background", backgroundColor);
    root.style.setProperty("--radius", `${borderRadius}px`);
    
    // Apply gradient or image
    if (gradientPreset !== "none") {
      const gradient = gradientPresets[gradientPreset];
      root.style.setProperty("--background-gradient", gradient);
      body.style.background = gradient;
      body.style.backgroundAttachment = "fixed";
    } else if (backgroundImage) {
      root.style.setProperty("--background-image", `url(${backgroundImage})`);
      body.style.backgroundImage = `url(${backgroundImage})`;
    } else {
      root.style.removeProperty("--background-gradient");
      root.style.removeProperty("--background-image");
      body.style.background = "";
      body.style.backgroundImage = "";
    }

    // Save to localStorage
    localStorage.setItem("nexus-theme", theme);
    localStorage.setItem("nexus-primary-color", primaryColor);
    localStorage.setItem("nexus-background-color", backgroundColor);
    localStorage.setItem("nexus-border-radius", borderRadius.toString());
    localStorage.setItem("nexus-background-image", backgroundImage);
    localStorage.setItem("nexus-gradient-preset", gradientPreset);
    localStorage.setItem("nexus-time-based-theme", timeBasedTheme.toString());
  }, [theme, primaryColor, backgroundColor, borderRadius, backgroundImage, gradientPreset, timeBasedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Automatically adjust background color based on theme
    if (newTheme === "dark") {
      setBackgroundColor("#1a1a1a");
    } else if (newTheme === "oled") {
      setBackgroundColor("#000000");
    } else if (newTheme.startsWith("cyber")) {
      setBackgroundColor("transparent");
    } else {
      setBackgroundColor("#ffffff");
    }
  }, []);

  const setGradientPreset = useCallback((preset: GradientPreset) => {
    setGradientPresetState(preset);
    if (preset !== "none") {
      setBackgroundImage(""); // Clear image when using gradient
    }
  }, []);

  const isCyberTheme = useMemo(() => theme.startsWith("cyber"), [theme]);

  // Mémoriser la valeur du contexte pour éviter les re-renders
  const contextValue = useMemo(() => ({
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
  }), [
    theme,
    setTheme,
    primaryColor,
    backgroundColor,
    borderRadius,
    backgroundImage,
    gradientPreset,
    setGradientPreset,
    timeBasedTheme,
  ]);

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {isCyberTheme && <CyberParticles />}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
