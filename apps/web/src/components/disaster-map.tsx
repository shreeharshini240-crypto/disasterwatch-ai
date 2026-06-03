"use client";

import dynamic from "next/dynamic";
import type { Disaster } from "@/lib/types";

const MapInner = dynamic(() => import("./map-inner"), { ssr: false, loading: () => <div className="flex h-[520px] items-center justify-center bg-muted">Loading map</div> });

export function DisasterMap({ disasters }: { disasters: Disaster[] }) {
  return <MapInner disasters={disasters} />;
}
