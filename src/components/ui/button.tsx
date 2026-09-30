import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6851B]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141618] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#F6851B] text-white font-semibold hover:bg-[#E2761B] active:scale-[0.98] shadow-sm shadow-[#F6851B]/20",
        cyber:
          "relative overflow-hidden bg-gradient-to-r from-[#F6851B] to-[#E2761B] text-white font-semibold hover:brightness-110 active:scale-[0.98] shadow-md shadow-[#F6851B]/30 border border-[#F6851B]/40",
        secondary:
          "bg-[#24272A] text-[#F2F4F6] hover:bg-[#2B2F34] active:scale-[0.98] border border-[#3B4046]",
        outline:
          "border border-[#3B4046] bg-transparent text-[#F2F4F6] hover:bg-[#24272A] hover:border-[#848C96] active:scale-[0.98]",
        ghost:
          "text-[#848C96] hover:text-[#F2F4F6] hover:bg-[#24272A] active:scale-[0.98]",
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
