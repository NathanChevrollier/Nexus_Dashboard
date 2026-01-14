import { NextResponse } from "next/server";
import { getCityByName } from "@/lib/cities";
import crypto from 'crypto';

// cache weather per-city for short TTL to reduce external calls
const weatherCache = new Map<string, { ts: number; ttl: number; body: any }>();
const WEATHER_TTL = 60 * 10; // 10 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = (searchParams.get("city") || "Paris").trim();

    // 1) Geocoding - utiliser d'abord notre liste prédéfinie
    let latitude = 48.8566;
    let longitude = 2.3522;
    let resolvedCity = city;

    const cityData = getCityByName(city);
    
    if (cityData) {
      // Utiliser les coordonnées exactes de notre liste
      latitude = cityData.lat;
      longitude = cityData.lon;
      resolvedCity = cityData.name;
      console.log(`✓ Ville trouvée dans la base: ${resolvedCity} (${latitude}, ${longitude})`);
    } else {
      // Fallback sur le géocodage si la ville n'est pas dans notre liste
      console.log(`⚠️ Ville "${city}" non trouvée dans la base, utilisation du géocodage`);
      
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`,
          { cache: "no-store" }
        );
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          console.log(`Geocoding pour "${city}":`, geoJson);
          
          if (geoJson.results && geoJson.results.length > 0) {
            latitude = geoJson.results[0].latitude;
            longitude = geoJson.results[0].longitude;
            resolvedCity = geoJson.results[0].name || city;
            console.log(`✓ Ville trouvée par géocodage: ${resolvedCity} (${latitude}, ${longitude})`);
          } else {
            console.warn(`⚠️ Aucun résultat pour "${city}", utilisation des coordonnées par défaut (Paris)`);
          }
        }
      } catch (e) {
        console.error("Geocoding failed:", e);
      }
    }

    // 2) Fetch forecast + current
    const cacheKey = crypto.createHash('sha256').update(city + '|' + latitude + '|' + longitude).digest('hex');
    if (weatherCache.has(cacheKey)) {
      const entry = weatherCache.get(cacheKey)!;
      if (Date.now() - entry.ts < entry.ttl * 1000) {
        return NextResponse.json(entry.body);
      }
      weatherCache.delete(cacheKey);
    }
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current_weather: "true",
      current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation,visibility",
      timezone: "auto",
      daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,uv_index_max",
      hourly: "relativehumidity_2m",
    });

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { cache: "no-store" }
    );

    if (!weatherRes.ok) {
      throw new Error("Open-Meteo fetch failed");
    }

    const weatherJson = await weatherRes.json();
    const payload = {
      city: resolvedCity,
      latitude,
      longitude,
      ...weatherJson,
    };

    // cache the payload for a short TTL
    try {
      weatherCache.set(cacheKey, { ts: Date.now(), ttl: WEATHER_TTL, body: payload });
    } catch (e) { /* ignore cache set errors */ }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
