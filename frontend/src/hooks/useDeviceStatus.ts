import { useCallback, useEffect, useMemo, useState } from "react"
import { HubConnection, HubConnectionState } from "@microsoft/signalr"

import { ApiClientError, apiRequest } from "@/lib/api-client"
import { useSignalR } from "@/hooks/useSignalR"

interface DeviceStatus {
  isConnected: boolean
  deviceName: string | null
  batteryVoltage: number | null
  firmwareVersion: string | null
}

interface UseDeviceStatusResult {
  status: DeviceStatus
  connectionState: HubConnectionState
  isBusy: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  tare: () => Promise<void>
}

const emptyStatus: DeviceStatus = {
  isConnected: false,
  deviceName: null,
  batteryVoltage: null,
  firmwareVersion: null,
}

function normalizeStatus(status: Partial<DeviceStatus> | null | undefined): DeviceStatus {
  if (!status) {
    return emptyStatus
  }

  return {
    isConnected: Boolean(status.isConnected),
    deviceName: status.deviceName ?? null,
    batteryVoltage: status.batteryVoltage ?? null,
    firmwareVersion: status.firmwareVersion ?? null,
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred."
}

async function ensureConnected(connection: HubConnection): Promise<void> {
  if (connection.state === HubConnectionState.Disconnected) {
    await connection.start()
  }
}

export function useDeviceStatus(): UseDeviceStatusResult {
  const { connection, connectionState } = useSignalR()
  const [status, setStatus] = useState<DeviceStatus>(emptyStatus)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()

    const loadInitialStatus = async () => {
      try {
        const initialStatus = await apiRequest<DeviceStatus>("/device/status", {
          signal: abortController.signal,
        })
        setStatus(normalizeStatus(initialStatus))
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return
        }

        setError(toErrorMessage(loadError))
      }
    }

    void loadInitialStatus()

    return () => {
      abortController.abort()
    }
  }, [])

  useEffect(() => {
    const onDeviceStatus = (nextStatus: DeviceStatus) => {
      setStatus(normalizeStatus(nextStatus))
      setError(null)
    }

    connection.on("DeviceStatus", onDeviceStatus)
    return () => {
      connection.off("DeviceStatus", onDeviceStatus)
    }
  }, [connection])

  const runCommand = useCallback(
    async (command: "Connect" | "Disconnect" | "Tare") => {
      setIsBusy(true)
      setError(null)

      try {
        await ensureConnected(connection)
        await connection.invoke(command)
      } catch (commandError) {
        setError(toErrorMessage(commandError))
      } finally {
        setIsBusy(false)
      }
    },
    [connection],
  )

  const connect = useCallback(async () => {
    await runCommand("Connect")
  }, [runCommand])

  const disconnect = useCallback(async () => {
    await runCommand("Disconnect")
  }, [runCommand])

  const tare = useCallback(async () => {
    await runCommand("Tare")
  }, [runCommand])

  return useMemo(
    () => ({
      status,
      connectionState,
      isBusy,
      error,
      connect,
      disconnect,
      tare,
    }),
    [connect, connectionState, disconnect, error, isBusy, status, tare],
  )
}
