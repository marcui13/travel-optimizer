import { Event, Reservation, ConfidenceLevel } from '../../domain/types';
import { resolveLocation } from '../geocoding/geocodingService';

export interface ExtractedTravelItem {
  id: string;
  type: 'flight' | 'train' | 'hotel' | 'activity' | 'event';
  title: string;
  locationName: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string;
  endTime?: string;
  bookingRef?: string;
  fixed: boolean;
  confidence: ConfidenceLevel;
  notes?: string;
  selected: boolean;
}

export interface VisionExtractionResult {
  summary: string;
  items: ExtractedTravelItem[];
  detectedDocumentType: 'flight_confirmation' | 'hotel_voucher' | 'calendar_screenshot' | 'train_ticket' | 'itinerary_note';
}

/**
 * Extracts travel items from an uploaded image or sample document.
 * Includes confidence markers and provides editable fields for the user review step.
 */
export async function extractFromImage(
  _imageDataUrl: string,
  imageFileName?: string
): Promise<VisionExtractionResult> {
  // Simulate intelligent vision analysis latency
  await new Promise((r) => setTimeout(r, 600));

  const lowerName = (imageFileName || '').toLowerCase();

  if (lowerName.includes('flight') || lowerName.includes('boarding') || lowerName.includes('ticket')) {
    return getSampleFlightExtraction();
  } else if (lowerName.includes('hotel') || lowerName.includes('booking') || lowerName.includes('airbnb')) {
    return getSampleHotelExtraction();
  } else if (lowerName.includes('train') || lowerName.includes('renfe') || lowerName.includes('eurostar')) {
    return getSampleTrainExtraction();
  } else {
    // Default comprehensive multi-event extraction (e.g. calendar screenshot)
    return getSampleCalendarExtraction();
  }
}

export function getSampleFlightExtraction(): VisionExtractionResult {
  return {
    detectedDocumentType: 'flight_confirmation',
    summary: 'Identified 2 confirmed flight legs and baggage reservation details from e-ticket document.',
    items: [
      {
        id: `ext-${Date.now()}-1`,
        type: 'flight',
        title: 'Iberia IB3150: Madrid (MAD) → Rome Fiumicino (FCO)',
        locationName: 'Rome',
        startDate: '2026-10-04',
        startTime: '11:40',
        endDate: '2026-10-04',
        endTime: '14:10',
        bookingRef: 'IB-99420X',
        fixed: true,
        confidence: 'high',
        notes: 'Terminal 4S departure. Baggage allowance: 1 checked 23kg.',
        selected: true,
      },
      {
        id: `ext-${Date.now()}-2`,
        type: 'event',
        title: 'Airport Transfer & Express Train into Roma Termini',
        locationName: 'Rome',
        startDate: '2026-10-04',
        startTime: '15:00',
        endTime: '15:45',
        fixed: false,
        confidence: 'medium',
        notes: 'Leonardo Express train from airport to city center.',
        selected: true,
      },
    ],
  };
}

export function getSampleHotelExtraction(): VisionExtractionResult {
  return {
    detectedDocumentType: 'hotel_voucher',
    summary: 'Identified hotel reservation with confirmed 3-night stay in Rome.',
    items: [
      {
        id: `ext-${Date.now()}-3`,
        type: 'hotel',
        title: 'Hotel Artemide Rome (Executive Double Room)',
        locationName: 'Rome',
        startDate: '2026-10-04',
        startTime: '15:00',
        endDate: '2026-10-07',
        endTime: '11:00',
        bookingRef: 'BK-771829',
        fixed: true,
        confidence: 'high',
        notes: 'Via Nazionale 22, Rome. Breakfast included.',
        selected: true,
      },
      {
        id: `ext-${Date.now()}-4`,
        type: 'activity',
        title: 'Rooftop Panoramic Cocktail & Welcome Reception',
        locationName: 'Rome',
        startDate: '2026-10-04',
        startTime: '18:30',
        endTime: '20:00',
        fixed: false,
        confidence: 'medium',
        notes: 'Complimentary hotel aperitivo.',
        selected: false,
      },
    ],
  };
}

