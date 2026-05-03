import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';

import { logger } from '@/lib/logger';

import { useElectraStore } from '../../engines/stateEngine';
import { getCopy } from '../../i18n';
import type { LanguageCode, PollingLocation } from '../../types';

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

/** Debounce duration preventing polling lookup storms while learners type addresses. */
const POLLING_ADDRESS_LOOKUP_DEBOUNCE_MS = 350;

/** Development fallback aligning with FastAPI defaults when env overrides are absent. */
const POLLING_LOCATIONS_API_FALLBACK_BASE_URL = 'http://localhost:8000';

/** Default zoom applied when rendering Google Maps canvases for civic sites. */
const POLLING_MAP_DEFAULT_ZOOM = 12;

/** Fixed map preview height inside responsive civic simulation layouts. */
const POLLING_MAP_PREVIEW_HEIGHT_CLASS = 'h-[260px]';

/** Demo ICS calendar start token mirroring first Tuesday in November pedagogy scripts. */
const POLLING_CALENDAR_EVENT_START_UTC = '20261103T080000';

/** Demo ICS calendar end token paired with {@link POLLING_CALENDAR_EVENT_START_UTC}. */
const POLLING_CALENDAR_EVENT_END_UTC = '20261103T090000';

/** Filename learners receive when exporting voting reminders from civic simulations. */
const POLLING_CALENDAR_DOWNLOAD_FILENAME = 'electra-voting-reminder.ics';

/** Bundled civic fixtures used before API integrations hydrate remote datasets. */
const POLLING_LOCATION_FALLBACK_FIXTURES: PollingLocation[] = [
  {
    accessible: true,
    address: '123 Main St',
    curbside: true,
    hours: '7:00 AM - 8:00 PM',
    id: '1',
    languages: ['English', 'Spanish'],
    lat: 40.7128,
    lng: -74.006,
    name: 'Central Library',
    parking: 'Street parking nearby',
  },
  {
    accessible: false,
    address: '50 River Rd',
    curbside: false,
    hours: '7:00 AM - 8:00 PM',
    id: '2',
    languages: ['English'],
    lat: 40.719,
    lng: -74.002,
    name: 'Town Hall',
    parking: 'Small lot',
  },
  {
    accessible: true,
    address: '22 Oak Ave',
    curbside: false,
    hours: '6:00 AM - 9:00 PM',
    id: '3',
    languages: ['English', 'French'],
    lat: 40.726,
    lng: -73.998,
    name: 'Community Center',
    parking: 'Accessible parking',
  },
];

/** Emergency fallback location surfaced when fixtures and APIs both fail hard. */
const POLLING_LOCATION_EMERGENCY_FALLBACK: PollingLocation = {
  accessible: true,
  address: 'Local election office',
  curbside: false,
  hours: 'Check official hours',
  id: 'fallback',
  languages: ['English'],
  lat: 0,
  lng: 0,
  name: 'Election Office',
  parking: 'Call ahead',
};

/** Default demo address seed reinforcing NYC-centric hackathon storytelling. */
const POLLING_DEFAULT_ADDRESS_SEED = 'New York City Hall';

/** Hero heading describing polling place discovery missions. */
const POLLING_FINDER_SECTION_TITLE = 'Find where you go to vote';

/** Accessible label describing manual address capture field. */
const POLLING_ADDRESS_FIELD_LABEL = 'Your address';

/**
 * Props for {@link PollingFinder}.
 */
export interface PollingFinderProps {
  /** Ensures civic simulations remain plug-compatible with Agentic registry wiring. */
  readonly civicSimulatorMounted?: true;
}

/**
 * Debounced polling-place lookup backed by Electra FastAPI fixtures or remote integrations.
 *
 * @param addressQuery - Raw learner-supplied mailing or civic address text.
 * @param onHydrated - Invoked when remote payloads replace bundled fixtures.
 */
