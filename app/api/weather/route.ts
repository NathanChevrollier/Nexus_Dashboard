import { NextResponse } from "next/server";
import { getCityByName } from "@/lib/cities";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "Paris";

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

    return NextResponse.json({
      city: resolvedCity,
      latitude,
      longitude,
      ...weatherJson,
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
