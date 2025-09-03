import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Default: white fill + pink border; hover -> pink fill + white text
        default:
          "bg-background text-foreground border border-[hsl(var(--primary-700))] text-[hsl(var(--primary-700))] hover:bg-[hsl(var(--primary-700))] hover:text-white dark:hover:bg-[hsl(var(--primary-700))]/10 dark:hover:text-[hsl(var(--primary-700))]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "bg-background text-[hsl(var(--primary-700))] border border-[hsl(var(--primary-700))] hover:bg-[hsl(var(--primary-700))] hover:text-white dark:hover:bg-[hsl(var(--primary-700))]/20 dark:hover:text-[hsl(var(--primary-700))]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/80 dark:hover:text-foreground",
        link: "text-[hsl(var(--primary-700))] underline-offset-4 hover:underline",
        filled:
          "bg-[hsl(var(--primary-700))] text-white hover:bg-[hsl(var(--primary-600))]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
