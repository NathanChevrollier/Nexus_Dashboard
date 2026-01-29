import React from "react";
import { cn } from "@/lib/utils";

type ProgressProps = {
  value?: number;
  className?: string;
  indicatorClassName?: string;
};

export const Progress: React.FC<ProgressProps> = ({ value = 0, className = "", indicatorClassName = "" }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className={cn("w-full rounded-full bg-slate-800 overflow-hidden", className)}>
      <div className={cn("h-2 transition-all duration-200", indicatorClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
};

export default Progress;
