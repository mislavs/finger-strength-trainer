import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";

import { ForceChart } from "@/components/ForceChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteSessionDialog } from "@/features/history/DeleteSessionDialog";
import { useSession } from "@/features/history/hooks";
import { appRoutes } from "@/lib/app-routes";

function formatDuration(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  if (roundedSeconds < 60) {
    return `${roundedSeconds}s`;
  }

  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function SessionDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export function SessionDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const sessionQuery = useSession(id);

  const chartSamples = useMemo(
    () =>
      sessionQuery.data?.samples.map((sample) => ({
        weightKg: sample.weightKg,
        timestampSeconds: sample.timestampSeconds,
      })) ?? [],
    [sessionQuery.data?.samples],
  );

  if (!id) {
    return <p className="text-sm text-destructive">Invalid session ID.</p>;
  }

  if (sessionQuery.isLoading) {
    return <SessionDetailSkeleton />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Failed to load session details. Please try again.</p>
        <Button asChild variant="outline">
          <Link to={appRoutes.history}>Back to History</Link>
        </Button>
      </div>
    );
  }

  const session = sessionQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Session Detail</h1>
          <p className="text-sm text-muted-foreground">{new Date(session.date).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to={appRoutes.history}>Back to History</Link>
          </Button>
          <Button type="button" variant="destructive" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Delete Session
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session metadata</CardTitle>
          <CardDescription>Summary of the recorded training session.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Type</dt>
              <dd className="mt-1">
                <Badge variant="secondary">{session.type}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Protocol</dt>
              <dd className="mt-1 font-medium">{session.protocolName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <Badge variant={session.isComplete ? "default" : "outline"}>
                  {session.isComplete ? "Complete" : "Incomplete"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Peak force</dt>
              <dd className="mt-1 font-medium">{session.peakForceKg.toFixed(1)} kg</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Average force</dt>
              <dd className="mt-1 font-medium">{session.avgForceKg.toFixed(1)} kg</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Duration</dt>
              <dd className="mt-1 font-medium">{formatDuration(session.durationSeconds)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="gap-4 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle>Force Chart</CardTitle>
          <CardDescription>Full force-time trace for this session.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pt-0">
          <ForceChart samples={chartSamples} windowSeconds={Math.max(1, Math.ceil(session.durationSeconds))} />
        </CardContent>
      </Card>

      <DeleteSessionDialog
        session={session}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDeleted={() => navigate(appRoutes.history)}
      />
    </div>
  );
}
