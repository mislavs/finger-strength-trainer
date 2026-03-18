import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteSession } from "@/features/history/hooks";
import type { SessionSummary } from "@/features/history/models";
import { formatDateTime } from "@/lib/utils";

interface DeleteSessionDialogProps {
  session: SessionSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteSessionDialog({ session, open, onOpenChange, onDeleted }: DeleteSessionDialogProps) {
  const deleteSession = useDeleteSession();
  const isSubmitting = deleteSession.isPending;

  async function handleDelete(): Promise<void> {
    if (!session) {
      return;
    }

    await deleteSession.mutateAsync(session.id);
    onOpenChange(false);
    onDeleted?.();
  }

  const sessionLabel = session ? `${formatDateTime(session.date)} (${session.protocolName})` : "this session";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete session</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium text-foreground">{sessionLabel}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isSubmitting || !session}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
