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

interface TareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTare: () => Promise<boolean>
  isBusy: boolean
}

export function TareDialog({ open, onOpenChange, onTare, isBusy }: TareDialogProps) {
  async function handleTare(): Promise<void> {
    const success = await onTare();
    if (success) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isBusy) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent
        showCloseButton={!isBusy}
        onPointerDownOutside={(e) => { if (isBusy) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isBusy) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Tare Device</DialogTitle>
          <DialogDescription>
            Make sure nothing is applying force to the device, then press Tare to zero the sensor.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Skip
          </Button>
          <Button type="button" onClick={() => void handleTare()} disabled={isBusy}>
            {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            Tare
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
