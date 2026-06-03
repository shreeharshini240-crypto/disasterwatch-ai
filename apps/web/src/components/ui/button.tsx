import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground hover:brightness-95",
        variant === "secondary" && "border border-border bg-white hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        variant === "danger" && "bg-destructive text-white hover:brightness-95",
        className
      )}
      {...props}
    />
  );
}
