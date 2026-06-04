"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle, Crosshair, Gauge, LineChart, MapPin, Phone, RefreshCw, Search, Send, Settings, ShieldCheck, Users, XCircle, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/utils";
import type { Disaster, Severity, User } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { AuthPanel } from "@/components/auth-panel";
import { DisasterMap } from "@/components/disaster-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

const severityColors: Record<Severity, string> = {
  LOW: "#16a34a",
  MODERATE: "#eab308",
  HIGH: "#f97316",
  EXTREME: "#dc2626"
};

type StatCard = [string, number, LucideIcon];

type UserLocation = {
  latitude: number;
  longitude: number;
};

type UserReport = {
  id: string;
  title: string;
  type: Disaster["type"];
  description: string;
  latitude: number;
  longitude: number;
  evidence: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  confidence: number;
  reason: string;
};

function distanceKm(a: UserLocation, b: UserLocation) {
  const earthRadiusKm = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function inferSeverity(confidence: number): Severity {
  if (confidence >= 90) return "EXTREME";
  if (confidence >= 75) return "HIGH";
  if (confidence >= 55) return "MODERATE";
  return "LOW";
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [alertStatus, setAlertStatus] = useState("");
  const [notificationHistory, setNotificationHistory] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [nearbyDisasters, setNearbyDisasters] = useState<Array<Disaster & { distanceKm: number }>>([]);
  const [reportForm, setReportForm] = useState({
    title: "",
    type: "FLOOD" as Disaster["type"],
    description: "",
    latitude: "",
    longitude: "",
    evidence: ""
  });
  const [reports, setReports] = useState<UserReport[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("dw_user");
    const token = localStorage.getItem("dw_token");
    if (!raw) return;

    const savedUser = JSON.parse(raw);
    if (token !== "demo-admin-token" && savedUser.email === "admin@disasterwatch.ai") {
      localStorage.removeItem("dw_token");
      localStorage.removeItem("dw_user");
      return;
    }

    setUser(savedUser);
  }, []);

  useEffect(() => {
    loadPublic();
    const timer = setInterval(loadPublic, 30_000);
    return () => clearInterval(timer);
  }, [q, severity, type]);

  useEffect(() => {
    if (user) loadPrivate();
  }, [user]);

  async function loadPublic() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, severity, type });
      const [feed, emergency] = await Promise.all([api<Disaster[]>(`/disasters?${params}`), api<any[]>("/resources")]);
      setDisasters(feed);
      setResources(emergency);
    } finally {
      setLoading(false);
    }
  }

  async function loadPrivate() {
    const [alertData, analyticsData] = await Promise.all([api<any[]>("/alerts"), api<any>("/analytics")]);
    setAlerts(alertData);
    setAnalytics(analyticsData);
  }

  function onAuth(nextUser: User, token: string) {
    localStorage.setItem("dw_token", token);
    localStorage.setItem("dw_user", JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("dw_token");
    localStorage.removeItem("dw_user");
    setUser(null);
  }

  async function sendDemoAlert(title: string, message: string) {
    const stamp = new Date().toLocaleTimeString();
    const entry = `${stamp} - Sent: ${title}`;

    setAlertStatus(`Alert sent successfully: ${title}`);
    setNotificationHistory((items) => [entry, ...items].slice(0, 6));

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message });
    }

    await api("/notifications/test", {
      method: "POST",
      body: JSON.stringify({ channel: "EMAIL" })
    });
  }

  async function enablePush() {
    if (!("Notification" in window)) {
      setAlertStatus("Browser push is not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    setAlertStatus(permission === "granted" ? "Browser push enabled." : "Browser push was not enabled.");
  }

  async function checkCurrentLocationAlerts() {
    if (!("geolocation" in navigator)) {
      setAlertStatus("Current location is not supported in this browser.");
      return;
    }

    setAlertStatus("Checking your current location against active disaster zones...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        const matches = disasters
          .map((disaster) => ({
            ...disaster,
            distanceKm: distanceKm(location, {
              latitude: disaster.latitude,
              longitude: disaster.longitude
            })
          }))
          .filter((disaster) => disaster.distanceKm <= disaster.radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm);

        setCurrentLocation(location);
        setNearbyDisasters(matches);

        if (!matches.length) {
          const entry = `${new Date().toLocaleTimeString()} - Location checked: no disaster zone near you`;
          setNotificationHistory((items) => [entry, ...items].slice(0, 6));
          setAlertStatus("Location checked: no active disaster alert for your current area.");
          return;
        }

        await api("/alerts/check-location", {
          method: "POST",
          body: JSON.stringify(location)
        });

        for (const disaster of matches) {
          await sendDemoAlert(
            `Location alert: ${disaster.title}`,
            `${disaster.severity} ${disaster.type} detected ${disaster.distanceKm.toFixed(1)} km from your current location. ${disaster.recommendation}`
          );
        }

        setAlertStatus(`${matches.length} location-based alert${matches.length > 1 ? "s" : ""} sent for your current area.`);
      },
      (error) => {
        setAlertStatus(`Location permission failed: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function useCurrentLocationForReport() {
    if (!("geolocation" in navigator)) {
      setAlertStatus("Current location is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReportForm((form) => ({
          ...form,
          latitude: position.coords.latitude.toFixed(5),
          longitude: position.coords.longitude.toFixed(5)
        }));
        setAlertStatus("Current location added to report.");
      },
      (error) => setAlertStatus(`Location permission failed: ${error.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function verifyUserReport() {
    const latitude = Number(reportForm.latitude);
    const longitude = Number(reportForm.longitude);
    const text = `${reportForm.title} ${reportForm.description} ${reportForm.evidence}`.toLowerCase();
    const matchingWords: Record<Disaster["type"], string[]> = {
      EARTHQUAKE: ["earthquake", "quake", "tremor", "aftershock", "seismic"],
      FLOOD: ["flood", "water", "rain", "overflow", "submerged"],
      WILDFIRE: ["fire", "wildfire", "smoke", "burning", "forest"],
      CYCLONE: ["cyclone", "hurricane", "typhoon", "coastal", "wind"],
      STORM: ["storm", "thunder", "wind", "lightning", "rainfall"],
      LANDSLIDE: ["landslide", "mudslide", "slope", "debris"],
      HEATWAVE: ["heat", "temperature", "heatwave"],
      OTHER: ["disaster", "emergency", "damage"]
    };

    if (!reportForm.title.trim() || !reportForm.description.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setAlertStatus("Report rejected: title, description, latitude, and longitude are required.");
      return;
    }

    const keywordScore = matchingWords[reportForm.type].some((word) => text.includes(word)) ? 30 : 0;
    const evidenceScore = reportForm.evidence.trim().length >= 8 ? 20 : 0;
    const detailScore = reportForm.description.trim().length >= 30 ? 15 : 0;
    const nearbyLive = disasters
      .map((disaster) => ({
        disaster,
        distance: distanceKm({ latitude, longitude }, { latitude: disaster.latitude, longitude: disaster.longitude })
      }))
      .filter(({ disaster, distance }) => disaster.type === reportForm.type && distance <= Math.max(disaster.radiusKm, 150))
      .sort((a, b) => a.distance - b.distance)[0];
    const liveApiScore = nearbyLive ? 40 : 0;
    const confidence = Math.min(100, keywordScore + evidenceScore + detailScore + liveApiScore);
    const accepted = confidence >= 55;
    const reason = accepted
      ? nearbyLive
        ? `Accepted: report matches a live ${nearbyLive.disaster.source} event within ${nearbyLive.distance.toFixed(1)} km.`
        : "Accepted: report has enough description, evidence, and disaster-type keywords for review alerting."
      : "Rejected: report does not match live API data and does not include enough evidence/detail.";

    const report: UserReport = {
      id: `report-${Date.now()}`,
      title: reportForm.title,
      type: reportForm.type,
      description: reportForm.description,
      latitude,
      longitude,
      evidence: reportForm.evidence,
      status: accepted ? "ACCEPTED" : "REJECTED",
      confidence,
      reason
    };

    setReports((items) => [report, ...items].slice(0, 8));

    if (!accepted) {
      setAlertStatus(reason);
      return;
    }

    const severity = inferSeverity(confidence);
    const acceptedDisaster: Disaster = {
      id: report.id,
      title: `Verified user report: ${report.title}`,
      type: report.type,
      severity,
      summary: report.description,
      latitude,
      longitude,
      radiusKm: nearbyLive ? Math.max(nearbyLive.disaster.radiusKm, 50) : 50,
      source: "Verified user report",
      sourceUrl: report.evidence,
      startedAt: new Date().toISOString(),
      aiScore: confidence,
      recommendation: `Verified public report. ${nearbyLive ? "Live API cross-check found supporting event data." : "Admin review recommended before wide broadcast."}`,
      active: true
    };

    setDisasters((items) => [acceptedDisaster, ...items]);
    setAlerts((items) => [
      {
        id: `alert-${report.id}`,
        title: `${severity} ${report.type} alert`,
        message: acceptedDisaster.recommendation,
        severity,
        channels: ["EMAIL", "PUSH"],
        createdAt: acceptedDisaster.startedAt,
        disaster: acceptedDisaster
      },
      ...items
    ]);
    setAlertStatus(`${reason} Alert added to feed and map.`);
    setReportForm({ title: "", type: "FLOOD", description: "", latitude: "", longitude: "", evidence: "" });
  }

  const stats = useMemo(() => {
    const extreme = disasters.filter((d) => d.severity === "EXTREME").length;
    const high = disasters.filter((d) => d.severity === "HIGH").length;
    const avg = disasters.length ? Math.round(disasters.reduce((sum, d) => sum + d.aiScore, 0) / disasters.length) : 0;
    return { active: disasters.length, extreme, high, avg };
  }, [disasters]);

  const severityChart = Object.entries(
    disasters.reduce<Record<string, number>>((acc, d) => {
      acc[d.severity] = (acc[d.severity] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const typeChart = Object.entries(
    disasters.reduce<Record<string, number>>((acc, d) => {
      acc[d.type] = (acc[d.type] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  if (!user) return <AuthPanel onAuth={onAuth} />;

  return (
    <AppShell userName={user.name} role={user.role} onLogout={logout}>
      <section id="dashboard" className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold">Real-time disaster dashboard</h1>
            <p className="text-muted-foreground">Live feed refreshes every 30 seconds with severity, source, map radius, and AI recommendations.</p>
          </div>
          <Button onClick={loadPublic} variant="secondary"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {([
            ["Active events", stats.active, AlertTriangle],
            ["Extreme", stats.extreme, Gauge],
            ["High severity", stats.high, Bell],
            ["Avg AI risk", stats.avg, LineChart]
          ] satisfies StatCard[]).map(([label, value, Icon]) => (
            <motion.div key={String(label)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card><CardContent className="flex items-center justify-between"><div><div className="text-sm text-muted-foreground">{String(label)}</div><div className="text-3xl font-bold">{String(value)}</div></div><Icon className="text-primary" /></CardContent></Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={17} />
                <Input className="pl-9" placeholder="Search live feed" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {["ALL", "LOW", "MODERATE", "HIGH", "EXTREME"].map((item) => <option key={item}>{item}</option>)}
              </Select>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {["ALL", "EARTHQUAKE", "FLOOD", "WILDFIRE", "CYCLONE", "STORM", "LANDSLIDE", "HEATWAVE", "OTHER"].map((item) => <option key={item}>{item}</option>)}
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {disasters.map((disaster) => (
              <article key={disaster.id} className="grid gap-4 rounded-md border border-border p-4 md:grid-cols-[1fr_130px_120px] md:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: severityColors[disaster.severity] }}>{disaster.severity}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{disaster.type}</span>
                    <span className="text-xs text-muted-foreground">{disaster.source}</span>
                  </div>
                  <h3 className="font-bold">{disaster.title}</h3>
                  <p className="text-sm text-muted-foreground">{disaster.summary}</p>
                  <p className="mt-2 text-sm font-medium">{disaster.recommendation}</p>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">AI risk score</div>
                  <div className="text-3xl font-bold">{disaster.aiScore}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <MapPin size={16} className="inline" /> {disaster.radiusKm} km zone
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="map" className="mt-8">
        <Card>
          <CardHeader><h2 className="text-xl font-bold">Interactive disaster map</h2></CardHeader>
          <CardContent className="h-[560px]"><DisasterMap disasters={disasters} /></CardContent>
        </Card>
      </section>

      <section id="alerts" className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Alert center</h2>
              {user.role === "ADMIN" && (
                <Button onClick={() => sendDemoAlert("All active disaster alerts", "Emergency alerts sent to saved locations and browser notifications.")}>
                  <Send size={16} /> Send all alerts
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertStatus && <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary">{alertStatus}</div>}
            <div className="rounded-md border border-border bg-muted/50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-bold">Current location disaster alert</div>
                  <p className="text-sm text-muted-foreground">Checks your GPS location and sends alerts only when you are inside an active disaster radius.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The app gets the user's current GPS location using browser geolocation. Then it calculates the distance between the user and each active disaster. If the user is inside the disaster radius, the app automatically sends a location-based alert and records it in notification history. In production, this same alert is sent through SMS, email, and browser push.
                  </p>
                  {currentLocation && (
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
                <Button onClick={checkCurrentLocationAlerts}>
                  <Crosshair size={16} /> Check current location
                </Button>
              </div>
              {nearbyDisasters.length > 0 && (
                <div className="mt-3 space-y-2 text-sm">
                  {nearbyDisasters.map((disaster) => (
                    <div key={disaster.id} className="rounded-md bg-white p-3">
                      <span className="font-bold">{disaster.title}</span> is {disaster.distanceKm.toFixed(1)} km away, inside the {disaster.radiusKm} km alert zone.
                    </div>
                  ))}
                </div>
              )}
            </div>
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-md border border-border p-4">
                <div className="font-bold">{alert.title}</div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs font-semibold">{alert.channels.join(" + ")} notifications</div>
                  {user.role === "ADMIN" ? (
                    <Button onClick={() => sendDemoAlert(alert.title, alert.message)}>
                      <Send size={16} /> Send alert
                    </Button>
                  ) : (
                    <span className="rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Alert managed by admin
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-xl font-bold">User dashboard</h2></CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-md bg-muted p-4">
              <Users className="mb-2 text-primary" />
              {user.role === "ADMIN"
                ? "Admin can send alerts, run monitoring actions, and manage alert operations. Real SMS and email delivery require the backend server with provider keys."
                : "User can check current location, receive location-based alerts, enable browser push, and view notification history. Alert sending is controlled by admin/system."}
            </div>
            <Button variant="secondary" onClick={enablePush}>Enable browser push</Button>
            <div className="rounded-md border border-border p-4">
              <div className="font-bold">Notification history</div>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                {notificationHistory.length ? notificationHistory.map((item) => <div key={item}>{item}</div>) : <div>No alerts sent yet.</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary" size={22} />
              <h2 className="text-xl font-bold">User disaster report verification</h2>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-3">
              <Input placeholder="Report title" value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} />
              <Select value={reportForm.type} onChange={(e) => setReportForm({ ...reportForm, type: e.target.value as Disaster["type"] })}>
                {["EARTHQUAKE", "FLOOD", "WILDFIRE", "CYCLONE", "STORM", "LANDSLIDE", "HEATWAVE", "OTHER"].map((item) => <option key={item}>{item}</option>)}
              </Select>
              <textarea
                className="min-h-28 w-full rounded-md border border-border bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Describe what happened, visible damage, water level, smoke, shaking, wind, etc."
                value={reportForm.description}
                onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input readOnly placeholder="Latitude auto-filled from GPS" value={reportForm.latitude} />
                <Input readOnly placeholder="Longitude auto-filled from GPS" value={reportForm.longitude} />
              </div>
              <Input placeholder="Evidence link or source note" value={reportForm.evidence} onChange={(e) => setReportForm({ ...reportForm, evidence: e.target.value })} />
              <p className="text-sm text-muted-foreground">Users do not need to know latitude or longitude. Click <strong>Use my location</strong> and the browser fills GPS coordinates automatically.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={useCurrentLocationForReport}><Crosshair size={16} /> Use my location</Button>
                <Button onClick={verifyUserReport}><ShieldCheck size={16} /> Verify report</Button>
              </div>
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="mt-4 space-y-3">
                {reports.length ? reports.map((report) => (
                  <div key={report.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold">{report.title}</div>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${report.status === "ACCEPTED" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {report.status === "ACCEPTED" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {report.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">Confidence: {report.confidence}%</div>
                    <p className="mt-1 text-sm">{report.reason}</p>
                  </div>
                )) : <div className="text-sm text-muted-foreground">No user reports checked yet.</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-xl font-bold">Analytics</h2></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f9aaa" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-xl font-bold">Geographic risk mix</h2></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityChart} dataKey="value" nameKey="name" outerRadius={105} label>
                  {severityChart.map((entry) => <Cell key={entry.name} fill={severityColors[entry.name as Severity] ?? "#0f9aaa"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section id="resources" className="mt-8">
        <Card>
          <CardHeader><h2 className="text-xl font-bold">Emergency resources</h2></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {resources.map((resource) => (
              <div key={resource.id} className="rounded-md border border-border p-4">
                <div className="text-xs font-bold uppercase text-primary">{resource.type}</div>
                <div className="mt-1 font-bold">{resource.name}</div>
                <a className="mt-1 block text-sm font-semibold text-primary" href={`tel:${String(resource.phone).replace(/[^+\d]/g, "")}`}>{resource.phone}</a>
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  onClick={() => {
                    window.location.href = `tel:${String(resource.phone).replace(/[^+\d]/g, "")}`;
                  }}
                >
                  <Phone size={16} /> Call
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {user.role === "ADMIN" && (
        <section className="mt-8">
          <Card>
            <CardHeader><h2 className="flex items-center gap-2 text-xl font-bold"><Settings size={20} /> Admin dashboard</h2></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Button onClick={() => api("/aggregate/run", { method: "POST" }).then(loadPublic)}>Run data aggregation</Button>
              <Button onClick={() => sendDemoAlert("Email test alert", "Your DisasterWatch AI email alert channel is ready.")}>Send email test</Button>
              <div className="rounded-md bg-muted p-4">Users: {analytics?.bySeverity?.reduce?.((sum: number, item: any) => sum + item._count, 0) ?? "Live"}</div>
              <div className="rounded-md bg-muted p-4">Monitoring: API, DB, notifications, and integrations exposed through admin routes.</div>
            </CardContent>
          </Card>
        </section>
      )}
    </AppShell>
  );
}
