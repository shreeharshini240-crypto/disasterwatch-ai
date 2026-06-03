"use client";

import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { Disaster } from "@/lib/types";

const colors = { LOW: "#16a34a", MODERATE: "#eab308", HIGH: "#f97316", EXTREME: "#dc2626" };

export default function MapInner({ disasters }: { disasters: Disaster[] }) {
  return (
    <MapContainer center={[39.5, -98.35]} zoom={4} scrollWheelZoom className="rounded-lg">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {disasters.map((disaster) => (
        <div key={disaster.id}>
          <CircleMarker
            center={[disaster.latitude, disaster.longitude]}
            radius={10}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: colors[disaster.severity],
              fillOpacity: 1
            }}
          >
            <Popup>
              <strong>{disaster.title}</strong>
              <br />
              {disaster.severity} {disaster.type}
              <br />
              AI risk: {disaster.aiScore}
            </Popup>
          </CircleMarker>
          <Circle
            center={[disaster.latitude, disaster.longitude]}
            radius={disaster.radiusKm * 1000}
            pathOptions={{ color: colors[disaster.severity], fillColor: colors[disaster.severity], fillOpacity: 0.18 }}
          />
        </div>
      ))}
    </MapContainer>
  );
}
