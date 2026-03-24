import { useMemo, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface ForceBarGaugeProps {
  currentForceKg: number
  leftPeakKg: number
  rightPeakKg: number
  maxScaleKg?: number
  height?: number
  className?: string
}

function normalizeForceValue(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function formatForceValue(value: number): string {
  return `${normalizeForceValue(value).toFixed(1)} kg`;
}

function roundScale(maxValue: number): number {
  if (maxValue <= 10) {
    return 10;
  }

  if (maxValue <= 25) {
    return Math.ceil(maxValue / 5) * 5;
  }

  if (maxValue <= 50) {
    return Math.ceil(maxValue / 10) * 10;
  }

  return Math.ceil(maxValue / 20) * 20;
}

export function ForceBarGauge({
  currentForceKg,
  leftPeakKg,
  rightPeakKg,
  maxScaleKg,
  height = 260,
  className,
}: ForceBarGaugeProps) {
  const scaleKg = useMemo(() => {
    const preferredMax = typeof maxScaleKg === "number" && Number.isFinite(maxScaleKg)
      ? maxScaleKg
      : 0;

    return roundScale(Math.max(preferredMax, currentForceKg, leftPeakKg, rightPeakKg, 5));
  }, [currentForceKg, leftPeakKg, maxScaleKg, rightPeakKg]);

  const currentPercent = Math.min(100, Math.max(0, (currentForceKg / scaleKg) * 100));
  const leftPeakPercent = Math.min(100, Math.max(0, (leftPeakKg / scaleKg) * 100));
  const rightPeakPercent = Math.min(100, Math.max(0, (rightPeakKg / scaleKg) * 100));
  const gaugeStyle = { height } satisfies CSSProperties;
  const fillStyle = { height: `${currentPercent}%` } satisfies CSSProperties;
  const leftPeakStyle = { bottom: `calc(${leftPeakPercent}% - 1px)` } satisfies CSSProperties;
  const rightPeakStyle = { bottom: `calc(${rightPeakPercent}% - 1px)` } satisfies CSSProperties;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current force</p>
        <p className="text-3xl font-semibold tabular-nums">{formatForceValue(currentForceKg)}</p>
      </div>

      <div>
        <div className="relative overflow-hidden rounded-xl border bg-muted/20" style={gaugeStyle}>
          <div className="absolute inset-x-0 top-1/2 border-t border-border/60" />
          <div className="absolute inset-x-0 top-1/4 border-t border-border/40" />
          <div className="absolute inset-x-0 top-3/4 border-t border-border/40" />

          <div
            className="absolute inset-x-0 bottom-0 rounded-b-xl bg-primary/85 transition-[height] duration-150 ease-out"
            style={fillStyle}
          />

          {leftPeakKg > 0 ? (
            <div className="absolute inset-x-0 border-t-2 border-blue-500" style={leftPeakStyle}>
              <span className="absolute left-2 -top-6 rounded-sm bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600 shadow-sm dark:text-blue-400">
                Left
              </span>
            </div>
          ) : null}

          {rightPeakKg > 0 ? (
            <div className="absolute inset-x-0 border-t-2 border-emerald-500" style={rightPeakStyle}>
              <span className="absolute right-2 -top-6 rounded-sm bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 shadow-sm dark:text-emerald-400">
                Right
              </span>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
