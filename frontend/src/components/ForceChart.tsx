import { useEffect, useRef } from "react";
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
    };
  }

  return {
    axisText: "#334155",
    axisLine: "#94a3b8",
    gridLine: "rgba(100, 116, 139, 0.25)",
    seriesLine: "#2563eb",
    targetLine: "#d97706",
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

  u.ctx.save();
  u.ctx.strokeStyle = palette.targetLine;
  u.ctx.lineWidth = 1.5;
  u.ctx.setLineDash([6, 4]);
  u.ctx.beginPath();
  u.ctx.moveTo(left, yPosition);
  u.ctx.lineTo(right, yPosition);
  u.ctx.stroke();
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

function yRange(targetRef: React.RefObject<number | undefined>): uPlot.Scale.Range {
  return (_plot, dataMin, dataMax) => {
    const target = targetRef.current;
    const lo = Math.min(dataMin ?? 0, 0);
    const hi = Math.max(dataMax ?? 1, 1);

    if (typeof target !== "number" || !Number.isFinite(target) || target <= 0) {
      return [lo, hi];
    }

    const headroom = target * 0.15;
    return [lo, Math.max(hi, target + headroom)];
  };
}

export function ForceChart({ samples, windowSeconds = 30, height = 320, targetForceKg }: ForceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const targetForceKgRef = useRef(targetForceKg);
  const samplesRef = useRef(samples);
  const windowSecondsRef = useRef(windowSeconds);
  const rafIdRef = useRef(0);
  const lastRenderedRef = useRef<ForceSamplePoint[] | null>(null);

  samplesRef.current = samples;
  windowSecondsRef.current = windowSeconds;
  targetForceKgRef.current = targetForceKg;

  useEffect(() => {
    if (!containerRef.current) {
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
        y: { range: yRange(targetForceKgRef) },
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
          paths: uPlot.paths.spline!(),
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

    const plot = new uPlot(options, [[], []], container);
    plotRef.current = plot;

    let latestDataTimestamp = 0;
    let anchorWallTime = 0;

    const tick = () => {
      const currentSamples = samplesRef.current;
      const ws = windowSecondsRef.current;

      if (currentSamples !== lastRenderedRef.current) {
        lastRenderedRef.current = currentSamples;
        latestDataTimestamp = currentSamples.length > 0
          ? currentSamples[currentSamples.length - 1].timestampSeconds
          : 0;
        anchorWallTime = performance.now();
        plot.setData(buildPlotData(currentSamples, ws));
      }

      if (latestDataTimestamp > 0) {
        const elapsedSeconds = (performance.now() - anchorWallTime) / 1000;
        const rightEdge = elapsedSeconds < 0.25
          ? latestDataTimestamp + elapsedSeconds
          : latestDataTimestamp;
        plot.setScale("x", { min: rightEdge - ws, max: rightEdge });
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = Math.max(320, Math.floor(entries[0].contentRect.width));
      plot.setSize({ width: nextWidth, height });
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
      lastRenderedRef.current = null;
      resizeObserver.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
  }, [height]);

  return <div ref={containerRef} className="w-full rounded-md border bg-card p-2" />;
}
