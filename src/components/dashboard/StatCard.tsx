import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "success" | "cyber" | "warning" | "default";
  iconColor?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeVariant = "default",
  iconColor = "text-[#2563EB]",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm hover:border-blue-200 transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50/80">
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        {badge && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
              badgeVariant === "success" && "bg-emerald-50 text-emerald-700 border-emerald-200",
              badgeVariant === "cyber" && "bg-blue-50 text-[#2563EB] border-blue-200",
              badgeVariant === "warning" && "bg-amber-50 text-amber-700 border-amber-200",
              badgeVariant === "default" && "bg-slate-100 text-slate-600 border-slate-200"
            )}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {value}
        </div>
        <p className="text-xs font-medium text-slate-500">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-400 pt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
