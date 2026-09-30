import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-700 border border-slate-200",
        cyber:
          "bg-blue-50 text-[#2563EB] border border-blue-200 shadow-2xs",
        metamask:
          "bg-amber-50 text-amber-700 border border-amber-200",
        success:
          "bg-emerald-50 text-emerald-700 border border-emerald-200",
        warning:
          "bg-amber-50 text-amber-700 border border-amber-200",
        outline:
          "border border-slate-200 text-slate-700 bg-white",
        purple:
          "bg-purple-50 text-purple-700 border border-purple-200",
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
