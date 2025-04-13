// src/components/ui/badge.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40", // Adjusted text color
                outline:
                    "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
                // --- START: Add these variants ---
                success: // Using Tailwind CSS color classes for better theme compatibility
                    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
                warning: // Using Tailwind CSS color classes
                    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                // --- END: Add these variants ---
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

// --- Define interface including new variants ---
export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>, // Use span for HTML attributes
    VariantProps<typeof badgeVariants> {
    asChild?: boolean;
    // Explicitly list all variants for better type safety
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}
// --- End Interface ---

function Badge({
    className,
    variant,
    asChild = false,
    ...props
}: BadgeProps) { // Use the defined BadgeProps type
    const Comp = asChild ? Slot : "span"

    return (
        <Comp
            data-slot="badge"
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    )
}

export { Badge, badgeVariants }
