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
import { useDeleteRepeaterProtocol } from "@/features/repeater-protocols/hooks";
import type { RepeaterProtocolSummary } from "@/features/repeater-protocols/models";

interface DeleteRepeaterProtocolDialogProps {
  protocol: RepeaterProtocolSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteRepeaterProtocolDialog({
  protocol,
  open,
  onOpenChange,
}: DeleteRepeaterProtocolDialogProps) {
  const deleteRepeaterProtocol = useDeleteRepeaterProtocol();

  const isSubmitting = deleteRepeaterProtocol.isPending;

  async function handleDelete(): Promise<void> {
    if (!protocol) {
      return;
    }

    await deleteRepeaterProtocol.mutateAsync(protocol.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete repeater protocol</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium text-foreground">{protocol?.name}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting || !protocol}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
