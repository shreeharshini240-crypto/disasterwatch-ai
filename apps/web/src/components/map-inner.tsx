"use client";

import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import type { Disaster } from "@/lib/types";

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const colors = { LOW: "#16a34a", MODERATE: "#eab308", HIGH: "#f97316", EXTREME: "#dc2626" };

export default function MapInner({ disasters }: { disasters: Disaster[] }) {
  return (
    <MapContainer center={[39.5, -98.35]} zoom={4} scrollWheelZoom className="rounded-lg">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {disasters.map((disaster) => (
        <div key={disaster.id}>
          <Marker position={[disaster.latitude, disaster.longitude]} icon={icon}>
            <Popup>
              <strong>{disaster.title}</strong>
              <br />
              {disaster.severity} {disaster.type}
              <br />
              AI risk: {disaster.aiScore}
            </Popup>
          </Marker>
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
