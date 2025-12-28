"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Orientation = "horizontal" | "vertical";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: Orientation;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        className={cn(
          orientation === "vertical" ? "w-px h-full bg-border/20" : "h-px w-full bg-border/20",
          className
        )}
        {...props}
      />
    );
  }
);

Separator.displayName = "Separator";

export default Separator;
