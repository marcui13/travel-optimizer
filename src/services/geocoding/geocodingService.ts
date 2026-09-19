import { Location, TransportMode } from '../../domain/types';
import { GeocodingSearchResult, GeocodingOptions } from './types';
import { getCachedLocation, saveCachedLocation, getAllCachedLocations } from './cache';
import { getActiveGeocodingProvider } from './providerManager';
export interface CityHubInfo {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  cityCode: string;
  popularAirports?: string[];
  mainTrainStation?: string;
  defaultDescription?: string;
}

// Comprehensive offline database for instant, zero-latency location resolution
export const CITY_HUBS: Record<string, CityHubInfo> = {
  lisbon: {
    name: 'Lisbon',
    country: 'Portugal',
    latitude: 38.7223,
    longitude: -9.1393,
    cityCode: 'LIS',
    popularAirports: ['Humberto Delgado Airport (LIS)'],
    mainTrainStation: 'Lisboa Santa Apolónia',
    defaultDescription: 'Capital of Portugal, famed for pastel architecture and historic trams.',
  },
  madrid: {
    name: 'Madrid',
    country: 'Spain',
    latitude: 40.4168,
    longitude: -3.7038,
    cityCode: 'MAD',
    popularAirports: ['Adolfo Suárez Madrid–Barajas Airport (MAD)'],
    mainTrainStation: 'Madrid Puerta de Atocha',
    defaultDescription: 'Spain’s vibrant central capital with world-class museums and parks.',
  },
  barcelona: {
    name: 'Barcelona',
    country: 'Spain',
    latitude: 41.3879,
    longitude: 2.1699,
    cityCode: 'BCN',
    popularAirports: ['Josep Tarradellas Barcelona-El Prat (BCN)'],
    mainTrainStation: 'Barcelona Sants',
    defaultDescription: 'Catalan jewel known for Gaudí masterpieces and seaside promenades.',
  },
  rome: {
    name: 'Rome',
    country: 'Italy',
    latitude: 41.9028,
    longitude: 12.4964,
    cityCode: 'FCO',
    popularAirports: ['Leonardo da Vinci–Fiumicino (FCO)'],
    mainTrainStation: 'Roma Termini',
    defaultDescription: 'The Eternal City packed with ancient Roman landmarks and culinary hubs.',
  },
  florence: {
    name: 'Florence',
    country: 'Italy',
    latitude: 43.7696,
    longitude: 11.2558,
    cityCode: 'FLR',
    popularAirports: ['Florence Airport (FLR)', 'Pisa Airport (PSA)'],
    mainTrainStation: 'Firenze Santa Maria Novella',
    defaultDescription: 'Cradle of Renaissance art, the Uffizi, and the Duomo.',
  },
  venice: {
    name: 'Venice',
    country: 'Italy',
    latitude: 45.4408,
    longitude: 12.3155,
    cityCode: 'VCE',
    popularAirports: ['Venice Marco Polo (VCE)'],
    mainTrainStation: 'Venezia Santa Lucia',
    defaultDescription: 'City of canals, gondolas, and Gothic architecture.',
  },
  milan: {
    name: 'Milan',
    country: 'Italy',
    latitude: 45.4642,
    longitude: 9.1900,
    cityCode: 'MXP',
    popularAirports: ['Milan Malpensa (MXP)', 'Linate (LIN)'],
    mainTrainStation: 'Milano Centrale',
    defaultDescription: 'Global fashion and financial capital anchored by the majestic Duomo.',
  },
  budapest: {
    name: 'Budapest',
    country: 'Hungary',
    latitude: 47.4979,
    longitude: 19.0402,
    cityCode: 'BUD',
    popularAirports: ['Budapest Ferenc Liszt (BUD)'],
    mainTrainStation: 'Budapest Keleti',
    defaultDescription: 'The Pearl of the Danube, known for thermal baths and Parliament.',
  },
  vienna: {
    name: 'Vienna',
    country: 'Austria',
    latitude: 48.2082,
    longitude: 16.3738,
    cityCode: 'VIE',
    popularAirports: ['Vienna International Airport (VIE)'],
    mainTrainStation: 'Wien Hauptbahnhof',
    defaultDescription: 'Imperial palaces, grand cafes, and classical musical heritage.',
  },
  prague: {
    name: 'Prague',
    country: 'Czech Republic',
    latitude: 50.0755,
    longitude: 14.4378,
    cityCode: 'PRG',
    popularAirports: ['Václav Havel Airport Prague (PRG)'],
    mainTrainStation: 'Praha hlavní nádraží',
    defaultDescription: 'City of a Hundred Spires, historic Charles Bridge, and Old Town Square.',
  },
  berlin: {
    name: 'Berlin',
    country: 'Germany',
    latitude: 52.5200,
    longitude: 13.4050,
    cityCode: 'BER',
    popularAirports: ['Berlin Brandenburg Airport (BER)'],
    mainTrainStation: 'Berlin Hauptbahnhof',
    defaultDescription: 'Dynamic hub of history, art galleries, and vibrant nightlife.',
  },
  amsterdam: {
    name: 'Amsterdam',
    country: 'Netherlands',
    latitude: 52.3676,
    longitude: 4.9041,
    cityCode: 'AMS',
    popularAirports: ['Amsterdam Airport Schiphol (AMS)'],
    mainTrainStation: 'Amsterdam Centraal',
    defaultDescription: 'Canal rings, cycling culture, Rijksmuseum, and Van Gogh Museum.',
  },
  paris: {
    name: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    cityCode: 'CDG',
    popularAirports: ['Charles de Gaulle (CDG)', 'Orly (ORY)'],
    mainTrainStation: 'Gare de Lyon / Gare du Nord',
    defaultDescription: 'The City of Light, world-renowned gastronomy and iconic landmarks.',
  },
  london: {
    name: 'London',
    country: 'United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    cityCode: 'LON',
    popularAirports: ['Heathrow (LHR)', 'Gatwick (LGW)'],
    mainTrainStation: 'St Pancras International',
    defaultDescription: 'Historic global metropolis with premier theaters, parks, and museums.',
  },
  munich: {
    name: 'Munich',
    country: 'Germany',
    latitude: 48.1351,
    longitude: 11.5820,
    cityCode: 'MUC',
    popularAirports: ['Munich Airport (MUC)'],
    mainTrainStation: 'München Hauptbahnhof',
    defaultDescription: 'Bavarian culture, beer gardens, and gateway to the Alps.',
  },
  zurich: {
    name: 'Zurich',
    country: 'Switzerland',
    latitude: 47.3769,
    longitude: 8.5417,
    cityCode: 'ZRH',
    popularAirports: ['Zurich Airport (ZRH)'],
    mainTrainStation: 'Zürich Hauptbahnhof',
    defaultDescription: 'Scenic lakeside financial center with pristine alpine backdrop.',
  },
  dubrovnik: {
    name: 'Dubrovnik',
    country: 'Croatia',
    latitude: 42.6507,
    longitude: 18.0944,
    cityCode: 'DBV',
    popularAirports: ['Dubrovnik Airport (DBV)'],
    mainTrainStation: 'Dubrovnik Bus Terminal',
    defaultDescription: 'Walled medieval city overlooking the azure Adriatic Sea.',
  },
  split: {
    name: 'Split',
    country: 'Croatia',
    latitude: 43.5081,
    longitude: 16.4402,
    cityCode: 'SPU',
    popularAirports: ['Split Airport (SPU)'],
    mainTrainStation: 'Split Train Station',
    defaultDescription: 'Dalmatian coast port built around the ancient Roman Diocletian Palace.',
  },
  porto: {
    name: 'Porto',
    country: 'Portugal',
    latitude: 41.1579,
    longitude: -8.6291,
    cityCode: 'OPO',
    popularAirports: ['Francisco Sá Carneiro (OPO)'],
    mainTrainStation: 'Porto São Bento',
    defaultDescription: 'Famed for Port wine, steep tiled alleys, and the Douro River.',
  },
  seville: {
    name: 'Seville',
    country: 'Spain',
    latitude: 37.3891,
    longitude: -5.9845,
    cityCode: 'SVQ',
    popularAirports: ['Seville Airport (SVQ)'],
    mainTrainStation: 'Sevilla Santa Justa',
    defaultDescription: 'Andalusian capital known for flamenco dancing and the Alcázar palace.',
  },
  athens: {
    name: 'Athens',
    country: 'Greece',
    latitude: 37.9838,
    longitude: 23.7275,
    cityCode: 'ATH',
    popularAirports: ['Athens Eleftherios Venizelos (ATH)'],
    mainTrainStation: 'Larissa Station',
    defaultDescription: 'Historical heart of classical Greece, dominated by the Acropolis.',
  },
  buenos_aires: {
    name: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.6037,
    longitude: -58.3816,
    cityCode: 'EZE',
    popularAirports: ['Ministro Pistarini Ezeiza (EZE)', 'Aeroparque (AEP)'],
    mainTrainStation: 'Retiro',
    defaultDescription: 'Vibrant Latin American metropolis with European architecture and tango.',
  },
  new_york: {
    name: 'New York',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.0060,
    cityCode: 'NYC',
    popularAirports: ['JFK', 'EWR', 'LGA'],
    mainTrainStation: 'Penn Station / Moynihan Train Hall',
    defaultDescription: 'The city that never sleeps, with Central Park, Broadway, and world culture.',
  },
  tokyo: {
    name: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    cityCode: 'TYO',
    popularAirports: ['Haneda Airport (HND)', 'Narita Airport (NRT)'],
    mainTrainStation: 'Tokyo Station (Shinkansen Hub)',
    defaultDescription: 'Electrifying neon metropolis fusing ultra-modern innovation with timeless Shinto shrines.',
  },
  kyoto: {
    name: 'Kyoto',
    country: 'Japan',
    latitude: 35.0116,
    longitude: 135.7681,
    cityCode: 'UKY',
    popularAirports: ['Kansai International (KIX)'],
    mainTrainStation: 'Kyoto Station',
    defaultDescription: 'Ancient imperial capital celebrated for classical Buddhist temples, gardens, and geisha districts.',
  },
  osaka: {
    name: 'Osaka',
    country: 'Japan',
    latitude: 34.6937,
    longitude: 135.5023,
    cityCode: 'OSA',
    popularAirports: ['Itami Airport (ITM)', 'Kansai International (KIX)'],
    mainTrainStation: 'Shin-Osaka Station',
    defaultDescription: 'Food capital of Japan renowned for Dotonbori street food, bustling nightlife, and Osaka Castle.',
  },
  granada: {
    name: 'Granada',
    country: 'Spain',
    latitude: 37.1773,
    longitude: -3.5986,
    cityCode: 'GRX',
    popularAirports: ['Federico García Lorca Granada Airport (GRX)'],
    mainTrainStation: 'Granada Train Station',
    defaultDescription: 'Andalusian jewel framed by the Sierra Nevada, home to the breathtaking Alhambra fortress.',
  },
  cordoba: {
    name: 'Cordoba',
    country: 'Spain',
    latitude: 37.8882,
    longitude: -4.7794,
    cityCode: 'ODB',
    popularAirports: ['Seville Airport (SVQ)', 'Málaga Airport (AGP)'],
    mainTrainStation: 'Córdoba Central',
    defaultDescription: 'Historic crossroads of cultures famed for the Mosque-Cathedral and flower-filled courtyards.',
  },
  // Belgium (Bélgica)
  bruges: {
    name: 'Bruges',
    country: 'Belgium',
    latitude: 51.2093,
    longitude: 3.2247,
    cityCode: 'BKG',
    popularAirports: ['Brussels Airport (BRU)', 'Brussels South Charleroi (CRL)'],
    mainTrainStation: 'Brugge Station',
    defaultDescription: 'Fairytale medieval Belgian jewel famed for winding canals, cobbled lanes, and Flemish art.',
  },
  brussels: {
    name: 'Brussels',
    country: 'Belgium',
    latitude: 50.8503,
    longitude: 4.3517,
    cityCode: 'BRU',
    popularAirports: ['Brussels Airport (BRU)', 'Brussels South Charleroi (CRL)'],
    mainTrainStation: 'Bruxelles-Midi / Brussel-Zuid',
    defaultDescription: 'Capital of Belgium and the EU, celebrated for the Grand Place, waffles, and artisan chocolate.',
  },
  ghent: {
    name: 'Ghent',
    country: 'Belgium',
    latitude: 51.0543,
    longitude: 3.7174,
    cityCode: 'GNE',
    popularAirports: ['Brussels Airport (BRU)'],
    mainTrainStation: 'Gent-Sint-Pieters',
    defaultDescription: 'Vibrant university town blending medieval Gravensteen castle with picturesque riverside quays.',
  },
  antwerp: {
    name: 'Antwerp',
    country: 'Belgium',
    latitude: 51.2194,
    longitude: 4.4025,
    cityCode: 'ANR',
    popularAirports: ['Antwerp Airport (ANR)', 'Brussels Airport (BRU)'],
    mainTrainStation: 'Antwerpen-Centraal',
    defaultDescription: 'Diamond hub and fashion center boasting one of the world’s most spectacular railway stations.',
  },
  // France
  nice: {
    name: 'Nice',
    country: 'France',
    latitude: 43.7102,
    longitude: 7.2620,
    cityCode: 'NCE',
    popularAirports: ['Nice Côte d’Azur (NCE)'],
    mainTrainStation: 'Nice-Ville',
    defaultDescription: 'Capital of the French Riviera with the iconic Promenade des Anglais and turquoise waters.',
  },
  lyon: {
    name: 'Lyon',
    country: 'France',
    latitude: 45.7640,
    longitude: 4.8357,
    cityCode: 'LYS',
    popularAirports: ['Lyon–Saint-Exupéry (LYS)'],
    mainTrainStation: 'Lyon-Part-Dieu',
    defaultDescription: 'Gastronomic capital of France traversed by the Rhône and Saône rivers with historic traboules.',
  },
  marseille: {
    name: 'Marseille',
    country: 'France',
    latitude: 43.2965,
    longitude: 5.3698,
    cityCode: 'MRS',
    popularAirports: ['Marseille Provence (MRS)'],
    mainTrainStation: 'Marseille Saint-Charles',
    defaultDescription: 'Ancient Mediterranean port city famous for the vibrant Old Port and spectacular Calanques.',
  },
  bordeaux: {
    name: 'Bordeaux',
    country: 'France',
    latitude: 44.8378,
    longitude: -0.5792,
    cityCode: 'BOD',
    popularAirports: ['Bordeaux–Mérignac (BOD)'],
    mainTrainStation: 'Bordeaux Saint-Jean',
    defaultDescription: 'Global wine capital surrounded by prestigious vineyards, grand plazas, and neoclassical facades.',
  },
  strasbourg: {
    name: 'Strasbourg',
    country: 'France',
    latitude: 48.5734,
    longitude: 7.7521,
    cityCode: 'SXB',
    popularAirports: ['Strasbourg Airport (SXB)'],
    mainTrainStation: 'Strasbourg-Ville',
    defaultDescription: 'Alsatian capital on the Rhine border, famed for half-timbered houses and soaring Gothic cathedral.',
  },
  // Spain
  valencia: {
    name: 'Valencia',
    country: 'Spain',
    latitude: 39.4699,
    longitude: -0.3763,
    cityCode: 'VLC',
    popularAirports: ['Valencia Airport (VLC)'],
    mainTrainStation: 'Valencia Joaquín Sorolla',
    defaultDescription: 'Sun-soaked home of authentic paella, Mediterranean beaches, and the City of Arts and Sciences.',
  },
  bilbao: {
    name: 'Bilbao',
    country: 'Spain',
    latitude: 43.2630,
    longitude: -2.9350,
    cityCode: 'BIO',
    popularAirports: ['Bilbao Airport (BIO)'],
    mainTrainStation: 'Bilbao-Abando',
    defaultDescription: 'Basque cultural powerhouse home to the titanium-clad Guggenheim Museum and gourmet pintxos.',
  },
  san_sebastian: {
    name: 'San Sebastian',
    country: 'Spain',
    latitude: 43.3183,
    longitude: -1.9812,
    cityCode: 'EAS',
    popularAirports: ['San Sebastián Airport (EAS)', 'Biarritz (BIQ)'],
    mainTrainStation: 'Donostia-San Sebastián',
    defaultDescription: 'World-renowned culinary jewel with crescent-shaped La Concha bay and bustling Old Town taverns.',
  },
  malaga: {
    name: 'Malaga',
    country: 'Spain',
    latitude: 36.7213,
    longitude: -4.4214,
    cityCode: 'AGP',
    popularAirports: ['Málaga-Costa del Sol (AGP)'],
    mainTrainStation: 'Málaga María Zambrano',
    defaultDescription: 'Andalusian coastal capital and birthplace of Picasso, with hilltop Alcazaba and beach promenades.',
  },
  // Italy
  naples: {
    name: 'Naples',
    country: 'Italy',
    latitude: 40.8518,
    longitude: 14.2681,
    cityCode: 'NAP',
    popularAirports: ['Naples International (NAP)'],
    mainTrainStation: 'Napoli Centrale',
    defaultDescription: 'Birthplace of authentic Neapolitan pizza, gateway to Pompeii, Mount Vesuvius, and the Amalfi Coast.',
  },
  bologna: {
    name: 'Bologna',
    country: 'Italy',
    latitude: 44.4949,
    longitude: 11.3426,
    cityCode: 'BLQ',
    popularAirports: ['Bologna Guglielmo Marconi (BLQ)'],
    mainTrainStation: 'Bologna Centrale',
    defaultDescription: 'Culinary heart of Italy boasting medieval covered porticoes, leaning towers, and world-class pasta.',
  },
  // Germany & Central Europe
  frankfurt: {
    name: 'Frankfurt',
    country: 'Germany',
    latitude: 50.1109,
    longitude: 8.6821,
    cityCode: 'FRA',
    popularAirports: ['Frankfurt Airport (FRA)'],
    mainTrainStation: 'Frankfurt (Main) Hauptbahnhof',
    defaultDescription: 'Major central European railway and financial crossroads on the Main River with historic Römerberg.',
  },
  cologne: {
    name: 'Cologne',
    country: 'Germany',
    latitude: 50.9375,
    longitude: 6.9603,
    cityCode: 'CGN',
    popularAirports: ['Cologne Bonn Airport (CGN)'],
    mainTrainStation: 'Köln Hauptbahnhof',
    defaultDescription: 'Historic Rhineland metropolis dominated by its twin-spire UNESCO Gothic Cathedral beside the river.',
  },
  salzburg: {
    name: 'Salzburg',
    country: 'Austria',
    latitude: 47.8095,
    longitude: 13.0550,
    cityCode: 'SZG',
    popularAirports: ['Salzburg Airport (SZG)', 'Munich Airport (MUC)'],
    mainTrainStation: 'Salzburg Hauptbahnhof',
    defaultDescription: 'Mozart’s picturesque baroque birthplace crowned by the cliffside Hohensalzburg Fortress.',
  },
  geneva: {
    name: 'Geneva',
    country: 'Switzerland',
    latitude: 46.2044,
    longitude: 6.1432,
    cityCode: 'GVA',
    popularAirports: ['Geneva Airport (GVA)'],
    mainTrainStation: 'Genève Cornavin',
    defaultDescription: 'Scenic diplomatic and banking capital set beside Lake Geneva with panoramic alpine vistas.',
  },
  rotterdam: {
    name: 'Rotterdam',
    country: 'Netherlands',
    latitude: 51.9244,
    longitude: 4.4777,
    cityCode: 'RTM',
    popularAirports: ['Rotterdam The Hague Airport (RTM)', 'Amsterdam Schiphol (AMS)'],
    mainTrainStation: 'Rotterdam Centraal',
    defaultDescription: 'Bold architectural laboratory featuring futuristic skyline, cubic houses, and Europe’s largest port.',
  },
  edinburgh: {
    name: 'Edinburgh',
    country: 'United Kingdom',
    latitude: 55.9533,
    longitude: -3.1883,
    cityCode: 'EDI',
    popularAirports: ['Edinburgh Airport (EDI)'],
    mainTrainStation: 'Edinburgh Waverley',
    defaultDescription: 'Atmospheric Scottish capital with dramatic volcanic crags, medieval Royal Mile, and Edinburgh Castle.',
  },
  dublin: {
    name: 'Dublin',
    country: 'Ireland',
    latitude: 53.3498,
    longitude: -6.2603,
    cityCode: 'DUB',
    popularAirports: ['Dublin Airport (DUB)'],
    mainTrainStation: 'Dublin Heuston / Connolly',
    defaultDescription: 'Warm, literary Irish capital famed for Trinity College, Georgian brick squares, and Temple Bar music.',
  },
  // Scandinavia & Nordic Capitals
  copenhagen: {
    name: 'Copenhagen',
    country: 'Denmark',
    latitude: 55.6761,
    longitude: 12.5683,
    cityCode: 'CPH',
    popularAirports: ['Copenhagen Airport, Kastrup (CPH)'],
    mainTrainStation: 'København H (Copenhagen Central)',
    defaultDescription: 'Enchanting Danish capital famed for Nyhavn colorful townhouses, Tivoli Gardens, and cycling culture.',
  },
  malmo: {
    name: 'Malmö',
    country: 'Sweden',
    latitude: 55.6050,
    longitude: 13.0038,
    cityCode: 'MMX',
    popularAirports: ['Malmö Airport (MMX)', 'Copenhagen Airport (CPH)'],
    mainTrainStation: 'Malmö Centralstation',
    defaultDescription: 'Cosmopolitan southern Swedish coastal city linked to Copenhagen across the scenic Øresund Bridge.',
  },
  stockholm: {
    name: 'Stockholm',
    country: 'Sweden',
    latitude: 59.3293,
    longitude: 18.0686,
    cityCode: 'ARN',
    popularAirports: ['Stockholm Arlanda (ARN)', 'Bromma (BMA)'],
    mainTrainStation: 'Stockholm Centralstation',
    defaultDescription: 'Nordic capital built across 14 islands, celebrated for Gamla Stan, waterways, and world-class design.',
  },
  gothenburg: {
    name: 'Gothenburg',
    country: 'Sweden',
    latitude: 57.7089,
    longitude: 11.9746,
    cityCode: 'GOT',
    popularAirports: ['Göteborg Landvetter (GOT)'],
    mainTrainStation: 'Göteborg Centralstation',
    defaultDescription: 'Vibrant Swedish West Coast maritime hub with Dutch-style canals and world-class seafood.',
  },
  oslo: {
    name: 'Oslo',
    country: 'Norway',
    latitude: 59.9139,
    longitude: 10.7522,
    cityCode: 'OSL',
    popularAirports: ['Oslo Airport, Gardermoen (OSL)'],
    mainTrainStation: 'Oslo Sentralstasjon',
    defaultDescription: 'Scenic Norwegian fjord capital blending cutting-edge architecture with lush green forests.',
  },
  bergen: {
    name: 'Bergen',
    country: 'Norway',
    latitude: 60.3913,
    longitude: 5.3221,
    cityCode: 'BGO',
    popularAirports: ['Bergen Flesland (BGO)'],
    mainTrainStation: 'Bergen Stasjon',
    defaultDescription: 'Gateway to the Norwegian fjords with iconic wooden Bryggen wharf and scenic funiculars.',
  },
  helsinki: {
    name: 'Helsinki',
    country: 'Finland',
    latitude: 60.1699,
    longitude: 24.9384,
    cityCode: 'HEL',
    popularAirports: ['Helsinki-Vantaa (HEL)'],
    mainTrainStation: 'Helsingin päärautatieasema',
    defaultDescription: 'Seaside Finnish design capital famous for neoclassical architecture and island fortresses.',
  },
  // Northern Germany & Poland
  hamburg: {
    name: 'Hamburg',
    country: 'Germany',
    latitude: 53.5511,
    longitude: 9.9937,
    cityCode: 'HAM',
    popularAirports: ['Hamburg Airport (HAM)'],
    mainTrainStation: 'Hamburg Hauptbahnhof',
    defaultDescription: 'Major northern German port city with Elbphilharmonie and historic red-brick Speicherstadt district.',
  },
  warsaw: {
    name: 'Warsaw',
    country: 'Poland',
    latitude: 52.2297,
    longitude: 21.0122,
    cityCode: 'WAW',
    popularAirports: ['Warsaw Chopin (WAW)'],
    mainTrainStation: 'Warszawa Centralna',
    defaultDescription: 'Dynamic Polish capital with restored historic Old Town, Royal Castle, and bustling cultural scene.',
  },
  krakow: {
    name: 'Krakow',
    country: 'Poland',
    latitude: 50.0647,
    longitude: 19.9450,
    cityCode: 'KRK',
    popularAirports: ['Kraków John Paul II (KRK)'],
    mainTrainStation: 'Kraków Główny',
    defaultDescription: 'Historic Polish gem boasting Wawel Castle, Europe’s largest medieval market square, and Kazimierz quarter.',
  },
};

