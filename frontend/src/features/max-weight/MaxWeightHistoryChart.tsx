import { useEffect, useMemo, useRef } from "react";
import uPlot from "uplot";

import type { MaxWeightRecord } from "@/features/max-weight/models";
import { cn } from "@/lib/utils";

import "uplot/dist/uPlot.min.css";

interface MaxWeightHistoryChartProps {
  records: MaxWeightRecord[]
  height?: number
  className?: string
}

type PlotData = [number[], Array<number | null>, Array<number | null>]
type ChartPalette = {
  axisText: string
  axisLine: string
  gridLine: string
  leftLine: string
  rightLine: string
}

const chartDateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

function getChartPalette(): ChartPalette {
  const isDark = document.documentElement.classList.contains("dark");

  if (isDark) {
    return {
      axisText: "#cbd5e1",
      axisLine: "#64748b",
      gridLine: "rgba(148, 163, 184, 0.25)",
      leftLine: "#60a5fa",
      rightLine: "#34d399",
    };
  }

  return {
    axisText: "#334155",
    axisLine: "#94a3b8",
    gridLine: "rgba(100, 116, 139, 0.25)",
    leftLine: "#2563eb",
    rightLine: "#059669",
  };
}

function getLocalDayTimestamp(recordedAt: string): number {
  const value = new Date(recordedAt);
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

interface BuiltPlotData {
  data: PlotData
  dayLabels: string[]
}

function getMaxValue(current: number | null, next: number | null | undefined): number | null {
  if (next == null) {
    return current;
  }

  return current === null ? next : Math.max(current, next);
}

function buildPlotData(records: MaxWeightRecord[]): BuiltPlotData {
  const recordsByDay = new Map<number, { Left: number | null; Right: number | null }>();

  for (const record of records) {
    const dayTimestamp = getLocalDayTimestamp(record.recordedAt);
    const dayEntry = recordsByDay.get(dayTimestamp) ?? { Left: null, Right: null };
    dayEntry.Left = getMaxValue(dayEntry.Left, record.leftWeightKg);
    dayEntry.Right = getMaxValue(dayEntry.Right, record.rightWeightKg);

    recordsByDay.set(dayTimestamp, dayEntry);
  }

  const sortedDays = [...recordsByDay.keys()].sort((left, right) => left - right);
  const dayLabels = sortedDays.map((day) => chartDateFormatter.format(new Date(day)));
  const indices = sortedDays.map((_, index) => index);

  return {
    data: [
      indices,
      sortedDays.map((day) => recordsByDay.get(day)?.Left ?? null),
      sortedDays.map((day) => recordsByDay.get(day)?.Right ?? null),
    ],
    dayLabels,
  };
}

function formatWeightTick(value: number): string {
  return Number(value).toFixed(1);
}

export function MaxWeightHistoryChart({
  records,
  height = 220,
  className,
}: MaxWeightHistoryChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const { data: plotData, dayLabels } = useMemo(() => buildPlotData(records), [records]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const palette = getChartPalette();
    const initialWidth = Math.max(1, Math.floor(container.clientWidth));

    const options: uPlot.Options = {
      width: initialWidth,
      height,
      scales: {
        x: {
          time: false,
          range: (_plot, dataMin, dataMax) => {
            const lo = dataMin ?? 0;
            const hi = dataMax ?? 0;
            return lo === hi ? [lo - 1, hi + 1] : [lo - 0.5, hi + 0.5];
          },
        },
        y: {
          range: (_plot, _dataMin, dataMax) => {
            const maxValue = Math.max(dataMax ?? 1, 1);
            return [0, maxValue * 1.1];
          },
        },
      },
      axes: [
        {
          stroke: palette.axisText,
          grid: { show: false },
          ticks: { stroke: palette.axisLine, width: 1, size: 6 },
          splits: () => dayLabels.map((_, index) => index),
          values: (_plot, ticks) => ticks.map((tick) => dayLabels[Number(tick)] ?? ""),
        },
        {
          stroke: palette.axisText,
          grid: { stroke: palette.gridLine, width: 1 },
          ticks: { stroke: palette.axisLine, width: 1, size: 6 },
          values: (_plot, ticks) => ticks.map((tick) => formatWeightTick(Number(tick))),
        },
      ],
      series: [
        {},
        {
          label: "Left hand",
          stroke: palette.leftLine,
          width: 2,
          points: { show: true, size: 6 },
        },
        {
          label: "Right hand",
          stroke: palette.rightLine,
          width: 2,
          points: { show: true, size: 6 },
        },
      ],
      legend: { show: false },
      cursor: {
        x: false,
        y: false,
        points: { show: false },
      },
      hooks: {
        setCursor: [
          (u) => {
            const idx = u.cursor.idx;
            if (idx == null || idx < 0 || idx >= dayLabels.length) {
              tooltip.style.display = "none";
              return;
            }

            const leftVal = plotData[1][idx];
            const rightVal = plotData[2][idx];
            if (leftVal == null && rightVal == null) {
              tooltip.style.display = "none";
              return;
            }

            const lines: string[] = [`<strong>${dayLabels[idx]}</strong>`];
            if (leftVal != null) {
              lines.push(`<span style="color:${palette.leftLine}">Left:</span> ${leftVal.toFixed(1)} kg`);
            }
            if (rightVal != null) {
              lines.push(`<span style="color:${palette.rightLine}">Right:</span> ${rightVal.toFixed(1)} kg`);
            }
            tooltip.innerHTML = lines.join("<br>");

            const left = u.valToPos(idx, "x");
            const top = u.valToPos(Math.max(leftVal ?? 0, rightVal ?? 0), "y");
            const overRect = u.over.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const offsetX = overRect.left - containerRect.left;
            const offsetY = overRect.top - containerRect.top;

            tooltip.style.display = "block";
            tooltip.style.left = `${offsetX + left + 10}px`;
            tooltip.style.top = `${offsetY + top - 10}px`;
          },
        ],
      },
    };

    const tooltip = document.createElement("div");
    Object.assign(tooltip.style, {
      position: "absolute",
      pointerEvents: "none",
      display: "none",
      padding: "6px 10px",
      borderRadius: "6px",
      fontSize: "12px",
      lineHeight: "1.4",
      background: "var(--color-card, #1e293b)",
      color: "var(--color-card-foreground, #e2e8f0)",
      border: "1px solid var(--color-border, #334155)",
      boxShadow: "0 2px 8px rgba(0,0,0,.25)",
      zIndex: "10",
      whiteSpace: "nowrap",
    });
    container.style.position = "relative";
    container.appendChild(tooltip);

    const plot = new uPlot(options, plotData as uPlot.AlignedData, container);

    plot.over.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
    plotRef.current = plot;

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = Math.max(1, Math.floor(entries[0].contentRect.width));
      plot.setSize({ width: nextWidth, height });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
  }, [dayLabels, height, plotData]);

  return (
    <div ref={containerRef} className={cn("w-full rounded-md border bg-card p-2", className)} />
  );
}
