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
        "relative rounded-2xl border border-[#3b4046] bg-[#1e2024] p-5 backdrop-blur-md transition-all duration-200 hover:border-[#f6851b]/50 hover:bg-[#24272a] shadow-md shadow-black/20",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-[#848c96] font-semibold">
          {title}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3b4046] bg-[#24272a] text-[#f6851b] shadow-inner">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f2f4f6] font-mono">
          {value}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs text-[#848c96]">{subtitle}</p>
          {badge && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold border",
                badgeVariant === "success" &&
                  "bg-emerald-950/60 text-emerald-400 border-emerald-500/30",
                badgeVariant === "cyber" &&
                  "bg-[#f6851b]/15 text-[#f6851b] border-[#f6851b]/35",
                badgeVariant === "warning" &&
                  "bg-amber-950/60 text-amber-400 border-amber-500/30",
                badgeVariant === "default" &&
                  "bg-[#24272a] text-[#848c96] border-[#3b4046]"
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
