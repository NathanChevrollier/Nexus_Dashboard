"use client";

import { useState, useEffect } from "react";
import { 
  Cloud, CloudRain, Sun, Wind, Droplets, CloudSnow, 
  Cloudy, Eye, Umbrella, Navigation, RefreshCw, CalendarDays 
} from "lucide-react";
import { Widget } from "@/lib/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WeatherWidgetProps {
  widget: Widget;
}

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  city: string;
  feelsLike: number;
  visibility: number;
  precipitation: number;
  isDay: boolean;
  code: number;
}

interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  code: number;
  precipitation: number;
}

// THÈMES AUTONOMES (Ne dépendent PAS du thème global de l'app)
// On force des couleurs statiques pour garantir le rendu visuel.
const WEATHER_THEMES: Record<string, { gradient: string; iconColor: string; barColor: string }> = {
  default: { 
    gradient: "from-slate-800/40 via-transparent to-transparent", 
    iconColor: "text-slate-400",
    barColor: "bg-slate-500"
  },
  sunny: { 
    gradient: "from-amber-500/20 via-orange-500/5 to-transparent", 
    iconColor: "text-amber-400",
    barColor: "bg-gradient-to-r from-amber-400 to-orange-500"
  },
  cloudy: { 
    gradient: "from-gray-500/30 via-slate-500/10 to-transparent", 
    iconColor: "text-gray-300",
    barColor: "bg-gray-400"
  },
  rainy: { 
    gradient: "from-blue-600/30 via-indigo-900/20 to-transparent", 
    iconColor: "text-blue-400",
    barColor: "bg-blue-500"
  },
  snowy: { 
    gradient: "from-sky-400/25 via-blue-200/5 to-transparent", 
    iconColor: "text-sky-300",
    barColor: "bg-sky-300"
  },
  stormy: { 
    gradient: "from-violet-600/30 via-purple-900/20 to-transparent", 
    iconColor: "text-violet-400",
    barColor: "bg-violet-500"
  },
};

