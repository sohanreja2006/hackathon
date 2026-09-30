import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-800 text-zinc-300 border border-zinc-700/60",
        cyber:
          "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-xs shadow-cyan-500/10",
        success:
          "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30",
        warning:
          "bg-amber-950/60 text-amber-300 border border-amber-500/30",
        outline:
          "border border-zinc-700 text-zinc-300 bg-transparent",
        purple:
          "bg-purple-950/60 text-purple-300 border border-purple-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