function usePollingLocationLookup(
  addressQuery: string,
  onHydrated: (locations: PollingLocation[]) => void,
): void {
  useEffect((): (() => void) => {
    const controller = new AbortController();
    const timer = window.setTimeout((): void => {
      void (async (): Promise<void> => {
        try {
          const baseUrl =
            import.meta.env.VITE_API_BASE_URL ?? POLLING_LOCATIONS_API_FALLBACK_BASE_URL;
          const response = await fetch(
            `${baseUrl}/api/polling-locations?address=${encodeURIComponent(addressQuery)}`,
            { signal: controller.signal },
          );
          const payload = (await response.json()) as { locations?: PollingLocation[] };
          if (payload.locations?.length) {
            onHydrated(payload.locations);
          }
        } catch (err: unknown) {
          if (!controller.signal.aborted) {
            logger.warn('Polling lookup failed; retaining bundled civic fixtures', {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      })();
    }, POLLING_ADDRESS_LOOKUP_DEBOUNCE_MS);

    return (): void => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [addressQuery, onHydrated]);
}

/**
 * Hydrates Google Maps markers whenever learners pivot accessibility filters or datasets.
 *
 * @param mapHostRef - DOM anchor hosting the Maps canvas.
 * @param locations - Candidate civic sites to plot when Maps credentials exist.
 * @param activeLocation - Center target for map framing heuristics.
 * @param accessibleOnly - When true, plotting skips locations lacking accessibility metadata.
 */
function usePollingGoogleMapMarkers(
  mapHostRef: RefObject<HTMLDivElement | null>,
  locations: PollingLocation[],
  activeLocation: PollingLocation,
  accessibleOnly: boolean,
): void {
  useEffect((): void => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapHostRef.current || !window.google?.maps) {
      return;
    }

    const map = new window.google.maps.Map(mapHostRef.current, {
      center: { lat: activeLocation.lat, lng: activeLocation.lng },
      zoom: POLLING_MAP_DEFAULT_ZOOM,
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
        content: `<div><strong>${location.name}</strong><br/>${location.hours}<br/>${location.accessible ? 'Accessible' : 'Standard access'}</div>`,
      });
      marker.addListener('click', (): void => {
        info.open({ anchor: marker, map });
      });
    }
  }, [accessibleOnly, activeLocation, locations, mapHostRef]);
}

/**
 * Props for {@link PollingLocationListPane}.
 */
interface PollingLocationListPaneProps {
  /** Locations respecting accessibility filters for presentation lists. */
  visibleLocations: PollingLocation[];
  /** Currently highlighted civic site driving map centering. */
  activeLocation: PollingLocation;
  /** Updates active civic focus when learners choose alternate polling homes. */
  onSelect: (location: PollingLocation) => void;
}

/**
 * Presents selectable civic polling cards with pressed semantics derived from active ids.
 *
 * @param props - Dataset slice plus selection handlers for learner reassurances.
 * @returns Responsive stack of polling preview buttons.
 */
function PollingLocationListPane({
  visibleLocations,
  activeLocation,
  onSelect,
}: PollingLocationListPaneProps): ReactNode {
  return (
    <div className="space-y-3">
      {visibleLocations.map((location: PollingLocation): ReactNode => {
        const isActive = activeLocation.id === location.id;
        const surfaceClass = isActive
          ? 'border-[var(--civic-green)] bg-[var(--civic-green-light)]'
          : 'border-[var(--border)] bg-[var(--surface-2)]';

        const handleSelect = (): void => {
          onSelect(location);
        };

        return (
          <button
            key={location.id}
            type="button"
            className={`block min-h-12 w-full rounded-[18px] border px-4 py-4 text-left ${surfaceClass}`}
            onClick={handleSelect}
          >
            <p className="font-bold text-[var(--ink)]">{location.name}</p>
            <p className="text-sm text-[var(--ink-secondary)]">{location.address}</p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">{location.parking}</p>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Props for {@link PollingMapInsightPane}.
 */
interface PollingMapInsightPaneProps {
  /** DOM anchor forwarded into Google Maps bootstrap logic. */
  mapHostRef: Ref<HTMLDivElement>;
  /** Active civic site describing textual reassurance below map previews. */
  activeLocation: PollingLocation;
  /** Localization tag powering copy pulled from Electra phrase bundles. */
  language: LanguageCode;
  /** Exports deterministic ICS reminders for anxious planners. */
  onDownloadCalendar: () => void;
}

/**
 * Embeds map previews, textual reassurance, and outbound navigation affordances.
 *
 * @param props - Map wiring plus localization-aware civic CTAs.
 * @returns Secondary column pairing cartography with pragmatic voting logistics.
 */
function PollingMapInsightPane({
  mapHostRef,
  activeLocation,
  language,
  onDownloadCalendar,
}: PollingMapInsightPaneProps): ReactNode {
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeLocation.address)}`;

  return (
    <div>
      <div ref={mapHostRef} className={`${POLLING_MAP_PREVIEW_HEIGHT_CLASS} rounded-[18px] bg-[var(--surface-2)]`} />
      <div className="mt-4 rounded-[18px] bg-[var(--surface-2)] p-4 text-[var(--ink)]">
        <p className="font-bold">{activeLocation.name}</p>
        <p className="mt-1">{activeLocation.hours}</p>
        <p className="mt-1">
          {activeLocation.accessible ? 'Wheelchair-friendly' : 'Call ahead for access help'}
        </p>
        <p className="mt-1">
          {activeLocation.curbside ? 'Curbside voting available' : 'No curbside listing'}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          className="inline-flex min-h-12 items-center rounded-full bg-[var(--civic-green)] px-5 text-sm font-semibold text-white"
          href={directionsHref}
          rel="noreferrer"
          target="_blank"
        >
          {getCopy(language, 'directions')}
        </a>
        <button
          type="button"
          className="min-h-12 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--ink)]"
          onClick={onDownloadCalendar}
        >
          {getCopy(language, 'addToCalendar')}
        </button>
      </div>
    </div>
  );
}

/**
 * Accessibility-aware polling discovery workspace pairing maps with reassurance copy.
 *
 * Gracefully degrades to bundled civic fixtures when offline demos lack remote integrations,
 * logging recoverable failures instead of silently swallowing errors.
 *
 * @param _props - Registry symmetry extension surface (unused today).
 * @returns Full-column civic simulation pairing lookup forms with mapping affordances.
 */
export default function PollingFinder(_props: PollingFinderProps): ReactNode {
  const { language } = useElectraStore();
  const mapHostRef = useRef<HTMLDivElement>(null);
  const [addressQuery, setAddressQuery] = useState<string>(POLLING_DEFAULT_ADDRESS_SEED);
  const [locations, setLocations] = useState<PollingLocation[]>(POLLING_LOCATION_FALLBACK_FIXTURES);
  const [accessibleOnly, setAccessibleOnly] = useState<boolean>(false);
  const [activeLocation, setActiveLocation] = useState<PollingLocation>(
    POLLING_LOCATION_FALLBACK_FIXTURES[0] ?? POLLING_LOCATION_EMERGENCY_FALLBACK,
  );

  const handleRemoteHydration = useCallback((nextLocations: PollingLocation[]): void => {
    setLocations(nextLocations);
    setActiveLocation((current: PollingLocation): PollingLocation => nextLocations[0] ?? current);
  }, []);

  usePollingLocationLookup(addressQuery, handleRemoteHydration);
  usePollingGoogleMapMarkers(mapHostRef, locations, activeLocation, accessibleOnly);

  const visibleLocations = useMemo((): PollingLocation[] => {
    return locations.filter((location: PollingLocation): boolean =>
      accessibleOnly ? location.accessible : true,
    );
  }, [accessibleOnly, locations]);

  const handleAddressChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setAddressQuery(event.target.value);
  };

  const handleAccessibleToggle = (event: ChangeEvent<HTMLInputElement>): void => {
    setAccessibleOnly(event.target.checked);
  };

  const handleDownloadCalendar = (): void => {
    try {
      const content = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `SUMMARY:Vote at ${activeLocation.name}`,
        `DTSTART:${POLLING_CALENDAR_EVENT_START_UTC}`,
        `DTEND:${POLLING_CALENDAR_EVENT_END_UTC}`,
        `LOCATION:${activeLocation.address}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\n');
      const blob = new Blob([content], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = POLLING_CALENDAR_DOWNLOAD_FILENAME;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      logger.error('Polling calendar export failed', err);
    }
  };

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">{POLLING_FINDER_SECTION_TITLE}</h2>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">
          {POLLING_ADDRESS_FIELD_LABEL}
        </span>
        <input
          className="min-h-12 w-full rounded-[16px] border border-[var(--border)] px-4"
          value={addressQuery}
          onChange={handleAddressChange}
        />
      </label>
      <label className="mt-4 flex min-h-12 items-center gap-3">
        <input checked={accessibleOnly} type="checkbox" onChange={handleAccessibleToggle} />
        <span>{getCopy(language, 'accessibleOnly')}</span>
      </label>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,1fr]">
        <PollingLocationListPane
          activeLocation={activeLocation}
          visibleLocations={visibleLocations}
          onSelect={setActiveLocation}
        />
        <PollingMapInsightPane
          activeLocation={activeLocation}
          language={language}
          mapHostRef={mapHostRef}
          onDownloadCalendar={handleDownloadCalendar}
        />
      </div>
    </section>
  );
}
