export type Severity = "LOW" | "MODERATE" | "HIGH" | "EXTREME";
export type DisasterType = "EARTHQUAKE" | "FLOOD" | "WILDFIRE" | "CYCLONE" | "STORM" | "LANDSLIDE" | "HEATWAVE" | "OTHER";

export type Disaster = {
  id: string;
  title: string;
  type: DisasterType;
  severity: Severity;
  summary: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  source: string;
  sourceUrl?: string;
  startedAt: string;
  aiScore: number;
  recommendation: string;
  active: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
};
