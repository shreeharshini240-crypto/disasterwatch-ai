import type { DisasterType, Severity } from "@disasterwatch/db";

const severityWeight: Record<Severity, number> = {
  LOW: 25,
  MODERATE: 50,
  HIGH: 75,
  EXTREME: 92
};

const typeWeight: Record<DisasterType, number> = {
  EARTHQUAKE: 8,
  FLOOD: 7,
  WILDFIRE: 10,
  CYCLONE: 9,
  STORM: 6,
  LANDSLIDE: 7,
  HEATWAVE: 8,
  OTHER: 4
};

export function assessRisk(input: {
  type: DisasterType;
  severity: Severity;
  radiusKm: number;
  populationDensity?: number;
  activeHours?: number;
}) {
  const radiusBoost = Math.min(12, input.radiusKm / 12);
  const densityBoost = Math.min(10, (input.populationDensity ?? 500) / 500);
  const timeBoost = Math.min(8, (input.activeHours ?? 1) / 3);
  const score = Math.min(
    100,
    Math.round(severityWeight[input.severity] + typeWeight[input.type] + radiusBoost + densityBoost + timeBoost)
  );

  const trend = score > 85 ? "Escalating" : score > 65 ? "Volatile" : score > 40 ? "Stable watch" : "Low risk";
  const recommendation =
    score > 85
      ? "Activate emergency plan, prepare evacuation routes, and send location-based urgent alerts."
      : score > 65
        ? "Increase monitoring cadence, notify nearby users, and pre-stage emergency resources."
        : score > 40
          ? "Continue monitoring and remind users to review emergency supplies."
          : "Maintain awareness and keep standard notification channels open.";

  return { score, trend, recommendation };
}
