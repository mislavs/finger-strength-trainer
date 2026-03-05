import { useEffect, useMemo, useRef } from "react"
import uPlot from "uplot"

import "uplot/dist/uPlot.min.css"

export interface ForceSamplePoint {
  weightKg: number
  timestampSeconds: number
}

interface ForceChartProps {
  samples: ForceSamplePoint[]
  windowSeconds?: number
  height?: number
}

type PlotData = [number[], number[]]
type ChartPalette = {
  axisText: string
  axisLine: string
  gridLine: string
  seriesLine: string
}

function getChartPalette(): ChartPalette {
  const isDark = document.documentElement.classList.contains("dark")

  if (isDark) {
    return {
      axisText: "#cbd5e1",
      axisLine: "#64748b",
      gridLine: "rgba(148, 163, 184, 0.25)",
      seriesLine: "#60a5fa",
    }
  }

  return {
    axisText: "#334155",
    axisLine: "#94a3b8",
    gridLine: "rgba(100, 116, 139, 0.25)",
    seriesLine: "#2563eb",
  }
}

function buildPlotData(samples: ForceSamplePoint[], windowSeconds: number): PlotData {
  if (samples.length === 0) {
    return [[], []]
  }

  const latestTimestamp = samples[samples.length - 1].timestampSeconds
  const minimumTimestamp = Math.max(0, latestTimestamp - windowSeconds)
  const visibleSamples = samples.filter((sample) => sample.timestampSeconds >= minimumTimestamp)

  return [
    visibleSamples.map((sample) => sample.timestampSeconds),
    visibleSamples.map((sample) => sample.weightKg),
  ]
}

export function ForceChart({ samples, windowSeconds = 30, height = 320 }: ForceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const plotRef = useRef<uPlot | null>(null)
  const data = useMemo(() => buildPlotData(samples, windowSeconds), [samples, windowSeconds])

  useEffect(() => {
    if (!containerRef.current || plotRef.current) {
      return
    }

    const container = containerRef.current
    const initialWidth = Math.max(320, Math.floor(container.clientWidth))
    const palette = getChartPalette()
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
    }

    plotRef.current = new uPlot(options, data, container)

    return () => {
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [data, height])

  useEffect(() => {
    plotRef.current?.setData(data)
  }, [data])

  useEffect(() => {
    if (!containerRef.current || !plotRef.current) {
      return
    }

    const container = containerRef.current
    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = Math.max(320, Math.floor(entries[0].contentRect.width))
      plotRef.current?.setSize({
        width: nextWidth,
        height,
      })
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [height])

  return <div ref={containerRef} className="w-full rounded-md border bg-card p-2" />
}
