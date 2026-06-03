const http = require("http");

const PORT = Number(process.env.PORT || 4000);
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const ALERT_EMAIL_FROM = process.env.ALERT_EMAIL_FROM || "onboarding@resend.dev";
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO || "";

const disasters = [
  {
    id: "flood-houston",
    title: "Flash flood warning near Houston",
    type: "FLOOD",
    severity: "HIGH",
    summary: "Heavy rainfall and saturated drainage corridors are creating flash flood risk.",
    latitude: 29.7604,
    longitude: -95.3698,
    radiusKm: 75,
    source: "NOAA Weather Aggregator",
    startedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    aiScore: 82,
    recommendation: "Avoid low-water crossings, move vehicles to higher ground, and monitor evacuation updates.",
    active: true
  },
  {
    id: "wildfire-la",
    title: "Wildfire expansion east of Los Angeles",
    type: "WILDFIRE",
    severity: "EXTREME",
    summary: "Dry winds and low humidity are accelerating fire spread near foothill communities.",
    latitude: 34.1478,
    longitude: -117.85,
    radiusKm: 55,
    source: "Incident News Monitor",
    startedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    aiScore: 93,
    recommendation: "Prepare go-bags, keep phones charged, and follow evacuation orders immediately.",
    active: true
  },
  {
    id: "india-cyclone-watch",
    title: "Severe cyclone rainfall watch near Chennai",
    type: "CYCLONE",
    severity: "HIGH",
    summary: "Coastal rainfall and strong wind risk may affect low-lying areas.",
    latitude: 13.0827,
    longitude: 80.2707,
    radiusKm: 250,
    source: "Regional Weather Monitor",
    startedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    aiScore: 84,
    recommendation: "Stay indoors, avoid coastal travel, keep emergency contacts ready, and monitor official updates.",
    active: true
  }
];

const history = [];

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function distanceKm(a, b) {
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

async function sendEmail({ to, subject, text }) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is missing");
  if (!to) throw new Error("ALERT_EMAIL_TO is missing");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: ALERT_EMAIL_FROM,
      to,
      subject,
      text
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Resend failed with ${response.status}`);
  return result;
}

http
  .createServer(async (req, res) => {
    if (req.method === "OPTIONS") return json(res, 200, { ok: true });

    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    const path = url.pathname.replace(/^\/api/, "");

    try {
      if (path === "/health") return json(res, 200, { ok: true, emailReady: Boolean(RESEND_API_KEY && ALERT_EMAIL_TO) });

      if (path === "/auth/login" && req.method === "POST") {
        return json(res, 200, {
          user: { id: "real-email-user", email: ALERT_EMAIL_TO || "admin@disasterwatch.ai", name: "DisasterWatch Admin", role: "ADMIN" },
          token: "real-email-local-token"
        });
      }

      if (path === "/disasters" && req.method === "GET") return json(res, 200, disasters);
      if (path === "/resources" && req.method === "GET") {
        return json(res, 200, [
          { id: "h1", type: "Hospital", name: "Metro Emergency Hospital", latitude: 13.08, longitude: 80.27, phone: "108" },
          { id: "s1", type: "Shelter", name: "Community Relief Shelter", latitude: 13.09, longitude: 80.25, phone: "1070" },
          { id: "p1", type: "Police", name: "Nearest Police Station", latitude: 13.07, longitude: 80.26, phone: "100" },
          { id: "f1", type: "Fire", name: "Fire and Rescue Station", latitude: 13.1, longitude: 80.28, phone: "101" }
        ]);
      }

      if (path === "/alerts" && req.method === "GET") {
        return json(
          res,
          200,
          disasters.map((disaster) => ({
            id: `alert-${disaster.id}`,
            title: `${disaster.severity} ${disaster.type} alert`,
            message: disaster.recommendation,
            severity: disaster.severity,
            channels: ["EMAIL"],
            disaster
          }))
        );
      }

      if (path === "/analytics" && req.method === "GET") return json(res, 200, { bySeverity: [], byType: [], metrics: [] });

      if (path === "/notifications/test" && req.method === "POST") {
        const result = await sendEmail({
          to: ALERT_EMAIL_TO,
          subject: "DisasterWatch AI email test",
          text: "Real email alert test from DisasterWatch AI."
        });
        history.unshift({ title: "Email test alert", status: "SENT", providerId: result.id, createdAt: new Date().toISOString() });
        return json(res, 200, { status: "SENT", provider: "resend", result });
      }

      if (path === "/alerts/check-location" && req.method === "POST") {
        const body = await readBody(req);
        const location = { latitude: Number(body.latitude), longitude: Number(body.longitude) };
        const matched = disasters
          .map((disaster) => ({
            ...disaster,
            distanceKm: distanceKm(location, { latitude: disaster.latitude, longitude: disaster.longitude })
          }))
          .filter((disaster) => disaster.distanceKm <= disaster.radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm);

        const sent = [];
        for (const disaster of matched) {
          const subject = `Location alert: ${disaster.title}`;
          const text = `${disaster.severity} ${disaster.type} detected ${disaster.distanceKm.toFixed(1)} km from your current location.\n\n${disaster.recommendation}`;
          const result = await sendEmail({ to: ALERT_EMAIL_TO, subject, text });
          sent.push({ disasterId: disaster.id, status: "SENT", provider: "resend", result });
          history.unshift({ title: subject, status: "SENT", providerId: result.id, createdAt: new Date().toISOString() });
        }

        if (!matched.length) {
          history.unshift({ title: "Location checked: no disaster zone near you", status: "NO_MATCH", createdAt: new Date().toISOString() });
        }

        return json(res, 200, { matched, sent, history });
      }

      return json(res, 404, { error: "Not found" });
    } catch (error) {
      return json(res, 500, { error: error.message || "Server error" });
    }
  })
  .listen(PORT, () => {
    console.log(`DisasterWatch real alert server running at http://localhost:${PORT}`);
    console.log(`Email ready: ${Boolean(RESEND_API_KEY && ALERT_EMAIL_TO)}`);
  });
