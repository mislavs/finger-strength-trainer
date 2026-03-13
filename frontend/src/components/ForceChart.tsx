import { useEffect, useMemo, useRef } from "react";
import uPlot from "uplot";

import "uplot/dist/uPlot.min.css";

export interface ForceSamplePoint {
  weightKg: number
  timestampSeconds: number
}

interface ForceChartProps {
  samples: ForceSamplePoint[]
  windowSeconds?: number
  height?: number
  targetForceKg?: number
}

type PlotData = [number[], number[]]
type ChartPalette = {
  axisText: string
  axisLine: string
  gridLine: string
  seriesLine: string
  targetLine: string
  targetLabel: string
}

function getChartPalette(): ChartPalette {
  const isDark = document.documentElement.classList.contains("dark");

  if (isDark) {
    return {
      axisText: "#cbd5e1",
      axisLine: "#64748b",
      gridLine: "rgba(148, 163, 184, 0.25)",
      seriesLine: "#60a5fa",
      targetLine: "#f59e0b",
      targetLabel: "#fcd34d",
    };
  }

  return {
    axisText: "#334155",
    axisLine: "#94a3b8",
    gridLine: "rgba(100, 116, 139, 0.25)",
    seriesLine: "#2563eb",
    targetLine: "#d97706",
    targetLabel: "#92400e",
  };
}

function drawTargetLine(u: uPlot, targetForceKg: number, palette: ChartPalette): void {
  if (!(targetForceKg > 0)) {
    return;
  }

  const bboxTop = u.bbox.top;
  const bboxBottom = bboxTop + u.bbox.height;
  const yPosition = u.valToPos(targetForceKg, "y", true);

  if (!Number.isFinite(yPosition) || yPosition < bboxTop || yPosition > bboxBottom) {
    return;
  }

  const left = u.bbox.left;
  const right = left + u.bbox.width;
  const labelY = Math.max(bboxTop + 14, yPosition - 6);
  const label = `Target ${targetForceKg.toFixed(1)} kg`;

  u.ctx.save();
  u.ctx.strokeStyle = palette.targetLine;
  u.ctx.fillStyle = palette.targetLabel;
  u.ctx.lineWidth = 1.5;
  u.ctx.setLineDash([6, 4]);
  u.ctx.beginPath();
  u.ctx.moveTo(left, yPosition);
  u.ctx.lineTo(right, yPosition);
  u.ctx.stroke();
  u.ctx.setLineDash([]);
  u.ctx.font = "12px sans-serif";
  u.ctx.textBaseline = "bottom";
  u.ctx.fillText(label, left + 8, labelY);
  u.ctx.restore();
}

function buildPlotData(samples: ForceSamplePoint[], windowSeconds: number): PlotData {
  if (samples.length === 0) {
    return [[], []];
  }

  const latestTimestamp = samples[samples.length - 1].timestampSeconds;
  const minimumTimestamp = Math.max(0, latestTimestamp - windowSeconds);
  const visibleSamples = samples.filter((sample) => sample.timestampSeconds >= minimumTimestamp);

  return [
    visibleSamples.map((sample) => sample.timestampSeconds),
    visibleSamples.map((sample) => sample.weightKg),
  ];
}

export function ForceChart({ samples, windowSeconds = 30, height = 320, targetForceKg }: ForceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const targetForceKgRef = useRef(targetForceKg);
  const data = useMemo(() => buildPlotData(samples, windowSeconds), [samples, windowSeconds]);

  useEffect(() => {
    targetForceKgRef.current = targetForceKg;
  }, [targetForceKg]);

  useEffect(() => {
    if (!containerRef.current || plotRef.current) {
      return;
    }

    const container = containerRef.current;
    const initialWidth = Math.max(320, Math.floor(container.clientWidth));
    const palette = getChartPalette();
    const options: uPlot.Options = {
      width: initialWidth,
      height,
      scales: {
        x: { time: false },
      },
      axes: [
        {
          label: "Time (s)",
          stroke: palette.axisText,
          grid: { stroke: palette.gridLine, width: 1 },
          ticks: { stroke: palette.axisLine, width: 1, size: 6 },
          values: (_plot, ticks) => ticks.map((tick) => `${Number(tick).toFixed(1)}s`),
        },
        {
          label: "Force (kg)",
          stroke: palette.axisText,
          grid: { stroke: palette.gridLine, width: 1 },
          ticks: { stroke: palette.axisLine, width: 1, size: 6 },
          values: (_plot, ticks) => ticks.map((tick) => Number(tick).toFixed(1)),
        },
      ],
      series: [
        {},
        {
          label: "Force",
          stroke: palette.seriesLine,
          width: 2,
        },
      ],
      legend: { show: false },
      hooks: {
        draw: [
          (plot) => {
            drawTargetLine(plot, targetForceKgRef.current ?? 0, palette);
          },
        ],
      },
    };

    plotRef.current = new uPlot(options, data, container);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [data, height]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data, targetForceKg]);

  useEffect(() => {
    if (!containerRef.current || !plotRef.current) {
      return;
    }

    const container = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = Math.max(320, Math.floor(entries[0].contentRect.width));
      plotRef.current?.setSize({
        width: nextWidth,
        height,
      });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [height]);

  return <div ref={containerRef} className="w-full rounded-md border bg-card p-2" />;
}
