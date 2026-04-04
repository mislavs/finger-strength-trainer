import { Link } from "react-router-dom";
import { Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteWorkoutProtocol, useWorkoutProtocols } from "@/features/workout-protocols/hooks";
import type { WorkoutProtocolSummary } from "@/features/workout-protocols/models";
import { appRoutes } from "@/lib/app-routes";

function buildWorkoutProtocolPath(template: string, id: string): string {
  return template.replace(":id", id);
}

export function WorkoutProtocolListPage() {
  const workoutProtocolsQuery = useWorkoutProtocols();
  const deleteWorkoutProtocol = useDeleteWorkoutProtocol();
  const [protocolToDelete, setProtocolToDelete] = useState<WorkoutProtocolSummary | null>(null);

  const isDeleting = deleteWorkoutProtocol.isPending;

  async function handleDeleteConfirm(): Promise<void> {
    if (!protocolToDelete) {
      return;
    }

    await deleteWorkoutProtocol.mutateAsync(protocolToDelete.id);
    setProtocolToDelete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Workout Protocols</h1>
          <p className="text-sm text-muted-foreground">
            Build longer workouts by chaining saved repeater protocols with rest between blocks.
          </p>
        </div>

        <Button asChild>
          <Link to={appRoutes.workoutProtocolsNew}>
            <Plus className="size-4" />
            New Workout Protocol
          </Link>
        </Button>
      </div>

      {workoutProtocolsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : null}

      {workoutProtocolsQuery.isError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load workout protocols. Please try again.
        </p>
      ) : null}

      {!workoutProtocolsQuery.isLoading && !workoutProtocolsQuery.data?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No workout protocols yet</CardTitle>
            <CardDescription>Create your first workout protocol to chain multiple repeater protocols together.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {workoutProtocolsQuery.data?.map((protocol) => (
          <Card key={protocol.id}>
            <CardHeader>
              <CardTitle>{protocol.name}</CardTitle>
              <CardDescription>
                {protocol.itemCount} items, {protocol.totalBlocks} total blocks
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={buildWorkoutProtocolPath(appRoutes.workoutProtocolsRun, protocol.id)}>
                  <Play className="size-4" />
                  Run
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={buildWorkoutProtocolPath(appRoutes.workoutProtocolsEdit, protocol.id)}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
              <Button type="button" variant="destructive" onClick={() => setProtocolToDelete(protocol)}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(protocolToDelete)} onOpenChange={(open) => !open && setProtocolToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workout protocol</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{protocolToDelete?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProtocolToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting || !protocolToDelete}>
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
