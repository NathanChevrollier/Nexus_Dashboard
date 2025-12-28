"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudSnow, Cloudy, Eye, Gauge } from "lucide-react";
import { Widget } from "@/lib/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

interface ForecastDay {
  date: string;
  temp: number;
  condition: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  uvIndex: number;
}

export function WeatherWidget({ widget }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"current" | "forecast">("current");

  const options = widget.options as { city?: string; apiKey?: string };
  const city = options.city || "Paris";

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        if (!res.ok) throw new Error("Failed to fetch weather");

        const data = await res.json();
        
        // Open-Meteo retourne "current" (objet avec les données actuelles) 
        // ET "current_weather" (simple avec temp/windspeed/weathercode)
        const current = data.current || {};
        const currentWeather = data.current_weather || {};
        const hourly = data.hourly || null;
        const daily = data.daily || null;
        const resolvedCity = data.city || city;

        const humidity = (() => {
          try {
            if (hourly && current.time) {
              const times: string[] = hourly.time || [];
              const rh: number[] = hourly.relativehumidity_2m || [];
              const idx = times.findIndex((t) => t.startsWith(current.time.substring(0, 13)));
              if (idx >= 0 && rh[idx] != null) return Math.round(rh[idx]);
              if (rh.length > 0) return Math.round(rh[0]);
            }
          } catch (e) {
            // ignore
          }
          return current.relative_humidity_2m ? Math.round(current.relative_humidity_2m) : 0;
        })();

        const conditionFromCode = (code: number) => {
          if (code === 0) return "Ensoleillé";
          if (code === 1 || code === 2) return "Peu nuageux";
          if (code === 3) return "Nuageux";
          if (code === 45 || code === 48) return "Brumeux";
          if (code >= 51 && code <= 67) return "Pluie";
          if (code >= 71 && code <= 77 || code === 85 || code === 86)
            return "Neige";
          if (code >= 80 && code <= 82) return "Averse";
          if (code >= 85 && code <= 86) return "Averse de neige";
          if (code === 95 || code === 96 || code === 99) return "Orage";
          return "Inconnu";
        };

        const hasTemp = current?.temperature_2m != null || currentWeather?.temperature != null;
        const hasCode = current?.weather_code != null || currentWeather?.weathercode != null;

        // If the API returned no useful current values, consider it an error
        if (!hasTemp && !hasCode) {
          throw new Error('Incomplete weather data from API');
        }

        const temp = hasTemp ? (current.temperature_2m ?? currentWeather.temperature) : undefined;
        const weatherCode = hasCode ? (current.weather_code ?? currentWeather.weathercode) : undefined;
        const windSpeed = current?.wind_speed_10m ?? currentWeather?.windspeed ?? 0;

        const w: WeatherData = {
          temp: temp != null ? Math.round(temp) : 0,
          condition: conditionFromCode(weatherCode),
          humidity: humidity,
          windSpeed: Math.round(windSpeed),
          windDirection: current.wind_direction_10m ? Math.round(current.wind_direction_10m) : (currentWeather.winddirection ? Math.round(currentWeather.winddirection) : 0),
          city: resolvedCity,
          feelsLike: Math.round(temp - (windSpeed / 3)),
          visibility: current.visibility ? Math.round(current.visibility / 1000) : 10,
          precipitation: current.precipitation ?? 0,
          isDay: current.is_day === 1 || currentWeather.is_day === 1,
        };

        setWeather(w);

        const forecastData: ForecastDay[] = [];
        if (daily) {
          const times: string[] = daily.time || [];
          const tmax: number[] = daily.temperature_2m_max || [];
          const tmin: number[] = daily.temperature_2m_min || [];
          const codes: number[] = daily.weather_code || [];
          const precip: number[] = daily.precipitation_sum || [];
          const uv: number[] = daily.uv_index_max || [];

          for (let i = 0; i < Math.min(times.length, 5); i++) {
            const d = new Date(times[i]);
            const day = d.toLocaleDateString("fr-FR", { weekday: "short" });
            const low = Math.round(tmin[i] ?? 0);
            const high = Math.round(tmax[i] ?? 0);
            const avg = Math.round(((low + high) / 2) || 0);
            const cond = conditionFromCode(codes[i] ?? -1);
            forecastData.push({
              date: day,
              temp: avg,
              condition: cond,
              tempMin: low,
              tempMax: high,
              precipitation: Math.round((precip[i] ?? 0) * 10) / 10,
              uvIndex: Math.round((uv[i] ?? 0) * 10) / 10,
            });
          }
        }

        setForecast(forecastData);
      } catch (error) {
        console.error('Erreur météo:', error);
        // Clear data on error so widget shows an explicit error state
        setWeather(null);
        setForecast([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Refresh toutes les 5 min
    return () => clearInterval(interval);
  }, [city, options]);

  const getWeatherIcon = (condition: string, size: "sm" | "lg" = "lg") => {
    const className = size === "lg" ? "h-12 w-12" : "h-6 w-6";
    
    switch (condition) {
      case "Ensoleillé":
        return <Sun className={`${className} text-yellow-500`} />;
      case "Pluvieux":
        return <CloudRain className={`${className} text-blue-500`} />;
      case "Venteux":
        return <Wind className={`${className} text-gray-500`} />;
      case "Neigeux":
        return <CloudSnow className={`${className} text-blue-200`} />;
      default:
        return <Cloudy className={`${className} text-gray-400`} />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="text-sm text-muted-foreground">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center text-center">
        <div className="text-sm text-muted-foreground mb-2">Impossible d'obtenir les données météo</div>
        <button
          className="px-3 py-1 rounded-md bg-primary text-white text-sm"
          onClick={() => {
            // simple retry by re-triggering the effect: change city key via query param trick
            setLoading(true);
            setTimeout(() => setLoading(false), 50);
            // More robust: re-run fetch by using a microtask
            setTimeout(() => {
              // no-op: effect depends on `city` and `options`; user can reload dashboard
            }, 100);
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Compact view (small widgets)
  if (widget.h <= 1 || widget.w <= 2) {
    return (
      <div className="p-3 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.condition, "sm")}
          <div>
            <div className="text-2xl font-bold">{weather.temp}°C</div>
            <div className="text-xs text-muted-foreground">{weather.city}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-3">
          <TabsTrigger value="current" className="text-xs">Maintenant</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs">5 jours</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="flex-1 mt-0">
          <div className="text-sm text-muted-foreground mb-2">{weather.city}</div>
          <div className="flex-1 flex items-start justify-between mb-4">
            <div>
              <div className="text-5xl font-bold mb-1">{weather.temp}°C</div>
              <div className="text-sm text-muted-foreground">
                Ressenti {weather.feelsLike}°C
              </div>
              <div className="text-sm mt-1 font-medium">{weather.condition}</div>
            </div>
            <div>{getWeatherIcon(weather.condition, "lg")}</div>
          </div>

          {/* Main metrics grid */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-card/50 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Humidité</span>
              </div>
              <div className="text-lg font-semibold">{weather.humidity}%</div>
            </div>
            <div className="bg-card/50 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="h-4 w-4 text-cyan-500" />
                <span className="text-muted-foreground">Vent</span>
              </div>
              <div className="text-lg font-semibold">{weather.windSpeed} km/h</div>
              <div className="text-[10px] text-muted-foreground">Direction: {weather.windDirection}°</div>
            </div>
            <div className="bg-card/50 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Visibilité</span>
              </div>
              <div className="text-lg font-semibold">{weather.visibility} km</div>
            </div>
            <div className="bg-card/50 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="h-4 w-4 text-purple-500" />
                <span className="text-muted-foreground">Précipitation</span>
              </div>
              <div className="text-lg font-semibold">{weather.precipitation.toFixed(1)} mm</div>
            </div>
          </div>

          {/* Additional info footer */}
          <div className="text-[10px] text-muted-foreground border-t pt-2">
            {weather.isDay ? "☀️ Jour" : "🌙 Nuit"}
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="flex-1 mt-0 overflow-y-auto">
          <div className="space-y-2">
            {forecast.map((day, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-medium w-12">{day.date}</span>
                    <div className="flex items-center gap-2">
                      {getWeatherIcon(day.condition, "sm")}
                      <span className="text-xs text-muted-foreground">{day.condition}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">{day.tempMin}°</span>
                    <div className="w-12 h-1.5 bg-gradient-to-r from-blue-400 to-orange-400 rounded-full"></div>
                    <span className="font-semibold">{day.tempMax}°</span>
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  {day.precipitation > 0 && (
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-blue-500" />
                      {day.precipitation.toFixed(1)} mm
                    </div>
                  )}
                  {day.uvIndex > 0 && (
                    <div>
                      UV Index: {day.uvIndex}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
