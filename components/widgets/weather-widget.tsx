"use client";

import { useState, useEffect } from "react";
// CORRECTION 1 : Ajout de Umbrella dans les imports pour éviter l'erreur "not defined"
import { 
  Cloud, CloudRain, Sun, Wind, Droplets, CloudSnow, 
  Cloudy, Eye, Gauge, Umbrella, Navigation, RefreshCw, CalendarDays 
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

const WEATHER_THEMES: Record<string, { gradient: string; iconColor: string; textColor: string }> = {
  default: { gradient: "from-slate-100 to-slate-300 dark:from-slate-800 dark:to-slate-950", iconColor: "text-slate-500", textColor: "text-slate-700 dark:text-slate-300" },
  sunny: { gradient: "from-amber-200 to-orange-100 dark:from-amber-900/60 dark:to-orange-950/60", iconColor: "text-amber-500", textColor: "text-amber-800 dark:text-amber-200" },
  cloudy: { gradient: "from-gray-200 to-slate-200 dark:from-slate-700/60 dark:to-gray-900/60", iconColor: "text-gray-400", textColor: "text-gray-700 dark:text-gray-300" },
  rainy: { gradient: "from-blue-200 to-indigo-200 dark:from-blue-900/60 dark:to-indigo-950/60", iconColor: "text-blue-500", textColor: "text-blue-800 dark:text-blue-200" },
  snowy: { gradient: "from-sky-100 to-blue-50 dark:from-sky-900/50 dark:to-blue-950/50", iconColor: "text-sky-400", textColor: "text-sky-800 dark:text-sky-200" },
  stormy: { gradient: "from-violet-200 to-fuchsia-200 dark:from-violet-900/60 dark:to-fuchsia-950/60", iconColor: "text-violet-500", textColor: "text-violet-800 dark:text-violet-200" },
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

  const getTheme = (code: number, isDay: boolean = true) => {
    if (code === 0 || code === 1) return isDay ? WEATHER_THEMES.sunny : WEATHER_THEMES.default;
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

  if (loading && !weather) {
    return <div className="h-full flex items-center justify-center bg-card animate-pulse"><Cloud className="h-10 w-10 text-muted" /></div>;
  }

  if (!weather) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 bg-card text-center">
        <Cloud className="h-10 w-10 mb-2 opacity-20" />
        <p className="text-sm text-muted-foreground mb-2">Météo indisponible</p>
        <Button size="sm" variant="outline" onClick={fetchWeather}>Réessayer</Button>
      </div>
    );
  }

  const theme = getTheme(weather.code, weather.isDay);
  const isCompact = widget.w <= 2 || widget.h <= 2;

  if (isCompact) {
    return (
      <div className={cn("h-full w-full flex flex-col justify-between p-4 bg-gradient-to-br", theme.gradient)}>
        <div className="flex justify-between items-start">
          <span className="font-semibold text-sm truncate max-w-[80px]">{weather.city}</span>
          <div className={theme.iconColor}>{getIcon(weather.code, "h-6 w-6")}</div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">{weather.temp}°</span>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="current" className={cn("h-full w-full flex flex-col bg-gradient-to-br relative overflow-hidden", theme.gradient)}>
      
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Fixe */}
      <div className="flex items-center justify-between px-5 pt-4 z-10 shrink-0">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Navigation className="h-3 w-3 text-primary" /> {weather.city}
          </h2>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-70">
            {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            <RefreshCw className="h-3 w-3 cursor-pointer hover:rotate-180 transition-transform" onClick={fetchWeather} />
          </p>
        </div>
        
        <TabsList className="h-7 bg-background/30 backdrop-blur-md border border-white/10 p-0.5 w-auto rounded-lg">
          <TabsTrigger value="current" className="text-[10px] h-6 px-2 rounded-sm data-[state=active]:bg-white/80 dark:data-[state=active]:bg-black/50">Actuel</TabsTrigger>
          <TabsTrigger value="forecast" className="text-[10px] h-6 px-2 rounded-sm data-[state=active]:bg-white/80 dark:data-[state=active]:bg-black/50">5 Jours</TabsTrigger>
        </TabsList>
      </div>

      {/* Zone de Contenu Principale */}
      {/* CORRECTION 2: Utilisation de flex-col et h-full pour occuper tout l'espace */}
      <div className="flex-1 overflow-hidden z-10 p-5 pt-2 flex flex-col min-h-0 relative">
        
        {/* --- ONGLET ACTUEL --- */}
        <TabsContent value="current" className="flex-1 flex flex-col mt-0 h-full min-h-0 data-[state=inactive]:hidden">
          {/* Scrollable si besoin */}
          <div className="overflow-y-auto flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 mt-2 shrink-0">
              <div className="flex flex-col">
                <span className="text-5xl font-bold tracking-tighter">{weather.temp}°</span>
                <span className="text-sm font-medium opacity-80 mt-1 capitalize">{weather.condition}</span>
                <span className="text-xs opacity-60">Ressenti {weather.feelsLike}°</span>
              </div>
              <div className={cn("p-3 rounded-3xl bg-white/20 dark:bg-black/10 backdrop-blur-md shadow-sm border border-white/10", theme.iconColor)}>
                {getIcon(weather.code, "h-14 w-14 drop-shadow-md")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              <MetricCard icon={Wind} label="Vent" value={`${weather.windSpeed} km/h`} color="text-cyan-500" />
              <MetricCard icon={Droplets} label="Humidité" value={`${weather.humidity}%`} color="text-blue-500" />
              <MetricCard icon={Eye} label="Visibilité" value={`${weather.visibility} km`} color="text-amber-500" />
              <MetricCard icon={Umbrella} label="Précip." value={`${weather.precipitation} mm`} color="text-purple-500" />
            </div>
          </div>
        </TabsContent>

        {/* --- ONGLET PRÉVISIONS --- */}
        {/* CORRECTION 3: Suppression de justify-end ou mt-auto implicites qui poussaient le contenu en bas */}
        <TabsContent value="forecast" className="flex-1 mt-0 h-full min-h-0 data-[state=inactive]:hidden flex flex-col">
          {/* Container Scrollable qui prend toute la hauteur disponible */}
          <div className="overflow-y-auto flex-1 pr-1 space-y-2">
            {forecast.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <CalendarDays className="h-8 w-8 mb-2" />
                <span className="text-xs">Pas de prévisions</span>
              </div>
            ) : (
              forecast.map((day, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-background/20 hover:bg-background/40 backdrop-blur-sm transition-colors border border-white/5">
                  <div className="w-16 font-semibold text-sm capitalize">{day.date}</div>
                  
                  <div className={cn("flex flex-col items-center mx-2", getTheme(day.code, true).iconColor)}>
                    {getIcon(day.code, "h-6 w-6")}
                  </div>

                  <div className="flex-1 flex items-center gap-2 text-sm">
                    <span className="text-right w-8 opacity-70">{day.tempMin}°</span>
                    <div className="flex-1 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden relative">
                      <div 
                        className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400 opacity-80"
                        style={{ 
                          left: '10%',
                          right: '10%' 
                        }}
                      />
                    </div>
                    <span className="font-bold w-8 text-right">{day.tempMax}°</span>
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

function MetricCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background/30 backdrop-blur-md border border-white/5 shadow-sm">
      <div className={cn("p-1.5 rounded-lg bg-white/40 dark:bg-black/20 shrink-0", color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] opacity-60 uppercase tracking-wider truncate">{label}</span>
        <span className="font-bold text-xs truncate">{value}</span>
      </div>
    </div>
  );
}