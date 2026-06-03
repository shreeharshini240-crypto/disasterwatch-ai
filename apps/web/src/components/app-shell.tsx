import { Activity, Bell, LifeBuoy, LogOut, Map, Shield, UserRound } from "lucide-react";
import { Button } from "./ui/button";

export function AppShell({ userName, role, onLogout, children }: { userName: string; role: string; onLogout: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
              <Shield size={22} />
            </div>
            <div>
              <div className="text-lg font-bold">DisasterWatch AI</div>
              <div className="text-xs text-muted-foreground">Live risk intelligence</div>
            </div>
          </div>
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            <a href="#dashboard" className="flex items-center gap-2"><Activity size={16} /> Dashboard</a>
            <a href="#map" className="flex items-center gap-2"><Map size={16} /> Map</a>
            <a href="#alerts" className="flex items-center gap-2"><Bell size={16} /> Alerts</a>
            <a href="#resources" className="flex items-center gap-2"><LifeBuoy size={16} /> Resources</a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">{userName}</div>
              <div className="text-xs text-muted-foreground">{role}</div>
            </div>
            <Button variant="secondary" onClick={onLogout} title="Sign out"><LogOut size={16} /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
