import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500 text-zinc-950 font-semibold hover:bg-cyan-400 active:scale-[0.98] shadow-sm shadow-cyan-500/20",
        cyber:
          "relative overflow-hidden bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 text-zinc-950 font-semibold hover:brightness-110 active:scale-[0.98] shadow-md shadow-cyan-950/40 border border-cyan-400/30",
        secondary:
          "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700/60",
        outline:
          "border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800/80 hover:text-white active:scale-[0.98]",
        ghost:
          "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:scale-[0.98]",
        destructive:
          "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base tracking-wide",
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
