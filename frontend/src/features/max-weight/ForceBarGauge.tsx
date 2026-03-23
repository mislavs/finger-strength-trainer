import { useMemo, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface ForceBarGaugeProps {
  currentForceKg: number
  peakForceKg: number
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

function formatScaleLabel(value: number): string {
  const digits = value >= 20 ? 0 : 1;
  return `${value.toFixed(digits)} kg`;
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
  peakForceKg,
  maxScaleKg,
  height = 320,
  className,
}: ForceBarGaugeProps) {
  const scaleKg = useMemo(() => {
    const preferredMax = typeof maxScaleKg === "number" && Number.isFinite(maxScaleKg)
      ? maxScaleKg
      : 0;

    return roundScale(Math.max(preferredMax, currentForceKg, peakForceKg, 5));
  }, [currentForceKg, maxScaleKg, peakForceKg]);

  const currentPercent = Math.min(100, Math.max(0, (currentForceKg / scaleKg) * 100));
  const peakPercent = Math.min(100, Math.max(0, (peakForceKg / scaleKg) * 100));
  const gaugeStyle = { height } satisfies CSSProperties;
  const fillStyle = { height: `${currentPercent}%` } satisfies CSSProperties;
  const peakStyle = { bottom: `calc(${peakPercent}% - 1px)` } satisfies CSSProperties;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current force</p>
        <p className="text-3xl font-semibold tabular-nums">{formatForceValue(currentForceKg)}</p>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch gap-3">
        <div className="flex flex-col justify-between py-1 text-xs text-muted-foreground" style={gaugeStyle}>
          <span>{formatScaleLabel(scaleKg)}</span>
          <span>{formatScaleLabel(scaleKg / 2)}</span>
          <span>0 kg</span>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-muted/20" style={gaugeStyle}>
          <div className="absolute inset-x-0 top-1/2 border-t border-border/60" />
          <div className="absolute inset-x-0 top-1/4 border-t border-border/40" />
          <div className="absolute inset-x-0 top-3/4 border-t border-border/40" />

          <div
            className="absolute inset-x-0 bottom-0 rounded-b-xl bg-primary/85 transition-[height] duration-150 ease-out"
            style={fillStyle}
          />

          {peakForceKg > 0 ? (
            <div className="absolute inset-x-0 border-t-2 border-amber-500" style={peakStyle}>
              <span className="absolute right-2 -top-6 rounded-sm bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 shadow-sm dark:text-amber-300">
                Peak
              </span>
            </div>
          ) : null}

          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-xs font-medium text-foreground/80">
            <span>Live</span>
            <span>{formatForceValue(currentForceKg)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
