import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const demoDisasters = [
  {
    id: "demo-flood-houston",
    title: "Flash flood warning near Houston",
    type: "FLOOD",
    severity: "HIGH",
    summary: "Heavy rainfall and saturated drainage corridors are creating flash flood risk.",
    latitude: 29.7604,
    longitude: -95.3698,
    radiusKm: 75,
    source: "NOAA Weather Aggregator",
    sourceUrl: "https://www.weather.gov/",
    startedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    aiScore: 82,
    recommendation: "Avoid low-water crossings, move vehicles to higher ground, and monitor evacuation updates.",
    active: true
  },
  {
    id: "demo-wildfire-la",
    title: "Wildfire expansion east of Los Angeles",
    type: "WILDFIRE",
    severity: "EXTREME",
    summary: "Dry winds and low humidity are accelerating fire spread near foothill communities.",
    latitude: 34.1478,
    longitude: -117.85,
    radiusKm: 55,
    source: "Incident News Monitor",
    sourceUrl: "https://inciweb.wildfire.gov/",
    startedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    aiScore: 93,
    recommendation: "Prepare go-bags, keep phones charged, and follow evacuation orders immediately.",
    active: true
  },
  {
    id: "demo-quake-anchorage",
    title: "Moderate earthquake reported near Anchorage",
    type: "EARTHQUAKE",
    severity: "MODERATE",
    summary: "Regional seismic sensors reported a moderate event with aftershock potential.",
    latitude: 61.2181,
    longitude: -149.9003,
    radiusKm: 120,
    source: "USGS Earthquake Feed",
    sourceUrl: "https://earthquake.usgs.gov/",
    startedAt: new Date(Date.now() - 1000 * 60 * 125).toISOString(),
    aiScore: 58,
    recommendation: "Inspect utilities, avoid damaged structures, and expect aftershocks.",
    active: true
  }
];

let liveDisasterCache: { time: number; data: any[] } | null = null;

function severityFromScore(score: number) {
  if (score >= 85) return "EXTREME";
  if (score >= 70) return "HIGH";
  if (score >= 45) return "MODERATE";
  return "LOW";
}

function recommendationFor(type: string, severity: string) {
  if (type === "EARTHQUAKE") return "Move away from damaged structures, check utilities, and stay prepared for aftershocks.";
  if (type === "WILDFIRE") return "Avoid smoke exposure, prepare evacuation items, and follow official evacuation instructions.";
  if (type === "FLOOD") return "Avoid low-water crossings, move to higher ground, and monitor official flood warnings.";
  if (type === "CYCLONE" || type === "STORM") return "Stay indoors, secure loose objects, avoid coastal travel, and follow official alerts.";
  return severity === "EXTREME" || severity === "HIGH"
    ? "Follow local emergency instructions and keep communication devices charged."
    : "Monitor updates and review nearby emergency resources.";
}

function findPoint(coordinates: any): [number, number] | null {
  if (!Array.isArray(coordinates)) return null;
  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") return [coordinates[0], coordinates[1]];
  for (const item of coordinates) {
    const point = findPoint(item);
    if (point) return point;
  }
  return null;
}

async function fetchLiveDisasters() {
  if (liveDisasterCache && Date.now() - liveDisasterCache.time < 1000 * 60 * 10) return liveDisasterCache.data;

  const [usgsResponse, eonetResponse] = await Promise.allSettled([
    fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"),
    fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=30")
  ]);

  const disasters: any[] = [];

  if (usgsResponse.status === "fulfilled" && usgsResponse.value.ok) {
    const usgs = await usgsResponse.value.json();
    for (const feature of usgs.features?.slice(0, 20) ?? []) {
      const [longitude, latitude] = feature.geometry?.coordinates ?? [];
      const magnitude = Number(feature.properties?.mag ?? 0);
      const score = Math.min(100, Math.round(magnitude * 15));
      const severity = severityFromScore(score);
      disasters.push({
        id: `usgs-${feature.id}`,
        title: feature.properties?.title ?? "Earthquake reported by USGS",
        type: "EARTHQUAKE",
        severity,
        summary: `Magnitude ${magnitude || "unknown"} earthquake reported by the USGS live earthquake feed.`,
        latitude,
        longitude,
        radiusKm: Math.max(25, Math.round(magnitude * 25)),
        source: "USGS live earthquake API",
        sourceUrl: feature.properties?.url ?? "https://earthquake.usgs.gov/",
        startedAt: new Date(feature.properties?.time ?? Date.now()).toISOString(),
        aiScore: score,
        recommendation: recommendationFor("EARTHQUAKE", severity),
        active: true
      });
    }
  }

  if (eonetResponse.status === "fulfilled" && eonetResponse.value.ok) {
    const eonet = await eonetResponse.value.json();
    for (const event of eonet.events?.slice(0, 20) ?? []) {
      const point = findPoint(event.geometry?.[0]?.coordinates);
      if (!point) continue;
      const category = String(event.categories?.[0]?.id ?? "").toLowerCase();
      const type = category.includes("wildfire")
        ? "WILDFIRE"
        : category.includes("flood")
          ? "FLOOD"
          : category.includes("storm")
            ? "STORM"
            : category.includes("volcano")
              ? "OTHER"
              : "OTHER";
      const severity = type === "WILDFIRE" || type === "FLOOD" || type === "STORM" ? "HIGH" : "MODERATE";
      const score = type === "WILDFIRE" ? 78 : type === "FLOOD" || type === "STORM" ? 72 : 55;
      disasters.push({
        id: `eonet-${event.id}`,
        title: event.title,
        type,
        severity,
        summary: `Open natural event from NASA EONET category: ${event.categories?.[0]?.title ?? "Natural Event"}.`,
        latitude: point[1],
        longitude: point[0],
        radiusKm: type === "STORM" ? 220 : type === "FLOOD" ? 120 : 80,
        source: "NASA EONET live API",
        sourceUrl: event.sources?.[0]?.url ?? "https://eonet.gsfc.nasa.gov/",
        startedAt: new Date(event.geometry?.[0]?.date ?? Date.now()).toISOString(),
        aiScore: score,
        recommendation: recommendationFor(type, severity),
        active: true
      });
    }
  }

  const live = disasters.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  liveDisasterCache = { time: Date.now(), data: live.length ? live : demoDisasters };
  return liveDisasterCache.data;
}

