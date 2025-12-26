// Liste des principales villes françaises avec leurs coordonnées exactes
export const FRENCH_CITIES = [
  { name: "Paris", lat: 48.8566, lon: 2.3522, region: "Île-de-France" },
  { name: "Marseille", lat: 43.2965, lon: 5.3698, region: "Provence-Alpes-Côte d'Azur" },
  { name: "Lyon", lat: 45.7640, lon: 4.8357, region: "Auvergne-Rhône-Alpes" },
  { name: "Toulouse", lat: 43.6047, lon: 1.4442, region: "Occitanie" },
  { name: "Nice", lat: 43.7102, lon: 7.2620, region: "Provence-Alpes-Côte d'Azur" },
  { name: "Nantes", lat: 47.2184, lon: -1.5536, region: "Pays de la Loire" },
  { name: "Strasbourg", lat: 48.5734, lon: 7.7521, region: "Grand Est" },
  { name: "Montpellier", lat: 43.6108, lon: 3.8767, region: "Occitanie" },
  { name: "Bordeaux", lat: 44.8378, lon: -0.5792, region: "Nouvelle-Aquitaine" },
  { name: "Lille", lat: 50.6292, lon: 3.0573, region: "Hauts-de-France" },
  { name: "Rennes", lat: 48.1173, lon: -1.6778, region: "Bretagne" },
  { name: "Reims", lat: 49.2583, lon: 4.0317, region: "Grand Est" },
  { name: "Le Havre", lat: 49.4944, lon: 0.1079, region: "Normandie" },
  { name: "Saint-Étienne", lat: 45.4397, lon: 4.3872, region: "Auvergne-Rhône-Alpes" },
  { name: "Toulon", lat: 43.1242, lon: 5.9280, region: "Provence-Alpes-Côte d'Azur" },
  { name: "Angers", lat: 47.4784, lon: -0.5632, region: "Pays de la Loire" },
  { name: "Grenoble", lat: 45.1885, lon: 5.7245, region: "Auvergne-Rhône-Alpes" },
  { name: "Dijon", lat: 47.3220, lon: 5.0415, region: "Bourgogne-Franche-Comté" },
  { name: "Nîmes", lat: 43.8367, lon: 4.3601, region: "Occitanie" },
  { name: "Aix-en-Provence", lat: 43.5297, lon: 5.4474, region: "Provence-Alpes-Côte d'Azur" },
  { name: "Brest", lat: 48.3904, lon: -4.4861, region: "Bretagne" },
  { name: "Le Mans", lat: 48.0077, lon: 0.1984, region: "Pays de la Loire" },
  { name: "Amiens", lat: 49.8941, lon: 2.2958, region: "Hauts-de-France" },
  { name: "Tours", lat: 47.3941, lon: 0.6848, region: "Centre-Val de Loire" },
  { name: "Limoges", lat: 45.8336, lon: 1.2611, region: "Nouvelle-Aquitaine" },
  { name: "Clermont-Ferrand", lat: 45.7772, lon: 3.0870, region: "Auvergne-Rhône-Alpes" },
  { name: "Villeurbanne", lat: 45.7667, lon: 4.8800, region: "Auvergne-Rhône-Alpes" },
  { name: "Besançon", lat: 47.2380, lon: 6.0243, region: "Bourgogne-Franche-Comté" },
  { name: "Orléans", lat: 47.9029, lon: 1.9093, region: "Centre-Val de Loire" },
  { name: "Metz", lat: 49.1193, lon: 6.1757, region: "Grand Est" },
  { name: "Rouen", lat: 49.4432, lon: 1.0993, region: "Normandie" },
  { name: "Mulhouse", lat: 47.7508, lon: 7.3359, region: "Grand Est" },
  { name: "Caen", lat: 49.1829, lon: -0.3707, region: "Normandie" },
  { name: "Nancy", lat: 48.6921, lon: 6.1844, region: "Grand Est" },
  { name: "Argenteuil", lat: 48.9472, lon: 2.2469, region: "Île-de-France" },
  { name: "Saint-Denis", lat: 48.9356, lon: 2.3539, region: "Île-de-France" },
  { name: "Montreuil", lat: 48.8634, lon: 2.4444, region: "Île-de-France" },
  { name: "Roubaix", lat: 50.6942, lon: 3.1746, region: "Hauts-de-France" },
  { name: "Tourcoing", lat: 50.7236, lon: 3.1609, region: "Hauts-de-France" },
  { name: "Nanterre", lat: 48.8925, lon: 2.2069, region: "Île-de-France" },
  { name: "Avignon", lat: 43.9493, lon: 4.8055, region: "Provence-Alpes-Côte d'Azur" },
  { name: "Poitiers", lat: 46.5802, lon: 0.3404, region: "Nouvelle-Aquitaine" },
  { name: "Dunkerque", lat: 51.0343, lon: 2.3768, region: "Hauts-de-France" },
  { name: "Perpignan", lat: 42.6886, lon: 2.8948, region: "Occitanie" },
  { name: "La Rochelle", lat: 46.1603, lon: -1.1511, region: "Nouvelle-Aquitaine" },
  { name: "Challans", lat: 46.8456, lon: -1.8778, region: "Pays de la Loire" },
];

// Grouper par région
export const REGIONS = Array.from(new Set(FRENCH_CITIES.map(c => c.region))).sort();

export function getCitiesByRegion(region: string) {
  return FRENCH_CITIES.filter(c => c.region === region).sort((a, b) => a.name.localeCompare(b.name));
}

export function getCityByName(name: string) {
  return FRENCH_CITIES.find(c => c.name.toLowerCase() === name.toLowerCase());
}
