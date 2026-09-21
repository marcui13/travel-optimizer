# Travel Optimizer — Resumen de Contexto & Plan para React Native

Este documento resume el estado actual del proyecto **Travel Optimizer**, su arquitectura, decisiones tomadas y la hoja de ruta para la creación/migración de la versión móvil en **React Native / Expo**.

---

## 1. Contexto del Proyecto

* **Repositorio**: `https://github.com/marcui13/travel-optimizer.git` (rama `main`).
* **Deploy Web**: `https://travel-optimizer-tau.vercel.app/`
* **Stack Web Actual**: React 18, TypeScript, Vite, Tailwind CSS, date-fns, lucide-react, react-leaflet.
* **Calidad**: 91 tests automatizados con Vitest (`npm test -- --run`) y compilación limpia con TypeScript (`npm run build`).
* **ID de Conversación Previa**: `conversation://272b5d77-c13a-4868-801b-6764f60e529d`

---

## 2. Arquitectura & Componentes Reutilizables (~70% del código)

Toda la lógica de dominio y servicios es TypeScript puro y es 100% portable a React Native:

1. **Modelos de Dominio (`src/domain/`)**:
   - `types.ts`: Interfaces (`Trip`, `Destination`, `TransportationSegment`, `Constraint`, `TravelPreferences`, `ValidationIssue`).
   - `tripHelpers.ts`: Construcción de itinerarios (`buildItineraryFromDestinations`), reseteo con edición de campos iniciales (`resetTripWithCustomParams`), cálculo de noches y fechas.
   - `statistics.ts`: Métricas de viaje (km totales, tiempo de tránsito, mudanzas de hotel, paradas).
   - `tripDefaults.ts`: Viajes de muestra (Golden Route Japón, Gran Tour Europa).

2. **Servicios de Inteligencia y Algoritmos (`src/services/`)**:
   - `optimization/optimizer.ts`: Algoritmos de ordenamiento y heurísticas de ruta.
   - `ai/`: Cliente multiproveedor (`aiClient.ts`), escenarios What-If en lenguaje natural (`whatIfEngine.ts`), generador local heurístico (`localAiPlanner.ts`).
   - `geocoding/`: Resolución de coordenadas vía Nominatim / OpenStreetMap con fallback determinista y caché (`geocodingService.ts`).
   - `sharing/shareService.ts`: Serialización comprimida LZString / URL de viajes.
   - `collaboration/collabEngine.ts`: Motor colaborativo en tiempo real.

3. **Internacionalización (`src/i18n/`)**:
   - Diccionarios completos en Español (`esTranslations`) e Inglés (`enTranslations`).

---

## 3. Hoja de Ruta para React Native (Mobile)

### Stack Móvil Recomendado:
- **Framework**: **Expo (SDK 51+)** con **Expo Router** (file-based navigation).
- **Estilos**: **NativeWind v4** (Tailwind CSS adaptado a React Native primitives: `<View>`, `<Text>`).
- **Mapas**: **`react-native-maps`** (Apple Maps en iOS / Google Maps en Android) o **`@rnmapbox/maps`**.
- **Iconos**: **`lucide-react-native`** (mismos iconos que en web).
- **Almacenamiento Local**: **`react-native-mmkv`** (reemplazo de `localStorage`, sincrónico y ultrarrápido).
- **Hojas Deslizables / Bottom Sheets**: **`@gorhom/react-native-bottom-sheet`**.
- **Gestos y Animaciones**: `react-native-gesture-handler` y `react-native-reanimated`.

---

## 4. Estrategia de Implementación

1. **Opción A (Nueva App Expo en subcarpeta o repo)**:
   - Crear la app móvil `travel-optimizer-mobile`.
   - Enlazar o copiar las carpetas `domain/`, `services/` y `i18n/`.
   - Construir las 3 pantallas clave:
     1. **Timeline / Itinerario** (Lista fluida con `FlashList` o `FlatList`).
     2. **Mapa de Ruta** (Pines de paradas y líneas de tránsito nativas).
     3. **Asistente & Logística** (Chat de escenarios y optimización).
2. **Opción B (Monorepo Turborepo)**:
   - Extraer `packages/core` con la lógica compartida.
   - Mantener `apps/web` y `apps/mobile` sincronizados con el mismo motor.