async function liveOrDemoDisasters(path: string) {
  const data = await fetchLiveDisasters().catch(() => demoDisasters);
  const query = path.includes("?") ? new URLSearchParams(path.split("?")[1]) : new URLSearchParams();
  const q = query.get("q")?.toLowerCase() ?? "";
  const severity = query.get("severity") ?? "ALL";
  const type = query.get("type") ?? "ALL";

  return data.filter((disaster) => {
    const matchesSearch = !q || `${disaster.title} ${disaster.summary} ${disaster.source}`.toLowerCase().includes(q);
    const matchesSeverity = severity === "ALL" || disaster.severity === severity;
    const matchesType = type === "ALL" || disaster.type === type;
    return matchesSearch && matchesSeverity && matchesType;
  });
}

async function fallbackResponse<T>(path: string, options: RequestInit): Promise<T | null> {
  const method = options.method ?? "GET";

  if (path === "/auth/login" && method === "POST") {
    const body = typeof options.body === "string" ? JSON.parse(options.body) : {};
    return {
      user: { id: "demo-user", email: body.email ?? "user@disasterwatch.ai", name: "Website User", role: "USER" },
      token: "demo-local-token"
    } as T;
  }

  if (path === "/auth/register" && method === "POST") {
    return {
      user: { id: "demo-user", email: "user@disasterwatch.ai", name: "Prepared Citizen", role: "USER" },
      token: "demo-local-token"
    } as T;
  }

  if (path === "/auth/google" && method === "POST") {
    return {
      user: { id: "demo-google", email: "google-user@disasterwatch.ai", name: "Google Responder", role: "USER" },
      token: "demo-local-token"
    } as T;
  }

  if (path.startsWith("/disasters")) return (await liveOrDemoDisasters(path)) as T;

  if (path === "/resources") {
    return [
      { id: "h1", type: "Hospital", name: "Metro Emergency Hospital", latitude: 40.755, longitude: -73.98, phone: "+1-555-0101" },
      { id: "s1", type: "Shelter", name: "Central Community Shelter", latitude: 34.061, longitude: -118.252, phone: "+1-555-0144" },
      { id: "p1", type: "Police", name: "North District Police Station", latitude: 29.771, longitude: -95.36, phone: "911" },
      { id: "f1", type: "Fire", name: "Station 8 Fire Response", latitude: 33.457, longitude: -112.071, phone: "911" }
    ] as T;
  }

  if (path === "/alerts") {
    const disasters = await fetchLiveDisasters().catch(() => demoDisasters);
    return disasters.slice(0, 10).map((disaster) => ({
      id: `alert-${disaster.id}`,
      title: `${disaster.severity} ${disaster.type} alert`,
      message: disaster.recommendation,
      severity: disaster.severity,
      channels: ["EMAIL", "PUSH"],
      createdAt: disaster.startedAt,
      disaster
    })) as T;
  }

  if (path === "/alerts/check-location" && method === "POST") {
    return { matched: [], sent: [] } as T;
  }

  if (path === "/analytics") {
    return {
      bySeverity: [
        { severity: "EXTREME", _count: 1 },
        { severity: "HIGH", _count: 1 },
        { severity: "MODERATE", _count: 1 }
      ],
      byType: [
        { type: "WILDFIRE", _count: 1 },
        { type: "FLOOD", _count: 1 },
        { type: "EARTHQUAKE", _count: 1 }
      ],
      metrics: []
    } as T;
  }

  if (path === "/aggregate/run" || path === "/notifications/test") return { ok: true } as T;

  return null;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("dw_token") : null;
  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error ?? "Request failed");
    }
    return response.json();
  } catch (error) {
    const fallback = await fallbackResponse<T>(path, options);
    if (fallback) return fallback;
    throw error;
  }
}
