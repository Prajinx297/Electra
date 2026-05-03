import { useEffect, useMemo, useRef, useState } from 'react';

import { useElectraStore } from '../../engines/stateEngine';
import { getCopy } from '../../i18n';
import type { PollingLocation } from '../../types';

declare global {
  interface GoogleMapsApi {
    maps: {
      Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
      Marker: new (options: Record<string, unknown>) => {
        addListener: (event: string, handler: () => void) => void;
      };
      InfoWindow: new (options: Record<string, unknown>) => {
        open: (options: Record<string, unknown>) => void;
      };
    };
  }

  interface Window {
    google?: GoogleMapsApi;
  }
}

// Fallback polling booths using Indian cities
// Real booth data: voters.eci.gov.in or state CEO portal
const fallbackLocations: PollingLocation[] = [
  {
    id: '1',
    name: 'Central Library',
    address: 'Shivaji Nagar, Pune, Maharashtra 411005',
    hours: '7:00 AM – 6:00 PM',
    lat: 18.5204,
    lng: 73.8567,
    accessible: true,
    curbside: false,
    languages: ['Marathi', 'Hindi', 'English'],
    parking: 'Street parking nearby',
  },
  {
    id: '2',
    name: 'Town Hall',
    address: 'Anna Nagar, Chennai, Tamil Nadu 600040',
    hours: '7:00 AM – 6:00 PM',
    lat: 13.0827,
    lng: 80.2707,
    accessible: false,
    curbside: false,
    languages: ['Tamil', 'English'],
    parking: 'Limited parking',
  },
  {
    id: '3',
    name: 'Polling Booth No. 213 — Community Hall',
    address: 'Karol Bagh, New Delhi 110005',
    hours: '7:00 AM – 6:00 PM',
    lat: 28.6516,
    lng: 77.1901,
    accessible: true,
    curbside: false,
    languages: ['Hindi', 'Urdu', 'English'],
    parking: 'Metro parking at Karol Bagh station',
  },
];

const PollingFinder = () => {
  const { language } = useElectraStore();
  const [address, setAddress] = useState('Shivaji Nagar, Pune');
  const [locations, setLocations] = useState<PollingLocation[]>(fallbackLocations);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [activeLocation, setActiveLocation] = useState<PollingLocation>(
    fallbackLocations[0] ?? {
      id: 'fallback',
      name: 'District Election Office',
      address: 'Contact your local District Election Officer',
      hours: 'Check official hours at voters.eci.gov.in',
      lat: 20.5937,
      lng: 78.9629,
      accessible: true,
      curbside: false,
      languages: ['Hindi', 'English'],
      parking: 'Call ahead',
    },
  );
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/api/polling-locations?address=${encodeURIComponent(address)}`,
        { signal: controller.signal },
      )
        .then((response) => response.json())
        .then((payload: { locations?: PollingLocation[] }) => {
          if (payload.locations?.length) {
            setLocations(payload.locations);
            setActiveLocation((current) => payload.locations?.[0] ?? current);
          }
        })
        .catch(() => {});
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [address]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current || !window.google?.maps) {
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: activeLocation.lat, lng: activeLocation.lng },
      zoom: 14,
    });

    for (const location of locations) {
      if (accessibleOnly && !location.accessible) {
        continue;
      }
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: location.lat, lng: location.lng },
        title: location.name,
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div><strong>${location.name}</strong><br/>${location.hours}<br/>${location.accessible ? 'Wheelchair accessible' : 'Standard access'}</div>`,
      });
      marker.addListener('click', () => info.open({ anchor: marker, map }));
    }
  }, [accessibleOnly, activeLocation, locations]);

  const visibleLocations = useMemo(
    () => locations.filter((location) => (accessibleOnly ? location.accessible : true)),
    [accessibleOnly, locations],
  );

  // ECI elections are typically held in April–May; use a general reminder date
  const downloadCalendar = () => {
    const start = '20270426T070000';
    const end = '20270426T180000';
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:Vote at ${activeLocation.name}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `LOCATION:${activeLocation.address}`,
      'DESCRIPTION:General Elections polling day. Bring your EPIC or any ECI-approved document. Polling hours: 7 AM to 6 PM.',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'electra-voting-reminder.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">Find your polling booth</h2>
      <p className="mt-2 text-sm text-[var(--ink-secondary)]">
        Enter your address to find your assigned booth. Each constituency has a Booth Level Officer (BLO) — max 1,500 voters per booth.
      </p>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Your address</span>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="e.g. Andheri West, Mumbai"
          className="min-h-12 w-full rounded-[16px] border border-[var(--border)] px-4"
        />
      </label>
      <label className="mt-4 flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          checked={accessibleOnly}
          onChange={(event) => setAccessibleOnly(event.target.checked)}
        />
        <span>{getCopy(language, 'accessibleOnly')}</span>
      </label>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,1fr]">
        <div className="space-y-3">
          {visibleLocations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => setActiveLocation(location)}
              className={`block min-h-12 w-full rounded-[18px] border px-4 py-4 text-left ${
                activeLocation.id === location.id
                  ? 'border-[var(--civic-green)] bg-[var(--civic-green-light)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)]'
              }`}
            >
              <p className="font-bold text-[var(--ink)]">{location.name}</p>
              <p className="text-sm text-[var(--ink-secondary)]">{location.address}</p>
              <p className="mt-1 text-sm text-[var(--ink-secondary)]">{location.parking}</p>
            </button>
          ))}
        </div>
        <div>
          <div ref={mapRef} className="h-[260px] rounded-[18px] bg-[var(--surface-2)]" />
          <div className="mt-4 rounded-[18px] bg-[var(--surface-2)] p-4 text-[var(--ink)]">
            <p className="font-bold">{activeLocation.name}</p>
            <p className="mt-1">{activeLocation.hours}</p>
            <p className="mt-1">
              {activeLocation.accessible ? 'Wheelchair-accessible booth' : 'Contact BLO for accessibility needs'}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Verify booth at{' '}
              <a
                href="https://voters.eci.gov.in"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                voters.eci.gov.in
              </a>
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeLocation.address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center rounded-full bg-[var(--civic-green)] px-5 text-sm font-semibold text-white"
            >
              {getCopy(language, 'directions')}
            </a>
            <button
              type="button"
              onClick={downloadCalendar}
              className="min-h-12 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--ink)]"
            >
              {getCopy(language, 'addToCalendar')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PollingFinder;
