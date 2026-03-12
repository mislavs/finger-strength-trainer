import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ConnectionBarState = "connecting" | "reconnecting" | "connected" | "reconnectFailed" | "offline"

interface PrimaryAction {
  label: string
  onClick: () => void | Promise<void>
  disabled: boolean
  variant: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
}

const connectionBarStateLabels: Record<ConnectionBarState, string> = {
  connecting: "Connecting...",
  reconnecting: "Reconnecting...",
  connected: "Device Connected",
  reconnectFailed: "Reconnect Failed",
  offline: "Device Offline",
};

const connectionBarStateDotClasses: Record<ConnectionBarState, string> = {
  connecting: "animate-pulse bg-yellow-500",
  reconnecting: "animate-pulse bg-yellow-500",
  connected: "bg-green-500",
  reconnectFailed: "bg-orange-500",
  offline: "bg-red-500",
};

function getConnectionBarState(
  isConnecting: boolean,
  isReconnecting: boolean,
  isConnected: boolean,
  reconnectionFailed: boolean,
): ConnectionBarState {
  if (isConnecting) {
    return "connecting";
  }

  if (isReconnecting) {
    return "reconnecting";
  }

  if (isConnected) {
    return "connected";
  }

  if (reconnectionFailed) {
    return "reconnectFailed";
  }

  return "offline";
}

function getPrimaryAction(
  state: ConnectionBarState,
  isBusy: boolean,
  connect: () => Promise<void>,
  cancelConnect: () => Promise<void>,
  disconnect: () => Promise<void>,
): PrimaryAction {
  switch (state) {
    case "connecting":
      return {
        label: "Cancel",
        onClick: cancelConnect,
        disabled: false,
        variant: "default",
      };
    case "reconnectFailed":
      return {
        label: "Retry",
        onClick: connect,
        disabled: isBusy,
        variant: "default",
      };
    case "connected":
      return {
        label: "Disconnect",
        onClick: disconnect,
        disabled: isBusy,
        variant: "outline",
      };
    case "reconnecting":
      return {
        label: "Connect",
        onClick: connect,
        disabled: true,
        variant: "default",
      };
    case "offline":
      return {
        label: "Connect",
        onClick: connect,
        disabled: isBusy,
        variant: "default",
      };
  }
}

function formatBatteryVoltage(batteryVoltage: number | null): string {
  if (batteryVoltage === null) {
    return "--";
  }

  return `${batteryVoltage.toFixed(2)} V`;
}

export function ConnectionBar() {
  const { status, isBusy, isConnecting, isReconnecting, reconnectionFailed, error, connect, cancelConnect, disconnect, tare } = useDeviceStatus();
  const isConnected = status.isConnected;
  const connectionState = getConnectionBarState(isConnecting, isReconnecting, isConnected, reconnectionFailed);
  const primaryAction = getPrimaryAction(connectionState, isBusy, connect, cancelConnect, disconnect);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`size-2 rounded-full ${connectionBarStateDotClasses[connectionState]}`} />
        <Badge variant={isConnected ? "default" : "secondary"}>
          {connectionBarStateLabels[connectionState]}
        </Badge>
        <span className="text-muted-foreground">Name: {status.deviceName ?? "--"}</span>
        <span className="text-muted-foreground">Battery: {formatBatteryVoltage(status.batteryVoltage)}</span>
        <span className="text-muted-foreground">Firmware: {status.firmwareVersion ?? "--"}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={primaryAction.variant}
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </Button>
        <Button size="sm" variant="secondary" onClick={tare} disabled={!isConnected || isBusy || connectionState === "reconnecting"}>
          Tare
        </Button>
      </div>

      {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