/**
 * Calculates great-circle distance between two points in kilometers using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const SPANISH_CITY_ALIASES: Record<string, string> = {
  brujas: 'bruges',
  bruselas: 'brussels',
  gante: 'ghent',
  amberes: 'antwerp',
  niza: 'nice',
  burdeos: 'bordeaux',
  estrasburgo: 'strasbourg',
  marsella: 'marseille',
  venecia: 'venice',
  milan: 'milan',
  napoles: 'naples',
  bolonia: 'bologna',
  francfort: 'frankfurt',
  colonia: 'cologne',
  salzburgo: 'salzburg',
  ginebra: 'geneva',
  roterdam: 'rotterdam',
  edimburgo: 'edinburgh',
  lisboa: 'lisbon',
  florencia: 'florence',
  viena: 'vienna',
  praga: 'prague',
  berlin: 'berlin',
  amsterdam: 'amsterdam',
  londres: 'london',
  paris: 'paris',
  munich: 'munich',
  oporto: 'porto',
  sevilla: 'seville',
  atenas: 'athens',
  nuevayork: 'new_york',
  tokio: 'tokyo',
  kioto: 'kyoto',
  croacia: 'dubrovnik',
  // Scandinavia & Poland
  copenhague: 'copenhagen',
  kobenhavn: 'copenhagen',
  malmo: 'malmo',
  malmoe: 'malmo',
  estocolmo: 'stockholm',
  gotemburgo: 'gothenburg',
  goteborg: 'gothenburg',
  hamburgo: 'hamburg',
  varsovia: 'warsaw',
  cracovia: 'krakow',
};

/**
 * Maps country names to their primary travel gateway city and country name
 */
