import { useDeviceStatus } from "@/hooks/useDeviceStatus"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function formatBatteryVoltage(batteryVoltage: number | null): string {
  if (batteryVoltage === null) {
    return "--"
  }

  return `${batteryVoltage.toFixed(2)} V`
}

export function ConnectionBar() {
  const { status, isBusy, isConnecting, error, connect, disconnect, tare } = useDeviceStatus()
  const isConnected = status.isConnected

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`size-2 rounded-full ${
            isConnecting ? "animate-pulse bg-yellow-500" : isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnecting ? "Connecting..." : isConnected ? "Device Connected" : "Device Offline"}
        </Badge>
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
          {isConnecting ? "Connecting..." : isConnected ? "Disconnect" : "Connect"}
        </Button>
        <Button size="sm" variant="secondary" onClick={tare} disabled={!isConnected || isBusy}>
          Tare
        </Button>
      </div>

      {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
