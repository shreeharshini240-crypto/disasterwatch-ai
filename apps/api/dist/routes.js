import { Router } from "express";
import { z } from "zod";
import { prisma, DisasterType, NotificationChannel, Role, Severity } from "@disasterwatch/db";
import { hashPassword, requireAuth, requireRole, signToken, verifyPassword } from "./auth.js";
import { assessRisk } from "./services/ai.js";
import { aggregateDisasterSources } from "./services/aggregation.js";
import { sendNotification } from "./services/notifications.js";
export const router = Router();
const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8)
});
router.get("/health", (_req, res) => res.json({ ok: true, service: "DisasterWatch AI API" }));
router.post("/auth/register", async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing)
        return res.status(409).json({ error: "Email is already registered" });
    const user = await prisma.user.create({
        data: { name: body.name, email: body.email, passwordHash: await hashPassword(body.password) },
        select: { id: true, email: true, name: true, role: true }
    });
    return res.status(201).json({ user, token: signToken(user) });
});
router.post("/auth/login", async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    return res.json({ user: safeUser, token: signToken(safeUser) });
});
router.post("/auth/google", async (req, res) => {
    const body = z.object({ email: z.string().email(), name: z.string(), googleId: z.string() }).parse(req.body);
    const user = await prisma.user.upsert({
        where: { email: body.email },
        update: { googleId: body.googleId, name: body.name },
        create: { email: body.email, name: body.name, googleId: body.googleId },
        select: { id: true, email: true, name: true, role: true }
    });
    return res.json({ user, token: signToken(user) });
});
router.get("/me", requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            locations: true,
            emergencyContacts: true,
            notifications: { orderBy: { createdAt: "desc" }, take: 20 }
        }
    });
    return res.json(user);
});
router.get("/disasters", async (req, res) => {
    const q = String(req.query.q ?? "");
    const severity = String(req.query.severity ?? "");
    const type = String(req.query.type ?? "");
    const disasters = await prisma.disaster.findMany({
        where: {
            active: req.query.active === "false" ? undefined : true,
            title: q ? { contains: q, mode: "insensitive" } : undefined,
            severity: severity && severity !== "ALL" ? severity : undefined,
            type: type && type !== "ALL" ? type : undefined
        },
        orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
        take: 100
    });
    return res.json(disasters);
});
router.post("/disasters", requireAuth, requireRole(Role.ADMIN), async (req, res) => {
    const body = z.object({
        title: z.string(),
        type: z.nativeEnum(DisasterType),
        severity: z.nativeEnum(Severity),
        summary: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number(),
        source: z.string(),
        sourceUrl: z.string().optional()
    }).parse(req.body);
    const ai = assessRisk(body);
    const disaster = await prisma.disaster.create({
        data: { ...body, startedAt: new Date(), aiScore: ai.score, recommendation: ai.recommendation }
    });
    return res.status(201).json(disaster);
});
router.get("/alerts", requireAuth, async (req, res) => {
    const alerts = await prisma.alert.findMany({
        where: { OR: [{ userId: req.user.id }, { userId: null }] },
        include: { disaster: true },
        orderBy: { createdAt: "desc" },
        take: 50
    });
    return res.json(alerts);
});
router.patch("/alerts/:id/acknowledge", requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const alert = await prisma.alert.update({ where: { id }, data: { acknowledged: true } });
    return res.json(alert);
});
function distanceKm(a, b) {
    const earthRadiusKm = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
router.post("/alerts/check-location", requireAuth, async (req, res) => {
    const body = z.object({
        latitude: z.number(),
        longitude: z.number(),
        phone: z.string().optional()
    }).parse(req.body);
    const disasters = await prisma.disaster.findMany({ where: { active: true } });
    const matched = disasters
        .map((disaster) => ({
        ...disaster,
        distanceKm: distanceKm(body, { latitude: disaster.latitude, longitude: disaster.longitude })
    }))
        .filter((disaster) => disaster.distanceKm <= disaster.radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    const sent = [];
    for (const disaster of matched) {
        const title = `Location alert: ${disaster.title}`;
        const message = `${disaster.severity} ${disaster.type} detected ${disaster.distanceKm.toFixed(1)} km from your current location. ${disaster.recommendation}`;
        const email = await sendNotification({
            userId: req.user.id,
            channel: NotificationChannel.EMAIL,
            to: req.user.email,
            title,
            body: message
        });
        sent.push(email);
        if (body.phone) {
            const sms = await sendNotification({
                userId: req.user.id,
                channel: NotificationChannel.SMS,
                to: body.phone,
                title,
                body: message
            });
            sent.push(sms);
        }
    }
    return res.json({ matched, sent });
});
router.get("/analytics", requireAuth, async (_req, res) => {
    const [bySeverity, byType, metrics] = await Promise.all([
        prisma.disaster.groupBy({ by: ["severity"], _count: true }),
        prisma.disaster.groupBy({ by: ["type"], _count: true }),
        prisma.analytics.findMany({ orderBy: { capturedAt: "desc" }, take: 100 })
    ]);
    return res.json({ bySeverity, byType, metrics });
});
router.get("/resources", async (_req, res) => {
    return res.json([
        { id: "h1", type: "Hospital", name: "Metro Emergency Hospital", latitude: 40.755, longitude: -73.98, phone: "+1-555-0101" },
        { id: "s1", type: "Shelter", name: "Central Community Shelter", latitude: 34.061, longitude: -118.252, phone: "+1-555-0144" },
        { id: "p1", type: "Police", name: "North District Police Station", latitude: 29.771, longitude: -95.36, phone: "911" },
        { id: "f1", type: "Fire", name: "Station 8 Fire Response", latitude: 33.457, longitude: -112.071, phone: "911" }
    ]);
});
router.post("/locations", requireAuth, async (req, res) => {
    const body = z.object({
        label: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number().default(50)
    }).parse(req.body);
    const location = await prisma.location.create({ data: { ...body, userId: req.user.id } });
    return res.status(201).json(location);
});
router.post("/contacts", requireAuth, async (req, res) => {
    const body = z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string().email().optional(),
        relation: z.string()
    }).parse(req.body);
    const contact = await prisma.emergencyContact.create({ data: { ...body, userId: req.user.id } });
    return res.status(201).json(contact);
});
router.post("/notifications/test", requireAuth, async (req, res) => {
    const body = z.object({
        channel: z.nativeEnum(NotificationChannel),
        to: z.string().optional()
    }).parse(req.body);
    const notification = await sendNotification({
        userId: req.user.id,
        channel: body.channel,
        to: body.to ?? req.user.email,
        title: "DisasterWatch AI test alert",
        body: "Your notification channel is connected."
    });
    return res.json(notification);
});
router.post("/aggregate/run", requireAuth, requireRole(Role.ADMIN), async (_req, res) => {
    const created = await aggregateDisasterSources();
    return res.json({ created });
});
router.get("/admin/users", requireAuth, requireRole(Role.ADMIN), async (_req, res) => {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, createdAt: true, _count: { select: { locations: true, notifications: true } } },
        orderBy: { createdAt: "desc" }
    });
    return res.json(users);
});
router.get("/admin/system", requireAuth, requireRole(Role.ADMIN), async (_req, res) => {
    const [users, disasters, alerts, notifications] = await Promise.all([
        prisma.user.count(),
        prisma.disaster.count(),
        prisma.alert.count(),
        prisma.notification.count()
    ]);
    return res.json({ users, disasters, alerts, notifications, integrations: { twilio: Boolean(process.env.TWILIO_ACCOUNT_SID), email: Boolean(process.env.SMTP_HOST), weather: Boolean(process.env.OPENWEATHER_API_KEY), news: Boolean(process.env.NEWS_API_KEY) } });
});