export const COUNTRY_HUBS: Record<string, { cityKey: string; countryName: string }> = {
  belgica: { cityKey: 'brussels', countryName: 'Belgium' },
  belgium: { cityKey: 'brussels', countryName: 'Belgium' },
  holanda: { cityKey: 'amsterdam', countryName: 'Netherlands' },
  paisesbajos: { cityKey: 'amsterdam', countryName: 'Netherlands' },
  netherlands: { cityKey: 'amsterdam', countryName: 'Netherlands' },
  suiza: { cityKey: 'zurich', countryName: 'Switzerland' },
  switzerland: { cityKey: 'zurich', countryName: 'Switzerland' },
  croacia: { cityKey: 'dubrovnik', countryName: 'Croatia' },
  croatia: { cityKey: 'dubrovnik', countryName: 'Croatia' },
  dinamarca: { cityKey: 'copenhagen', countryName: 'Denmark' },
  denmark: { cityKey: 'copenhagen', countryName: 'Denmark' },
  suecia: { cityKey: 'stockholm', countryName: 'Sweden' },
  sweden: { cityKey: 'stockholm', countryName: 'Sweden' },
  noruega: { cityKey: 'oslo', countryName: 'Norway' },
  norway: { cityKey: 'oslo', countryName: 'Norway' },
  finlandia: { cityKey: 'helsinki', countryName: 'Finland' },
  finland: { cityKey: 'helsinki', countryName: 'Finland' },
  polonia: { cityKey: 'warsaw', countryName: 'Poland' },
  poland: { cityKey: 'warsaw', countryName: 'Poland' },
  espana: { cityKey: 'madrid', countryName: 'Spain' },
  spain: { cityKey: 'madrid', countryName: 'Spain' },
  francia: { cityKey: 'paris', countryName: 'France' },
  france: { cityKey: 'paris', countryName: 'France' },
  italia: { cityKey: 'rome', countryName: 'Italy' },
  italy: { cityKey: 'rome', countryName: 'Italy' },
  alemania: { cityKey: 'berlin', countryName: 'Germany' },
  germany: { cityKey: 'berlin', countryName: 'Germany' },
  portugal: { cityKey: 'lisbon', countryName: 'Portugal' },
  reunounido: { cityKey: 'london', countryName: 'United Kingdom' },
  unitedkingdom: { cityKey: 'london', countryName: 'United Kingdom' },
  inglaterra: { cityKey: 'london', countryName: 'United Kingdom' },
  england: { cityKey: 'london', countryName: 'United Kingdom' },
  escocia: { cityKey: 'edinburgh', countryName: 'United Kingdom' },
  scotland: { cityKey: 'edinburgh', countryName: 'United Kingdom' },
  irlanda: { cityKey: 'dublin', countryName: 'Ireland' },
  ireland: { cityKey: 'dublin', countryName: 'Ireland' },
  austria: { cityKey: 'vienna', countryName: 'Austria' },
  republicacheca: { cityKey: 'prague', countryName: 'Czech Republic' },
  czechrepublic: { cityKey: 'prague', countryName: 'Czech Republic' },
  hungria: { cityKey: 'budapest', countryName: 'Hungary' },
  hungary: { cityKey: 'budapest', countryName: 'Hungary' },
  grecia: { cityKey: 'athens', countryName: 'Greece' },
  greece: { cityKey: 'athens', countryName: 'Greece' },
  japon: { cityKey: 'tokyo', countryName: 'Japan' },
  japan: { cityKey: 'tokyo', countryName: 'Japan' },
};

