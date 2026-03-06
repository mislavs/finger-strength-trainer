import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSessions } from "@/features/history/hooks";
import { appRoutes } from "@/lib/app-routes";

function HistoryTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  if (roundedSeconds < 60) {
    return `${roundedSeconds}s`;
  }

  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function HistoryPage() {
  const sessionsQuery = useSessions();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>

      <Card>
        <CardHeader>
          <CardTitle>Saved sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsQuery.isLoading ? (
            <HistoryTableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Peak Force</TableHead>
                  <TableHead>Avg Force</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsQuery.data?.length ? (
                  sessionsQuery.data.map((session) => {
                    const detailPath = appRoutes.historyDetail.replace(":id", session.id);

                    return (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          <Link className="hover:underline" to={detailPath}>
                            {new Date(session.date).toLocaleString()}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{session.type}</Badge>
                        </TableCell>
                        <TableCell>{session.protocolName}</TableCell>
                        <TableCell>{session.peakForceKg.toFixed(1)} kg</TableCell>
                        <TableCell>{session.avgForceKg.toFixed(1)} kg</TableCell>
                        <TableCell>{formatDuration(session.durationSeconds)}</TableCell>
                        <TableCell>
                          <Badge variant={session.isComplete ? "default" : "outline"}>
                            {session.isComplete ? "Complete" : "Incomplete"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {sessionsQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">Failed to load session history. Please try again.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
