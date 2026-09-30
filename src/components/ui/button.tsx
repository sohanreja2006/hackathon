import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] active:scale-[0.98] shadow-sm shadow-blue-500/25",
        cyber:
          "relative overflow-hidden bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white font-semibold hover:brightness-105 active:scale-[0.98] shadow-md shadow-blue-500/20",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-[0.98] border border-slate-200",
        outline:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 active:scale-[0.98] shadow-2xs",
        ghost:
          "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-[0.98]",
        destructive:
          "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-sm font-semibold tracking-wide",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