export function WeatherWidget({ widget }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const options = widget.options as { city?: string };
  const city = options.city || "Paris";

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error("Failed to fetch weather");

      const data = await res.json();
      
      const current = data.current || {};
      const currentWeather = data.current_weather || {};
      const daily = data.daily || null;
      
      const temp = current.temperature_2m ?? currentWeather.temperature ?? 0;
      const weatherCode = current.weather_code ?? currentWeather.weathercode ?? 0;
      const isDay = (current.is_day ?? currentWeather.is_day) === 1;

      setWeather({
        temp: Math.round(temp),
        condition: getConditionLabel(weatherCode),
        humidity: current.relative_humidity_2m || 0,
        windSpeed: Math.round(current.wind_speed_10m ?? currentWeather.windspeed ?? 0),
        windDirection: current.wind_direction_10m ?? currentWeather.winddirection ?? 0,
        city: data.city || city,
        feelsLike: Math.round(data.current?.apparent_temperature ?? temp),
        visibility: current.visibility ? Math.round(current.visibility / 1000) : 10,
        precipitation: current.precipitation ?? 0,
        isDay,
        code: weatherCode
      });

      if (daily && daily.time) {
        const forecastData: ForecastDay[] = [];
        for (let i = 0; i < Math.min(daily.time.length, 5); i++) {
          const d = new Date(daily.time[i]);
          const dayNameFr = d.toLocaleDateString("fr-FR", { weekday: "short" });
          const dayNum = d.getDate();
          forecastData.push({
            date: `${dayNameFr}. ${dayNum}`,
            tempMin: Math.round(daily.temperature_2m_min[i]),
            tempMax: Math.round(daily.temperature_2m_max[i]),
            condition: getConditionLabel(daily.weather_code[i]),
            code: daily.weather_code[i],
            precipitation: daily.precipitation_sum[i] ?? 0
          });
        }
        setForecast(forecastData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Weather Error:", error);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); 
    return () => clearInterval(interval);
  }, [city]);

  const getConditionLabel = (code: number) => {
    if (code === 0) return "Ensoleillé";
    if (code >= 1 && code <= 3) return "Nuageux";
    if (code >= 45 && code <= 48) return "Brume";
    if (code >= 51 && code <= 67) return "Pluie";
    if (code >= 71 && code <= 77) return "Neige";
    if (code >= 80 && code <= 86) return "Averses";
    if (code >= 95) return "Orage";
    return "Inconnu";
  };

  const getTheme = (code: number) => {
    if (code === 0 || code === 1) return WEATHER_THEMES.sunny;
    if (code >= 2 && code <= 3) return WEATHER_THEMES.cloudy;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return WEATHER_THEMES.rainy;
    if ((code >= 71 && code <= 77) || code >= 85) return WEATHER_THEMES.snowy;
    if (code >= 95) return WEATHER_THEMES.stormy;
    return WEATHER_THEMES.default;
  };

  const getIcon = (code: number, className: string) => {
    if (code === 0 || code === 1) return <Sun className={className} />;
    if (code >= 2 && code <= 3) return <Cloudy className={className} />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className={className} />;
    if ((code >= 71 && code <= 77) || code >= 85) return <CloudSnow className={className} />;
    if (code >= 95) return <CloudRain className={className} />;
    return <Cloud className={className} />;
  };

  // --- RENDU LOADING / ERROR ---
  // Note: On utilise des couleurs fixes (zinc-900 / text-white) pour ignorer le thème clair
  
  if (loading && !weather) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950/80 animate-pulse text-zinc-500 rounded-2xl">
        <Cloud className="h-10 w-10" />
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 bg-zinc-950/80 text-center text-zinc-300 rounded-2xl">
        <Cloud className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm mb-2">Météo indisponible</p>
        <Button size="sm" variant="outline" className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-white" onClick={fetchWeather}>
          Réessayer
        </Button>
      </div>
    );
  }

  const theme = getTheme(weather.code);
  const isCompact = widget.w <= 2 || widget.h <= 2;

  // --- RENDU COMPACT ---
  if (isCompact) {
    return (
      <div className={cn(
        "h-full w-full flex flex-col justify-between p-4 relative overflow-hidden text-white",
        "bg-zinc-950/90 backdrop-blur-md border border-white/5", // Fond sombre forcé
        "bg-gradient-to-br", theme.gradient // Dégradé fixe
      )}>
        <div className="flex justify-between items-start z-10">
          <span className="font-semibold text-sm truncate max-w-[80px] opacity-90">{weather.city}</span>
          <div className={theme.iconColor}>{getIcon(weather.code, "h-6 w-6")}</div>
        </div>
        <div className="flex items-end gap-2 z-10">
          <span className="text-3xl font-bold">{weather.temp}°</span>
        </div>
      </div>
    );
  }

  // --- RENDU COMPLET ---
  return (
    <Tabs defaultValue="current" className={cn(
      "h-full w-full flex flex-col relative overflow-hidden text-white",
      "bg-zinc-950/80 backdrop-blur-xl border border-white/10 shadow-xl", // Fond unifié "Dark Glass"
      "bg-gradient-to-br", theme.gradient
    )}>
      
      {/* Background Decor (Fixes et subtils) */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/40 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 z-10 shrink-0">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Navigation className="h-3.5 w-3.5 text-white/70" /> {weather.city}
          </h2>
          <p className="text-[10px] text-white/40 flex items-center gap-1">
            {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            <RefreshCw className="h-3 w-3 cursor-pointer hover:text-white transition-colors" onClick={fetchWeather} />
          </p>
        </div>
        
        {/* Onglets stylisés "Glass" */}
        <TabsList className="h-7 bg-white/5 border border-white/10 p-0.5 w-auto rounded-lg">
          <TabsTrigger 
            value="current" 
            className="text-[10px] h-6 px-3 rounded-md text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all"
          >
            Actuel
          </TabsTrigger>
          <TabsTrigger 
            value="forecast" 
            className="text-[10px] h-6 px-3 rounded-md text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all"
          >
            5 Jours
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden z-10 p-5 pt-2 flex flex-col min-h-0">
        
        {/* --- ACTUEL --- */}
        <TabsContent value="current" className="flex-1 flex flex-col mt-0 h-full min-h-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-4 mt-2 shrink-0">
            <div className="flex flex-col">
              <span className="text-6xl font-bold tracking-tighter text-white drop-shadow-sm">{weather.temp}°</span>
              <span className="text-sm font-medium text-white/80 mt-1 capitalize flex items-center gap-2">
                {weather.condition}
              </span>
              <span className="text-xs text-white/50">Ressenti {weather.feelsLike}°</span>
            </div>
            <div className={cn("p-4 rounded-full bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm", theme.iconColor)}>
              {getIcon(weather.code, "h-16 w-16 drop-shadow-md")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-auto">
            <MetricCard icon={Wind} label="Vent" value={`${weather.windSpeed} km/h`} />
            <MetricCard icon={Droplets} label="Humidité" value={`${weather.humidity}%`} />
            <MetricCard icon={Eye} label="Visibilité" value={`${weather.visibility} km`} />
            <MetricCard icon={Umbrella} label="Précip." value={`${weather.precipitation} mm`} />
          </div>
        </TabsContent>

        {/* --- PRÉVISIONS --- */}
        <TabsContent value="forecast" className="flex-1 mt-0 h-full min-h-0 data-[state=inactive]:hidden flex flex-col">
          <div className="overflow-y-auto flex-1 pr-1 space-y-2 custom-scrollbar">
            {forecast.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30">
                <CalendarDays className="h-8 w-8 mb-2" />
                <span className="text-xs">Pas de prévisions</span>
              </div>
            ) : (
              forecast.map((day, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                  <div className="w-16 font-medium text-sm capitalize text-white/80">{day.date}</div>
                  
                  <div className={cn("flex flex-col items-center mx-2", theme.iconColor)}>
                    {getIcon(day.code, "h-5 w-5")}
                  </div>

                  <div className="flex-1 flex items-center gap-2 text-xs text-white">
                    <span className="text-right w-6 text-white/50">{day.tempMin}°</span>
                    {/* Barre de température visible sur fond sombre */}
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                      <div 
                        className={cn("absolute h-full rounded-full opacity-90", theme.barColor)}
                        style={{ 
                          left: '15%', 
                          width: '70%' // Simplifié pour le rendu
                        }}
                      />
                    </div>
                    <span className="font-bold w-6 text-right">{day.tempMax}°</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

// Sous-composant avec style forcé
function MetricCard({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
      <div className="p-1.5 rounded-lg bg-white/10 text-white/80 shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] text-white/40 uppercase tracking-wider truncate">{label}</span>
        <span className="font-bold text-xs truncate text-white/90">{value}</span>
      </div>
    </div>
  );
}