"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
};

export function ChartContainer({ className, children, config, ...props }: ChartContainerProps) {
  return (
    <div
      data-chart
      className={cn("space-y-2", className)}
      style={
        Object.fromEntries(
          Object.entries(config).map(([key, val]) => [`--chart-${key}`, val.color])
        ) as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function ChartLegend({
  config,
  className,
}: {
  config: ChartConfig;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-xs text-slate-600", className)}>
      {Object.entries(config).map(([key, val]) => (
        <div key={key} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: val.color }} />
          <span>{val.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartBars({
  rows,
  className,
}: {
  rows: { key: string; label: string; value: number; display?: string; color?: string }[];
  className?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className={cn("space-y-2", className)}>
      {rows.map((row) => (
        <div key={row.key} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">{row.label}</span>
            <span className="font-medium text-slate-800">{row.display ?? row.value.toLocaleString("en-US")}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-100">
            <div
              className="h-full rounded-sm transition-all duration-300"
              style={{
                width: `${(row.value / max) * 100}%`,
                backgroundColor: row.color ?? `var(--chart-${row.key})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
