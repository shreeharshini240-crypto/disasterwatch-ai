import { prisma, DisasterType, Severity } from "@disasterwatch/db";
import { assessRisk } from "./ai.js";

const demoEvents = [
  {
    title: "Severe storm cell approaching Tampa Bay",
    type: DisasterType.STORM,
    severity: Severity.HIGH,
    summary: "Radar aggregation indicates damaging wind and localized flooding potential.",
    latitude: 27.9506,
    longitude: -82.4572,
    radiusKm: 65,
    source: "Weather API Fusion",
    sourceUrl: "https://www.weather.gov/"
  },
  {
    title: "Heatwave risk elevated in Phoenix metro",
    type: DisasterType.HEATWAVE,
    severity: Severity.MODERATE,
    summary: "Sustained high temperatures may create health risks for vulnerable residents.",
    latitude: 33.4484,
    longitude: -112.074,
    radiusKm: 90,
    source: "Climate Risk Monitor",
    sourceUrl: "https://www.weather.gov/"
  }
];

export async function aggregateDisasterSources() {
  const created = [];
  for (const event of demoEvents) {
    const exists = await prisma.disaster.findFirst({
      where: { title: event.title, active: true }
    });
    if (exists) continue;

    const ai = assessRisk({ type: event.type, severity: event.severity, radiusKm: event.radiusKm });
    const disaster = await prisma.disaster.create({
      data: {
        ...event,
        startedAt: new Date(),
        aiScore: ai.score,
        recommendation: ai.recommendation
      }
    });
    await prisma.alert.create({
      data: {
        disasterId: disaster.id,
        title: `${event.severity} ${event.type} alert`,
        message: ai.recommendation,
        severity: event.severity,
        channels: ["EMAIL", "PUSH"],
        latitude: event.latitude,
        longitude: event.longitude,
        radiusKm: event.radiusKm
      }
    });
    created.push(disaster);
  }
  return created;
}
