"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/utils";
import type { User } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";

export function AuthPanel({ onAuth }: { onAuth: (user: User, token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "admin@disasterwatch.ai", password: "AdminPass123!" });
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      const result = await api<{ user: User; token: string }>(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      onAuth(result.user, result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  async function demoGoogle() {
    const result = await api<{ user: User; token: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ email: "google-user@disasterwatch.ai", name: "Google Responder", googleId: "demo-google-profile" })
    });
    onAuth(result.user, result.token);
  }

  return (
    <div className="grid min-h-screen bg-[url('/hero-disasterwatch.svg')] bg-cover bg-center lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex min-h-[60vh] items-end bg-black/35 p-8 text-white lg:min-h-screen lg:p-12">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl pb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm backdrop-blur">
            <Shield size={18} /> AI-assisted emergency awareness
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">DisasterWatch AI</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">
            Real-time disaster monitoring, risk scoring, maps, alerts, and resources for teams that need to move fast.
          </p>
        </motion.div>
      </section>
      <section className="flex items-center justify-center bg-background/95 p-4 backdrop-blur">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{mode === "login" ? "Sign in" : "Create account"}</h2>
              <p className="text-sm text-muted-foreground">Access your live disaster command center.</p>
            </div>
            {mode === "register" && <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <Button className="w-full" onClick={submit}>{mode === "login" ? "Sign in" : "Create account"}</Button>
            <Button className="w-full" variant="secondary" onClick={demoGoogle}>Continue with Google</Button>
            <button className="w-full text-sm font-medium text-primary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create a new account" : "Use an existing account"}
            </button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
