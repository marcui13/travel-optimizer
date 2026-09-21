# Travel Optimizer 🧭✈️

> **AI-Powered Travel Planning, Itinerary Optimization, and Route Visualization Platform.**

Travel Optimizer transforms messy travel information, destinations, dates, reservations, and user preferences into a coherent, visual, realistic, and optimized travel itinerary.

---

### 👨‍💻 Autoría & Desarrollo Agéntico
Este proyecto fue conceptualizado y desarrollado por **[Agustin Marquardt](https://github.com/marcui13)** utilizando **Antigravity** como entorno de desarrollo y asistente de inteligencia artificial, aplicando **buenas prácticas de desarrollo de código agéntico**:
- **Plan-Driven & Spec-Driven Development**: Creación, análisis de impacto y aprobación estructurada de planes técnicos (`implementation_plan.md`) previo a la ejecución de cada cambio.
- **Arquitectura de Dominio Aislada**: Más del 70% del código reside en capas de dominio y servicios puros en TypeScript (`src/domain/`, `src/services/`), completamente desacoplado del DOM y listo para reutilización multiplataforma (Web y React Native).
- **Verificación Continua & Test-Driven**: Suite automatizada de 91 pruebas unitarias con Vitest y verificación estricta de compilación con TypeScript en cada ciclo de trabajo.
- **Human-in-the-Loop & Control de Calidad**: Aprobación humana explícita antes de despliegues y commits, con trazabilidad documentada en bitácoras de auditoría (`walkthrough.md`).

---

## 🌟 Key Architecture & Principles

### The Itinerary is the Primary Artifact
The AI conversation is a control mechanism for understanding and modifying the itinerary. The map and calendar are visual representations of the same underlying itinerary.

### Single Source of Truth
The entire platform is anchored on one canonical structured data model called `Trip`:
```typescript
interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  origin?: Location;
  destinations: Destination[];
  events: Event[];
  reservations: Reservation[];
  transportation: TransportationSegment[];
  constraints: Constraint[];
  preferences: TravelPreferences;
  itinerary: Itinerary;
}
```

```text
                         ┌───────────────┐
                         │    USER       │
                         │ text / image  │
                         │ dates / data  │
                         └───────┬───────┘
                                 ↓
                       ┌───────────────────┐
                       │    TRIP MODEL     │
                       │  Source of Truth  │
                       └─────────┬─────────┘
                                 ↓
                ┌────────────────┴────────────────┐
                ↓                                 ↓
        ┌───────────────┐                 ┌───────────────┐
        │ AI / PLANNER  │                 │  VALIDATOR    │
        └───────┬───────┘                 └───────┬───────┘
                └────────────────┬─────────────────┘
                                 ↓
                       ┌───────────────────┐
                       │     ITINERARY     │
                       └─────────┬─────────┘
                                 ↓
              ┌──────────────────┼──────────────────┐
              ↓                  ↓                  ↓
          🗺️ MAP             📅 CALENDAR        🧭 TIMELINE
```

---

## ✨ Features

1. **Interactive Map & Route Visualization**:
   - Geodesic flight arcs, high-speed rail lines, and styled bus/car segments.
   - Numbered sequence markers (① Lisbon, ② Madrid...) with stay durations.
   - Interactive segment details popover with duration, distance, and transfer notes.
   - Optimization diff comparison line (Current route vs Proposed route).
   - Fit-to-route zoom controls and bidirectional synchronization with Timeline.

2. **Deterministic Validation Engine**:
   - Evaluates schedule feasibility without relying on an LLM for pure date math.
   - Detects impossible schedules (e.g. activity at 11:00 when transit arrives at 14:30).
   - Verifies hard constraints (e.g. mandatory arrival in Amsterdam by Oct 20).
   - Detects event time overlaps, date gaps, duplicate destinations, and geographic backtracking.

3. **Multi-Profile Optimization Engine**:
   - **EFFICIENT**: 2-opt TSP route sequencing to eliminate backtracking and reduce travel time/distance.
   - **BALANCED**: Balances transit efficiency with healthy stay durations (2–3 nights per destination).
   - **RELAXED**: Consolidates stays into major cultural capitals (3+ nights), adds free time, and reduces hotel transfers.
   - Before/After comparison modal with metrics diff and map overlay preview before applying.

4. **Contextual AI Assistant & What-If Mode**:
   - Understands current trip state and offers actionable suggestions with `[Apply]`.
   - Conversational modifications: *"Add Vienna"*, *"Remove Berlin"*, *"Give me 2 more days in Italy"*, *"Make it more relaxed"*, *"I prefer trains only"*, *"Can I fit Croatia?"*.
   - Explains trade-offs and updates the canonical `Trip` object iteratively.

5. **Multimodal Screenshot / Document Ingestion**:
   - Ingests flight tickets, hotel vouchers, train passes, and Google Calendar screenshots.
   - **Input Review Step**: *"I found N travel-related events. Please confirm before adding them to your trip."*
   - Editable fields and confidence markers (`high`, `medium`, `low`).

6. **Dual-Layer Intelligence (Zero-Config + Optional Gemini API)**:
   - Works 100% out of the box with zero external configuration using the built-in local heuristic NLP planner and vision simulator.
   - Optional integration with Google Gemini (1.5 Flash, 2.0 Flash, 2.5 Flash, Pro) via user-provided API key stored securely in `localStorage`.

7. **Timeline & Calendar Views**:
   - Day-by-day chronological feed with transit badges, hotel check-ins, scheduled activities, and confidence badges.
   - Monthly/weekly calendar grid showing stay spans, travel days, and fixed event commitments.

8. **Hard vs Soft Constraints Manager**:
   - Clear distinction between hard constraints (non-negotiable commitments) and soft preferences.
   - Travel pacing styles: Relaxed, Balanced, Intense.

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (tested on v22.16.0)
- npm or yarn

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
Navigate to `http://localhost:5173`.

### Running Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## 🏛️ Code Architecture

```text
src/
├── domain/                  # Single source of truth & business logic
│   ├── types.ts             # Strongly typed Trip, Destination, Event, etc.
│   ├── tripHelpers.ts       # Date generator, itinerary builder, day sequence
│   ├── tripDefaults.ts      # 25-day European Grand Tour canonical sample
│   ├── validation.ts        # 100% deterministic validator (conflicts, overlaps)
│   └── statistics.ts        # Deterministic Haversine distance, travel time, hotel moves
│
├── services/
│   ├── geocoding/           # 150+ offline city hubs, Haversine, transit estimation
│   ├── optimization/        # Hybrid 2-opt TSP optimizer & profiles (Efficient, Balanced, Relaxed)
│   └── ai/                  # Dual AI engine: Local NLP planner, Vision extractor, What-If engine, Gemini SDK
│
├── components/
│   ├── layout/              # Header, StatsBar
│   ├── map/                 # Interactive Leaflet map with custom HTML markers & arcs
│   ├── itinerary/           # Chronological Timeline & Constraints panel
│   ├── calendar/            # Month/week grid view
│   ├── assistant/           # Contextual AI assistant with What-If suggestions
│   └── modals/              # CreateTripModal, ImageUploadModal, ReviewExtractedModal, OptimizationDiffModal, SettingsModal
│
└── App.tsx                  # Root reactive coordinator with Undo/Redo & LocalStorage persistence
```

---

## 👨‍💻 Autor & Créditos

* **Desarrollador**: [Agustin Marquardt](https://github.com/marcui13)
* **Entorno de Desarrollo & Asistente IA**: **Antigravity** (Google DeepMind)
* **Filosofía**: *"Trust the Detour"* — Herramienta editorial de expedición y logística de viajes real, diseñada para humanos.

