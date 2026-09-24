import { describe, it, expect } from 'vitest';
import {
  formatGCalAllDayDate,
  formatGCalDateTime,
  generateGoogleCalendarUrl,
  generateMasterTripGoogleCalendarUrl,
  generateDestinationStayGoogleCalendarUrl,
  generateTransitGoogleCalendarUrl,
  generateTripIcsContent,
  getGoogleCalendarImportUrl,
} from '../calendarExportService';
import { getEuropeGrandTourSampleTrip } from '../../../domain/tripDefaults';

describe('Calendar Export Service (calendarExportService)', () => {
  const sampleTrip = getEuropeGrandTourSampleTrip();

  describe('Date & Time Formatting for Google Calendar', () => {
    it('formats all-day dates as YYYYMMDD and handles exclusive end date', () => {
      const start = formatGCalAllDayDate('2026-09-26', false);
      expect(start).toBe('20260926');

      const end = formatGCalAllDayDate('2026-09-28', true);
      expect(end).toBe('20260929'); // Advance 1 day for Google Calendar exclusive end date
    });

    it('formats date and time properly as YYYYMMDDTHHmmss', () => {
      const formatted = formatGCalDateTime('2026-09-26', '14:30');
      expect(formatted).toBe('20260926T143000');

      const fromIso = formatGCalDateTime('2026-09-26T09:15:00');
      expect(fromIso).toBe('20260926T091500');
    });
  });

  describe('Google Calendar Web URL Generation', () => {
    it('creates a valid TEMPLATE URL with all-day dates and details', () => {
      const url = generateGoogleCalendarUrl({
        title: 'Visita Museo del Prado',
        startDate: '2026-09-29',
        endDate: '2026-09-29',
        isAllDay: true,
        description: 'Entradas reservadas a las 11:00',
        location: 'Madrid, Spain',
      });

      expect(url).toContain('https://calendar.google.com/calendar/render');
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('text=Visita+Museo+del+Prado');
      expect(url).toContain('dates=20260929%2F20260930');
      expect(url).toContain('location=Madrid%2C+Spain');
    });

    it('creates master overview trip event Google Calendar link', () => {
      const url = generateMasterTripGoogleCalendarUrl(sampleTrip);
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain(encodeURIComponent(sampleTrip.name).replace(/%20/g, '+'));
      expect(url).toContain('dates=20260926%2F20261021');
    });

    it('creates destination stay event Google Calendar link', () => {
      const firstDest = sampleTrip.destinations[0];
      const url = generateDestinationStayGoogleCalendarUrl(sampleTrip, firstDest, 0);
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain(encodeURIComponent(firstDest.name).replace(/%20/g, '+'));
    });

    it('creates transportation transit event Google Calendar link', () => {
      const firstTransit = sampleTrip.transportation[0];
      const url = generateTransitGoogleCalendarUrl(firstTransit);
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain(encodeURIComponent(firstTransit.from.name).replace(/%20/g, '+'));
      expect(url).toContain(encodeURIComponent(firstTransit.to.name).replace(/%20/g, '+'));
    });
  });

  describe('iCalendar (.ics / RFC 5545) Generation', () => {
    it('generates standard RFC 5545 content with VCALENDAR wrapper', () => {
      const ics = generateTripIcsContent(sampleTrip);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//Travel Optimizer//ES');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toContain('\r\n');
    });

    it('includes master trip event, destination stays and transit segments with alarms', () => {
      const ics = generateTripIcsContent(sampleTrip);

      // Check Master Trip event
      expect(ics).toContain(`UID:trip-master-${sampleTrip.id}@travel-optimizer`);
      expect(ics).toContain(`SUMMARY:✈️ Viaje: ${sampleTrip.name}`);

      // Check destinations
      expect(ics).toContain('Lisbon');
      expect(ics).toContain('Madrid');
      expect(ics).toContain('Barcelona');

      // Check transit segments
      expect(ics).toContain('BEGIN:VALARM');
      expect(ics).toContain('TRIGGER:-PT60M');
      expect(ics).toContain('Recordatorio:');
    });

    it('returns official Google Calendar import URL helper', () => {
      expect(getGoogleCalendarImportUrl()).toBe('https://calendar.google.com/calendar/u/0/r/settings/export');
    });
  });
});
