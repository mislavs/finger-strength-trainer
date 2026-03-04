import { HubConnectionState } from "@microsoft/signalr"

import { useDeviceStatus } from "@/hooks/useDeviceStatus"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const connectionStateLabels: Record<HubConnectionState, string> = {
  [HubConnectionState.Disconnected]: "Disconnected",
  [HubConnectionState.Connected]: "Connected",
  [HubConnectionState.Connecting]: "Connecting",
  [HubConnectionState.Disconnecting]: "Disconnecting",
  [HubConnectionState.Reconnecting]: "Reconnecting",
}

function formatBatteryVoltage(batteryVoltage: number | null): string {
  if (batteryVoltage === null) {
    return "--"
  }

  return `${batteryVoltage.toFixed(2)} V`
}

export function ConnectionBar() {
  const { status, connectionState, isBusy, error, connect, disconnect, tare } = useDeviceStatus()
  const isConnected = status.isConnected

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`size-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "Device Connected" : "Device Offline"}</Badge>
        <Badge variant="outline">Hub: {connectionStateLabels[connectionState]}</Badge>
        <span className="text-muted-foreground">Name: {status.deviceName ?? "--"}</span>
        <span className="text-muted-foreground">Battery: {formatBatteryVoltage(status.batteryVoltage)}</span>
        <span className="text-muted-foreground">Firmware: {status.firmwareVersion ?? "--"}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isConnected ? "outline" : "default"}
          onClick={isConnected ? disconnect : connect}
          disabled={isBusy}
        >
          {isConnected ? "Disconnect" : "Connect"}
        </Button>
        <Button size="sm" variant="secondary" onClick={tare} disabled={!isConnected || isBusy}>
          Tare
        </Button>
      </div>

      {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