/**
 * Resolves a city name to Location with coordinates.
 * Looks up local database first, checks aliases and country mappings,
 * and falls back to a 100% deterministic coordinate without Math.random.
 */
export function resolveLocation(cityName: string, country?: string): Location {
  const trimmed = cityName.trim();
  const normalized = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const cleanKey = normalized.replace(/[^a-z]/g, '');
  const aliasKey = SPANISH_CITY_ALIASES[cleanKey] || cleanKey;

  // 1. Direct match on CITY_HUBS key (alias or clean)
  if (CITY_HUBS[aliasKey]) {
    const hub = CITY_HUBS[aliasKey];
    return {
      name: hub.name,
      country: hub.country,
      latitude: hub.latitude,
      longitude: hub.longitude,
      cityCode: hub.cityCode,
    };
  }

  if (CITY_HUBS[cleanKey]) {
    const hub = CITY_HUBS[cleanKey];
    return {
      name: hub.name,
      country: hub.country,
      latitude: hub.latitude,
      longitude: hub.longitude,
      cityCode: hub.cityCode,
    };
  }

  // 2. Direct match on country name (e.g. "Bélgica" -> Brussels, Belgium)
  if (COUNTRY_HUBS[cleanKey]) {
    const cMap = COUNTRY_HUBS[cleanKey];
    const hub = CITY_HUBS[cMap.cityKey];
    if (hub) {
      return {
        name: hub.name,
        country: cMap.countryName,
        latitude: hub.latitude,
        longitude: hub.longitude,
        cityCode: hub.cityCode,
      };
    }
  }

  // 3. Exact match against official hub.name
  for (const hub of Object.values(CITY_HUBS)) {
    const hNorm = hub.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (hNorm === normalized || hub.name.toLowerCase() === trimmed.toLowerCase()) {
      return {
        name: hub.name,
        country: hub.country,
        latitude: hub.latitude,
        longitude: hub.longitude,
        cityCode: hub.cityCode,
      };
    }
  }

  // 4. Check persistent geocoding cache (previously resolved cities from Nominatim/Mapbox)
  const cached = getCachedLocation(trimmed);
  if (cached) {
    return {
      name: cached.name || trimmed,
      country: cached.country || country || 'Europe',
      latitude: cached.latitude,
      longitude: cached.longitude,
      cityCode: cached.cityCode,
    };
  }

  // 5. Safe substring match for longer city names (min 4 chars to prevent false matches)
  if (cleanKey.length >= 4) {
    for (const hub of Object.values(CITY_HUBS)) {
      const hNorm = hub.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const hClean = hNorm.replace(/[^a-z]/g, '');
      if (hClean === cleanKey || (cleanKey.length >= 5 && hClean.startsWith(cleanKey))) {
        return {
          name: hub.name,
          country: hub.country,
          latitude: hub.latitude,
          longitude: hub.longitude,
          cityCode: hub.cityCode,
        };
      }
    }
  }

  // 6. Deterministic fallback (ZERO Math.random!)
  // Computes a stable coordinate so the same city always renders in the exact same spot.
  // If a recognized country is provided, center around that country's capital/hub!
  let baseLat = 48.5;
  let baseLon = 9.5;
  if (country) {
    const cNorm = country.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    if (COUNTRY_HUBS[cNorm]) {
      const cHub = CITY_HUBS[COUNTRY_HUBS[cNorm].cityKey];
      if (cHub) {
        baseLat = cHub.latitude;
        baseLon = cHub.longitude;
      }
    }
  }

  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const deterministicLatOffset = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 2;
  const deterministicLonOffset = ((Math.abs(hash >> 3) % 1000) / 1000 - 0.5) * 3;

  return {
    name: trimmed,
    country: country || 'Europe',
    latitude: +(baseLat + deterministicLatOffset).toFixed(4),
    longitude: +(baseLon + deterministicLonOffset).toFixed(4),
  };
}

