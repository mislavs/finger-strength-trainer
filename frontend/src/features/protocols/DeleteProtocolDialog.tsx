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
import { useDeleteProtocol } from "@/features/protocols/hooks";
import type { ProtocolSummary } from "@/features/protocols/models";

interface DeleteProtocolDialogProps {
  protocol: ProtocolSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteProtocolDialog({ protocol, open, onOpenChange }: DeleteProtocolDialogProps) {
  const deleteProtocol = useDeleteProtocol();

  const isSubmitting = deleteProtocol.isPending;

  async function handleDelete(): Promise<void> {
    if (!protocol) {
      return;
    }

    await deleteProtocol.mutateAsync(protocol.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete protocol</DialogTitle>
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
