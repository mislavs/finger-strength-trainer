import { useEffect, useMemo, useRef } from "react"
import uPlot from "uplot"

import type { ForceSamplePoint } from "@/features/live-stream/models"

import "uplot/dist/uPlot.min.css"

interface ForceChartProps {
  samples: ForceSamplePoint[]
  windowSeconds?: number
  height?: number
}

type PlotData = [number[], number[]]

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
    const options: uPlot.Options = {
      width: initialWidth,
      height,
      scales: {
        x: { time: false },
      },
      axes: [
        {
          label: "Time (s)",
          values: (_plot, ticks) => ticks.map((tick) => `${Number(tick).toFixed(1)}s`),
        },
        {
          label: "Force (kg)",
          values: (_plot, ticks) => ticks.map((tick) => Number(tick).toFixed(1)),
        },
      ],
      series: [
        {},
        {
          label: "Force",
          stroke: "#2563eb",
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