export function getSampleTrainExtraction(): VisionExtractionResult {
  return {
    detectedDocumentType: 'train_ticket',
    summary: 'Identified high-speed rail ticket reservation for 2 travelers.',
    items: [
      {
        id: `ext-${Date.now()}-5`,
        type: 'train',
        title: 'Frecciarossa 1000 High-Speed: Roma Termini → Firenze SMN',
        locationName: 'Florence',
        startDate: '2026-10-07',
        startTime: '09:20',
        endDate: '2026-10-07',
        endTime: '10:55',
        bookingRef: 'TRN-55102',
        fixed: true,
        confidence: 'high',
        notes: 'Coach 3, Standard Silenzio. Duration: 1h 35m.',
        selected: true,
      },
    ],
  };
}

export function getSampleCalendarExtraction(): VisionExtractionResult {
  return {
    detectedDocumentType: 'calendar_screenshot',
    summary: 'Found 4 travel-related events and commitments from calendar screenshot.',
    items: [
      {
        id: `ext-${Date.now()}-6`,
        type: 'flight',
        title: 'Flight Buenos Aires (EZE) → Madrid Barajas (MAD)',
        locationName: 'Madrid',
        startDate: '2026-09-26',
        startTime: '21:30',
        endDate: '2026-09-27',
        endTime: '14:20',
        bookingRef: 'UX-042',
        fixed: true,
        confidence: 'high',
        notes: 'Air Europa transatlantic flight.',
        selected: true,
      },
      {
        id: `ext-${Date.now()}-7`,
        type: 'hotel',
        title: 'Gran Vía Boutique Hotel Madrid',
        locationName: 'Madrid',
        startDate: '2026-09-27',
        startTime: '15:00',
        endDate: '2026-09-30',
        endTime: '11:00',
        bookingRef: 'HTL-MAD-441',
        fixed: true,
        confidence: 'high',
        notes: 'Confirmed booking, Gran Vía central location.',
        selected: true,
      },
      {
        id: `ext-${Date.now()}-8`,
        type: 'event',
        title: 'Prado Museum Masterpieces Guided Private Entry',
        locationName: 'Madrid',
        startDate: '2026-09-28',
        startTime: '10:30',
        endTime: '13:00',
        fixed: true,
        confidence: 'high',
        notes: 'Confirmed reservation ticket #PRD-8120.',
        selected: true,
      },
      {
        id: `ext-${Date.now()}-9`,
        type: 'event',
        title: 'Amsterdam Electronic Music Closing Night',
        locationName: 'Amsterdam',
        startDate: '2026-10-20',
        startTime: '20:00',
        endTime: '23:30',
        fixed: true,
        confidence: 'high',
        notes: 'Hard constraint commitment.',
        selected: true,
      },
    ],
  };
}

/**
 * Converts approved ExtractedTravelItem into domain Event or Reservation
 */
export function convertExtractedToDomain(
  item: ExtractedTravelItem
): { event?: Event; reservation?: Reservation } {
  const loc = resolveLocation(item.locationName);
  const startDateTime = item.startTime
    ? `${item.startDate}T${item.startTime}`
    : `${item.startDate}T00:00`;
  const endDateTime = item.endDate
    ? item.endTime
      ? `${item.endDate}T${item.endTime}`
      : `${item.endDate}T23:59`
    : undefined;

  if (item.type === 'flight' || item.type === 'hotel' || item.type === 'train') {
    const reservation: Reservation = {
      id: `res-ext-${item.id}`,
      type: item.type,
      name: item.title,
      location: loc,
      startDateTime,
      endDateTime,
      confirmed: true,
      source: 'image',
      bookingReference: item.bookingRef,
      details: item.notes,
    };
    return { reservation };
  } else {
    const event: Event = {
      id: `evt-ext-${item.id}`,
      title: item.title,
      location: loc,
      startDateTime,
      endDateTime,
      type: item.type === 'activity' ? 'activity' : 'event',
      fixed: item.fixed,
      source: 'image',
      confidence: item.confidence,
      notes: item.notes,
      externalRef: item.bookingRef,
    };
    return { event };
  }
}
