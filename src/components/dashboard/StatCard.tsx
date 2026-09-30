import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "success" | "cyber" | "warning" | "default";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeVariant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-md transition-all duration-200 hover:border-zinc-700/80 hover:bg-zinc-900/70",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-cyan-400">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 font-mono">
          {value}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs text-zinc-500">{subtitle}</p>
          {badge && (
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-mono font-medium border",
                badgeVariant === "success" &&
                  "bg-emerald-950/60 text-emerald-400 border-emerald-500/30",
                badgeVariant === "cyber" &&
                  "bg-cyan-950/60 text-cyan-400 border-cyan-500/30",
                badgeVariant === "warning" &&
                  "bg-amber-950/60 text-amber-400 border-amber-500/30",
                badgeVariant === "default" &&
                  "bg-zinc-800 text-zinc-300 border-zinc-700/60"
              )}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