/**
 * Asynchronously resolves a location.
 * Checks local database (0ms), checks cache (0ms),
 * and queries the active remote geocoding provider (Nominatim by default)
 * if not already cached. Persists result to cache for instant future lookups.
 */
export async function resolveLocationAsync(cityName: string, country?: string): Promise<Location> {
  const trimmed = cityName.trim();
  if (!trimmed) {
    return resolveLocation(cityName, country);
  }

  // Fast-path: check if it's already a known hub or already in cache
  const normalizedKey = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  const aliasKey = SPANISH_CITY_ALIASES[normalizedKey] || normalizedKey;

  if (CITY_HUBS[aliasKey] || CITY_HUBS[normalizedKey] || COUNTRY_HUBS[normalizedKey]) {
    return resolveLocation(trimmed, country);
  }

  const cached = getCachedLocation(trimmed);
  if (cached) {
    return cached;
  }

  // Try remote provider (Nominatim by default)
  try {
    const provider = getActiveGeocodingProvider();
    const results = await provider.search(trimmed, { limit: 1 });
    if (results && results.length > 0) {
      const best = results[0];
      const resolved: Location = {
        name: best.name || trimmed,
        country: best.country || country || 'Europe',
        latitude: best.latitude,
        longitude: best.longitude,
      };
      saveCachedLocation(trimmed, resolved);
      return resolved;
    }
  } catch (err) {
    console.warn(`[Geocoding] Remote lookup failed for "${trimmed}", using deterministic fallback:`, err);
  }

  return resolveLocation(trimmed, country);
}

