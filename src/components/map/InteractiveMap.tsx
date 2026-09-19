import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Destination,
  TransportationSegment,
  OptimizationResult,
} from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import {
  Compass,
  Maximize2,
  Plane,
  Train,
  Car,
  Bus,
  Clock,
  Navigation,
  Info,
} from 'lucide-react';

interface InteractiveMapProps {
  destinations: Destination[];
  transportation: TransportationSegment[];
  selectedDestinationId?: string | null;
  selectedSegmentId?: string | null;
  selectedDayDate?: string | null;
  optimizationResult?: OptimizationResult | null;
  showOptimizationDiff?: boolean;
  onSelectDestination?: (destinationId: string) => void;
  onSelectSegment?: (segmentId: string) => void;
  onClearSelection?: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  destinations,
  transportation,
  selectedDestinationId,
  selectedSegmentId,
  selectedDayDate: _selectedDayDate,
  optimizationResult,
  showOptimizationDiff = false,
  onSelectDestination,
  onSelectSegment,
  onClearSelection,
}) => {
  const { t } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const comparisonLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeSegmentDetails, setActiveSegmentDetails] = useState<TransportationSegment | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [48.8566, 12.3522], // Central Europe
      zoom: 4,
      minZoom: 3,
      maxZoom: 14,
    });

    // Clean, high-contrast OpenStreetMap tiles with zero watermark
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const routesGroup = L.layerGroup().addTo(map);
    const compGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routesLayerRef.current = routesGroup;
    comparisonLayerRef.current = compGroup;
    mapInstanceRef.current = map;

    // Observe container resizing (e.g. view switch between split and full map)
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Ensure map tiles render when switching views or after DOM calculation
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers and Routes whenever destinations, transportation or selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routesGroup = routesLayerRef.current;
    const compGroup = comparisonLayerRef.current;

    if (!map || !markersGroup || !routesGroup || !compGroup) return;

    markersGroup.clearLayers();
    routesGroup.clearLayers();
    compGroup.clearLayers();

    const validDestinations = destinations.filter(
      (d) => d.location?.latitude != null && d.location?.longitude != null
    );

    if (validDestinations.length === 0) return;

    // 1. Render Destination Markers
    validDestinations.forEach((dest, index) => {
      const isSelected = dest.id === selectedDestinationId;
      const lat = dest.location.latitude!;
      const lng = dest.location.longitude!;
      const seq = String(index + 1).padStart(2, '0');
      const nights = dest.plannedNights || 2;

      // 1.1 Precise Geographic Center Anchor Dot
      const centerDot = L.circleMarker([lat, lng], {
        radius: isSelected ? 6 : 4,
        color: isSelected ? '#ffffff' : '#059669',
        fillColor: isSelected ? '#10b981' : '#34d399',
        fillOpacity: 1,
        weight: isSelected ? 3 : 2,
        pane: 'markerPane',
      });
      centerDot.on('click', () => {
        onSelectDestination?.(dest.id);
      });
      markersGroup.addLayer(centerDot);

      // 1.2 Badge Pin mathematically centered on the exact coordinate (0, 0)
      const markerHtml = `
        <div style="position: absolute; bottom: 0; left: 0; transform: translate(-50%, -8px); display: flex; flex-direction: column; align-items: center; white-space: nowrap; pointer-events: none;">
          <div class="pointer-events-auto cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-md shadow-md border text-xs font-medium transition-all duration-150 ${
            isSelected
              ? 'bg-emerald-700 text-white border-emerald-400 ring-2 ring-emerald-500/30 scale-105 z-50'
              : 'bg-slate-900 text-slate-100 border-slate-700 hover:border-slate-500 z-10'
          }">
            <span class="flex items-center justify-center px-1 rounded font-mono font-semibold ${
              isSelected ? 'bg-white text-emerald-800' : 'bg-slate-800 text-emerald-400 border border-slate-700'
            } text-[10px]">
              ${seq}
            </span>
            <span class="tracking-tight font-medium">${dest.name}</span>
            <span class="text-[10px] font-mono px-1 py-0.2 rounded ${
              isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400 border border-slate-700/60'
            }">
              ${nights}n
            </span>
          </div>
          <!-- Exact Pointer Caret anchored to (0, 0) -->
          <div class="w-2 h-2 -mt-1 rotate-45 border-r border-b ${
            isSelected ? 'bg-emerald-700 border-emerald-400' : 'bg-slate-900 border-slate-700'
          }"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-pin-container',
        html: markerHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });
      marker.on('click', () => {
        onSelectDestination?.(dest.id);
      });

      markersGroup.addLayer(marker);
    });

    // 2. Render Route Segments
    transportation.forEach((seg) => {
      if (
        seg.from?.latitude == null ||
        seg.from?.longitude == null ||
        seg.to?.latitude == null ||
        seg.to?.longitude == null
      ) {
        return;
      }

      const isSelected = seg.id === selectedSegmentId;
      const isFlight = seg.mode === 'flight';
      const isTrain = seg.mode === 'train';

      // Generate curved great-circle arc points for flights
      const points: [number, number][] = isFlight
        ? generateArcCoordinates(
            [seg.from.latitude, seg.from.longitude],
            [seg.to.latitude, seg.to.longitude],
            18
          )
        : [
            [seg.from.latitude, seg.from.longitude],
            [seg.to.latitude, seg.to.longitude],
          ];

      const polyline = L.polyline(points, {
        color: isSelected
          ? '#10b981'
          : isFlight
          ? '#3b82f6'
          : isTrain
          ? '#10b981'
          : '#f59e0b',
        weight: isSelected ? 5 : isFlight ? 3 : 4,
        opacity: isSelected ? 1.0 : 0.75,
        dashArray: isFlight ? '6, 8' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      });

      polyline.on('click', () => {
        setActiveSegmentDetails(seg);
        onSelectSegment?.(seg.id);
      });

      polyline.on('mouseover', () => {
        polyline.setStyle({ weight: 6, opacity: 1.0 });
      });

      polyline.on('mouseout', () => {
        if (!isSelected) {
          polyline.setStyle({ weight: isFlight ? 3 : 4, opacity: 0.75 });
        }
      });

      routesGroup.addLayer(polyline);
    });

    // 3. Render Optimization Comparison Diff if active
    if (
      showOptimizationDiff &&
      optimizationResult?.proposedDestinations &&
      optimizationResult.proposedDestinations.length > 1
    ) {
      const proposed = optimizationResult.proposedDestinations.filter(
        (d) => d.location?.latitude != null && d.location?.longitude != null
      );

      const proposedPoints: [number, number][] = proposed.map((d) => [
        d.location.latitude!,
        d.location.longitude!,
      ]);

      const compLine = L.polyline(proposedPoints, {
        color: '#f43f5e',
        weight: 3,
        dashArray: '4, 6',
        opacity: 0.9,
      });

      compGroup.addLayer(compLine);
    }

    // Fit bounds smoothly on first load or selection
    if (selectedDestinationId) {
      const target = validDestinations.find((d) => d.id === selectedDestinationId);
      if (target?.location?.latitude && target.location?.longitude) {
        map.flyTo([target.location.latitude, target.location.longitude], 7, {
          duration: 1.0,
        });
      }
    }
  }, [
    destinations,
    transportation,
    selectedDestinationId,
    selectedSegmentId,
    showOptimizationDiff,
    optimizationResult,
    onSelectDestination,
    onSelectSegment,
  ]);

  const fitAllRoutes = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const validDests = destinations.filter(
      (d) => d.location?.latitude != null && d.location?.longitude != null
    );
    if (validDests.length === 0) return;

    const bounds = L.latLngBounds(
      validDests.map((d) => [d.location.latitude!, d.location.longitude!])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8, animate: true });
    onClearSelection?.();
    setActiveSegmentDetails(null);
  };

  return (
    <div className="relative w-full h-full min-h-[380px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex flex-col">
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left Map Controls & Indicators */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 shadow flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
          <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-200">
            {destinations.length} {t.common.stops}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">
            {transportation.length} {t.common.connections}
          </span>
        </div>

        <button
          onClick={fitAllRoutes}
          title={t.map.fullRoute}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md shadow text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-colors font-medium"
        >
          <Maximize2 className="w-3.5 h-3.5 shrink-0" />
          <span>{t.map.fullRoute}</span>
        </button>

        {showOptimizationDiff && (
          <div className="bg-rose-950/90 border border-rose-800 text-rose-200 rounded-md px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-mono flex items-center gap-1 sm:gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
            <span>{t.map.comparisonActive}</span>
          </div>
        )}
      </div>

      {/* Top Right Map Legend */}
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 shadow text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-emerald-500 rounded-xs inline-block"></span> {t.map.rail}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-blue-400 border-dashed inline-block"></span> {t.map.flight}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2 rounded-full bg-emerald-500 inline-block"></span> {t.map.hub}
        </span>
      </div>

      {/* Route Segment Details Popover */}
      {activeSegmentDetails && (
        <div className="absolute bottom-3 sm:bottom-4 left-3 right-3 sm:right-auto sm:left-4 z-20 max-w-sm sm:w-80 bg-slate-900 border border-slate-700 rounded-lg p-3 sm:p-3.5 shadow-xl animate-fade-in text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-100">
              {activeSegmentDetails.mode === 'flight' ? (
                <Plane className="w-4 h-4 text-sky-400" />
              ) : activeSegmentDetails.mode === 'train' ? (
                <Train className="w-4 h-4 text-emerald-400" />
              ) : activeSegmentDetails.mode === 'bus' ? (
                <Bus className="w-4 h-4 text-amber-400" />
              ) : (
                <Car className="w-4 h-4 text-purple-400" />
              )}
              <span className="capitalize font-medium">
                {activeSegmentDetails.mode} {t.map.transitDetails}
              </span>
            </div>
            <button
              onClick={() => setActiveSegmentDetails(null)}
              className="text-slate-400 hover:text-slate-200 p-0.5 text-sm leading-none"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-200 font-medium">
              <span>{activeSegmentDetails.from.name}</span>
              <span className="text-slate-500 font-mono">→</span>
              <span>{activeSegmentDetails.to.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-400 font-mono text-[11px]">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {Math.floor((activeSegmentDetails.estimatedDurationMinutes || 0) / 60)}h{' '}
                  {(activeSegmentDetails.estimatedDurationMinutes || 0) % 60}m
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-slate-500" />
                <span>{activeSegmentDetails.distanceKm || 0} km</span>
              </div>
            </div>

            {activeSegmentDetails.operatorOrRoute && (
              <div className="pt-1.5 text-slate-300 flex items-start gap-1 text-[11px]">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {activeSegmentDetails.operatorOrRoute}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function generateArcCoordinates(
  start: [number, number],
  end: [number, number],
  pointsCount = 20
): [number, number][] {
  const points: [number, number][] = [];
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  const midLat = (lat1 + lat2) / 2 + Math.abs(lon2 - lon1) * 0.12;
  const midLon = (lon1 + lon2) / 2;

  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * midLat + t * t * lat2;
    const lon = (1 - t) * (1 - t) * lon1 + 2 * (1 - t) * t * midLon + t * t * lon2;
    points.push([lat, lon]);
  }
  return points;
}
