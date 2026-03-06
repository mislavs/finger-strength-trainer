import type { LiveStreamStoppedStats } from "@/features/live-stream/models";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SaveDiscardDialogProps {
  open: boolean
  stats: LiveStreamStoppedStats | null
  isBusy: boolean
  onSave: () => Promise<void>
  onDiscard: () => Promise<void>
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

export function SaveDiscardDialog({ open, stats, isBusy, onSave, onDiscard }: SaveDiscardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Save live stream session?</DialogTitle>
          <DialogDescription>
            Choose whether to keep this recording in session history.
          </DialogDescription>
        </DialogHeader>

        {stats ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Peak</dt>
            <dd className="text-right font-medium">{formatForce(stats.peakForceKg)}</dd>
            <dt className="text-muted-foreground">Average</dt>
            <dd className="text-right font-medium">{formatForce(stats.avgForceKg)}</dd>
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="text-right font-medium">{formatDuration(stats.durationSeconds)}</dd>
          </dl>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => void onDiscard()} disabled={isBusy}>
            Discard
          </Button>
          <Button onClick={() => void onSave()} disabled={isBusy}>
            Save Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
