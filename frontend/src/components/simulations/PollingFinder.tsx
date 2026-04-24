import { useEffect, useMemo, useRef, useState } from "react";
import { getCopy } from "../../i18n";
import { useElectraStore } from "../../engines/stateEngine";
import type { PollingLocation } from "../../types";

declare global {
  interface Window {
    google?: any;
  }
}

const fallbackLocations: PollingLocation[] = [
  {
    id: "1",
    name: "Central Library",
    address: "123 Main St",
    hours: "7:00 AM - 8:00 PM",
    lat: 40.7128,
    lng: -74.006,
    accessible: true,
    curbside: true,
    languages: ["English", "Spanish"],
    parking: "Street parking nearby"
  },
  {
    id: "2",
    name: "Town Hall",
    address: "50 River Rd",
    hours: "7:00 AM - 8:00 PM",
    lat: 40.719,
    lng: -74.002,
    accessible: false,
    curbside: false,
    languages: ["English"],
    parking: "Small lot"
  },
  {
    id: "3",
    name: "Community Center",
    address: "22 Oak Ave",
    hours: "6:00 AM - 9:00 PM",
    lat: 40.726,
    lng: -73.998,
    accessible: true,
    curbside: false,
    languages: ["English", "French"],
    parking: "Accessible parking"
  }
];

const PollingFinder = () => {
  const { language } = useElectraStore();
  const [address, setAddress] = useState("New York City Hall");
  const [locations, setLocations] = useState<PollingLocation[]>(fallbackLocations);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [activeLocation, setActiveLocation] = useState<PollingLocation>(fallbackLocations[0]);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/polling-locations?address=${encodeURIComponent(address)}`,
        { signal: controller.signal }
      )
        .then((response) => response.json())
        .then((payload: { locations?: PollingLocation[] }) => {
          if (payload.locations?.length) {
            setLocations(payload.locations);
            setActiveLocation(payload.locations[0]);
          }
        })
        .catch(() => undefined);
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
      zoom: 12
    });

    locations.forEach((location) => {
      if (accessibleOnly && !location.accessible) {
        return;
      }
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: location.lat, lng: location.lng },
        title: location.name
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div><strong>${location.name}</strong><br/>${location.hours}<br/>${location.accessible ? "Accessible" : "Standard access"}</div>`
      });
      marker.addListener("click", () => info.open({ anchor: marker, map }));
    });
  }, [accessibleOnly, activeLocation, locations]);

  const visibleLocations = useMemo(
    () => locations.filter((location) => (accessibleOnly ? location.accessible : true)),
    [accessibleOnly, locations]
  );

  const downloadCalendar = () => {
    const start = "20261103T080000";
    const end = "20261103T090000";
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `SUMMARY:Vote at ${activeLocation.name}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `LOCATION:${activeLocation.address}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\n");
    const blob = new Blob([content], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "electra-voting-reminder.ics";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">Find where you go to vote</h2>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Your address</span>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="min-h-12 w-full rounded-[16px] border border-[var(--border)] px-4"
        />
      </label>
      <label className="mt-4 flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          checked={accessibleOnly}
          onChange={(event) => setAccessibleOnly(event.target.checked)}
        />
        <span>{getCopy(language, "accessibleOnly")}</span>
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
                  ? "border-[var(--civic-green)] bg-[var(--civic-green-light)]"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
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
              {activeLocation.accessible ? "Wheelchair-friendly" : "Call ahead for access help"}
            </p>
            <p className="mt-1">
              {activeLocation.curbside ? "Curbside voting available" : "No curbside listing"}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeLocation.address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center rounded-full bg-[var(--civic-green)] px-5 text-sm font-semibold text-white"
            >
              {getCopy(language, "directions")}
            </a>
            <button
              type="button"
              onClick={downloadCalendar}
              className="min-h-12 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--ink)]"
            >
              {getCopy(language, "addToCalendar")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PollingFinder;
