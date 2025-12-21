"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudSnow, Cloudy } from "lucide-react";
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
  city: string;
  feelsLike: number;
}

interface ForecastDay {
  date: string;
  temp: number;
  condition: string;
  tempMin: number;
  tempMax: number;
}

export function WeatherWidget({ widget }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"current" | "forecast">("current");

  const options = widget.options as { city?: string; apiKey?: string };
  const city = options.city || "Paris";

  useEffect(() => {
    // Simuler des données météo (dans la vraie app, utiliser une API comme OpenWeatherMap)
    const fetchWeather = async () => {
      setLoading(true);
      try {
        // Simulation de données actuelles
        await new Promise(resolve => setTimeout(resolve, 500));
        const conditions = ["Ensoleillé", "Nuageux", "Pluvieux", "Venteux", "Neigeux"];
        const currentCondition = conditions[Math.floor(Math.random() * conditions.length)];
        const currentTemp = Math.round(Math.random() * 20 + 10);
        
        setWeather({
          temp: currentTemp,
          condition: currentCondition,
          humidity: Math.round(Math.random() * 40 + 40),
          windSpeed: Math.round(Math.random() * 20 + 5),
          city,
          feelsLike: currentTemp + Math.round(Math.random() * 4 - 2),
        });

        // Simulation forecast 5 jours
        const days = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
        const forecastData = days.map((day, index) => {
          const temp = Math.round(Math.random() * 15 + 10 + index);
          return {
            date: day,
            temp,
            condition: conditions[Math.floor(Math.random() * conditions.length)],
            tempMin: temp - Math.round(Math.random() * 5),
            tempMax: temp + Math.round(Math.random() * 5),
          };
        });
        setForecast(forecastData);
      } catch (error) {
        console.error("Erreur météo:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Refresh toutes les 5 min
    return () => clearInterval(interval);
  }, [city]);

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
    return <div className="p-4">Erreur de chargement</div>;
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
          <div className="flex-1 flex items-center justify-between">
            <div>
              <div className="text-5xl font-bold mb-1">{weather.temp}°C</div>
              <div className="text-sm text-muted-foreground">
                Ressenti {weather.feelsLike}°C
              </div>
              <div className="text-sm mt-1">{weather.condition}</div>
            </div>
            <div>{getWeatherIcon(weather.condition, "lg")}</div>
          </div>
          <div className="flex gap-6 mt-4 text-xs text-muted-foreground border-t pt-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              <div>
                <div className="font-medium">{weather.humidity}%</div>
                <div className="text-[10px]">Humidité</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              <div>
                <div className="font-medium">{weather.windSpeed} km/h</div>
                <div className="text-[10px]">Vent</div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="flex-1 mt-0">
          <div className="space-y-2">
            {forecast.map((day, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8">{day.date}</span>
                  {getWeatherIcon(day.condition, "sm")}
                  <span className="text-xs text-muted-foreground">{day.condition}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{day.tempMin}°</span>
                  <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-orange-400 rounded-full"></div>
                  <span className="font-semibold">{day.tempMax}°</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
