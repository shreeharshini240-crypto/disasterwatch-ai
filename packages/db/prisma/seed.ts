import bcrypt from "bcryptjs";
import { prisma } from "../src";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@disasterwatch.ai";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "AdminPass123!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "DisasterWatch Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 12)
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "user@disasterwatch.ai" },
    update: {},
    create: {
      email: "user@disasterwatch.ai",
      name: "Prepared Citizen",
      role: "USER",
      passwordHash: await bcrypt.hash("UserPass123!", 12)
    }
  });

  await prisma.location.createMany({
    data: [
      { userId: user.id, label: "Home", latitude: 40.7128, longitude: -74.006, radiusKm: 80 },
      { userId: user.id, label: "Family", latitude: 34.0522, longitude: -118.2437, radiusKm: 120 }
    ],
    skipDuplicates: true
  });

  const disasters = [
    {
      title: "Flash flood warning near Houston",
      type: "FLOOD" as const,
      severity: "HIGH" as const,
      summary: "Heavy rainfall and saturated drainage corridors are creating flash flood risk.",
      latitude: 29.7604,
      longitude: -95.3698,
      radiusKm: 75,
      source: "NOAA Weather Aggregator",
      sourceUrl: "https://www.weather.gov/",
      startedAt: new Date(Date.now() - 1000 * 60 * 55),
      aiScore: 82,
      recommendation: "Avoid low-water crossings, move vehicles to higher ground, and monitor evacuation updates."
    },
    {
      title: "Wildfire expansion east of Los Angeles",
      type: "WILDFIRE" as const,
      severity: "EXTREME" as const,
      summary: "Dry winds and low humidity are accelerating fire spread near foothill communities.",
      latitude: 34.1478,
      longitude: -117.8500,
      radiusKm: 55,
      source: "Incident News Monitor",
      sourceUrl: "https://inciweb.wildfire.gov/",
      startedAt: new Date(Date.now() - 1000 * 60 * 90),
      aiScore: 93,
      recommendation: "Prepare go-bags, keep phones charged, and follow evacuation orders immediately."
    },
    {
      title: "Moderate earthquake reported near Anchorage",
      type: "EARTHQUAKE" as const,
      severity: "MODERATE" as const,
      summary: "Regional seismic sensors reported a moderate event with aftershock potential.",
      latitude: 61.2181,
      longitude: -149.9003,
      radiusKm: 120,
      source: "USGS Earthquake Feed",
      sourceUrl: "https://earthquake.usgs.gov/",
      startedAt: new Date(Date.now() - 1000 * 60 * 125),
      aiScore: 58,
      recommendation: "Inspect utilities, avoid damaged structures, and expect aftershocks."
    }
  ];

  for (const disaster of disasters) {
    const saved = await prisma.disaster.create({ data: disaster });
    await prisma.alert.create({
      data: {
        disasterId: saved.id,
        title: `${disaster.severity} ${disaster.type} alert`,
        message: disaster.recommendation,
        severity: disaster.severity,
        channels: ["EMAIL", "PUSH"],
        latitude: disaster.latitude,
        longitude: disaster.longitude,
        radiusKm: disaster.radiusKm
      }
    });
    await prisma.analytics.createMany({
      data: [
        { disasterId: saved.id, metric: "risk_score", value: disaster.aiScore, dimensions: { type: disaster.type } },
        { disasterId: saved.id, metric: "affected_radius_km", value: disaster.radiusKm, dimensions: { severity: disaster.severity } }
      ]
    });
  }

  console.log(`Seeded DisasterWatch AI. Admin: ${admin.email} / ${adminPassword}`);
}

main().finally(async () => prisma.$disconnect());