/**
 * Searches locations matching a query string.
 * Combines instant local database matches with active remote geocoder (Nominatim/Mapbox/OpenCage).
 */
export async function searchLocations(
  query: string,
  options?: GeocodingOptions
): Promise<GeocodingSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const limit = options?.limit || 6;
  const results: GeocodingSearchResult[] = [];
  const seenKeys = new Set<string>();

  const addResult = (res: GeocodingSearchResult) => {
    const key = `${res.name.toLowerCase()}-${res.country.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(res);
    }
  };

  const normQuery = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Check local hubs & aliases
  for (const [key, hub] of Object.entries(CITY_HUBS)) {
    const hubNorm = hub.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (key.startsWith(normQuery) || hubNorm.includes(normQuery)) {
      addResult({
        id: `local-${key}`,
        name: hub.name,
        displayName: `${hub.name}, ${hub.country}`,
        country: hub.country,
        latitude: hub.latitude,
        longitude: hub.longitude,
        cityCode: hub.cityCode,
        provider: 'local',
        confidence: key === normQuery || hubNorm === normQuery ? 1.0 : 0.9,
      });
    }
    if (results.length >= limit) break;
  }

  // 2. Check cached locations
  const cachedAll = getAllCachedLocations();
  for (const [key, loc] of Object.entries(cachedAll)) {
    if (key.includes(normQuery) || loc.name.toLowerCase().includes(normQuery)) {
      addResult({
        id: `cache-${key}`,
        name: loc.name,
        displayName: `${loc.name}, ${loc.country || ''}`,
        country: loc.country || 'Unknown',
        latitude: loc.latitude ?? 0,
        longitude: loc.longitude ?? 0,
        provider: 'local',
        confidence: 0.95,
      });
    }
    if (results.length >= limit) break;
  }

  // 3. Query remote provider if results are below limit
  if (results.length < limit) {
    try {
      const provider = getActiveGeocodingProvider();
      const remoteResults = await provider.search(trimmed, {
        limit: limit - results.length + 2,
        language: options?.language,
        countryCode: options?.countryCode,
      });
      for (const remote of remoteResults) {
        addResult(remote);
        saveCachedLocation(remote.name, {
          name: remote.name,
          country: remote.country,
          latitude: remote.latitude,
          longitude: remote.longitude,
        });
        if (results.length >= limit) break;
      }
    } catch (err) {
      console.warn('[Geocoding Search] Remote search error:', err);
    }
  }

  return results.slice(0, limit);
}


/**
 * Recommends optimal transport mode and duration based on distance and preferences
 */
export function estimateTransportation(
  from: Location,
  to: Location,
  preferTrain = true
): { mode: TransportMode; durationMinutes: number; distanceKm: number; description: string } {
  if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) {
    return {
      mode: 'train',
      durationMinutes: 180,
      distanceKm: 300,
      description: 'Estimated rail transit',
    };
  }

  const dist = calculateDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);

  // Sea crossing / island check
  const isIslandOrWaterHop =
    (from.name === 'Athens' && to.name === 'Rome') ||
    (from.name === 'London' && to.name === 'Lisbon');

  if (dist > 750 || (dist > 500 && !preferTrain) || isIslandOrWaterHop) {
    // Flight
    // Flight time: approx 45m taxi/takeoff/landing + dist / 750kmh
    const airTime = Math.round(45 + (dist / 750) * 60);
    return {
      mode: 'flight',
      durationMinutes: airTime,
      distanceKm: dist,
      description: `Direct or short-hop flight (~${Math.floor(airTime / 60)}h ${airTime % 60}m)`,
    };
  } else if (dist <= 120) {
    // Short train or regional bus/car
    const trainTime = Math.round(20 + (dist / 120) * 60);
    return {
      mode: 'train',
      durationMinutes: trainTime,
      distanceKm: dist,
      description: `Regional high-speed train (~${Math.floor(trainTime / 60)}h ${trainTime % 60}m)`,
    };
  } else {
    // Medium-distance train (European High-Speed Rail e.g. TGV, ICE, Frecciarossa, AVE, Railjet)
    const trainTime = Math.round(30 + (dist / 150) * 60);
    return {
      mode: 'train',
      durationMinutes: trainTime,
      distanceKm: dist,
      description: `Express intercity / high-speed rail (~${Math.floor(trainTime / 60)}h ${trainTime % 60}m)`,
    };
  }
}
