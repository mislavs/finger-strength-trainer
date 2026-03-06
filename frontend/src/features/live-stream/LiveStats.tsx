import type { LiveStatsSnapshot } from "@/features/live-stream/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LiveStatsProps {
  stats: LiveStatsSnapshot
}

function formatForce(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function formatDuration(totalSeconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function LiveStats({ stats }: LiveStatsProps) {
  const average = stats.avgForceKg === null ? "--" : formatForce(stats.avgForceKg);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Current Force" value={formatForce(stats.currentForceKg)} />
      <StatCard label="Peak Force" value={formatForce(stats.peakForceKg)} />
      <StatCard label="Duration" value={formatDuration(stats.durationSeconds)} />
      <StatCard label="Average Force" value={average} />
    </div>
  );
}
