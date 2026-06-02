import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg" | "none";
}

export function Card({ className, padding = "md", children, ...props }: CardProps) {
  const pads = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border",
        pads[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-semibold text-base", className)} {...props}>
      {children}
    </h3>
  );
}
