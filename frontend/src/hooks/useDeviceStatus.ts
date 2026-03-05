import { useCallback, useEffect, useMemo, useState } from "react"

import { ApiClientError, apiRequest } from "@/lib/api-client"
import { ensureConnected } from "@/lib/signalr/ensureConnected"
import { getSignalRConnectionErrorMessage, toHubErrorMessage } from "@/lib/signalr/hubErrorMessage"
import { useSignalR } from "@/hooks/useSignalR"

interface DeviceStatus {
  isConnected: boolean
  deviceName: string | null
  batteryVoltage: number | null
  firmwareVersion: string | null
}

interface UseDeviceStatusResult {
  status: DeviceStatus
  isBusy: boolean
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  tare: () => Promise<void>
}

type DeviceCommand = "Connect" | "Disconnect" | "Tare"

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

function toStatusLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message
  }

  return "Something went wrong. Please try again."
}

export function useDeviceStatus(): UseDeviceStatusResult {
  const { connection } = useSignalR()
  const [status, setStatus] = useState<DeviceStatus>(emptyStatus)
  const [activeCommand, setActiveCommand] = useState<DeviceCommand | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isBusy = activeCommand !== null
  const isConnecting = activeCommand === "Connect"

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

        setError(toStatusLoadErrorMessage(loadError))
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
    async (command: DeviceCommand) => {
      setActiveCommand(command)
      setError(null)

      try {
        await ensureConnected(connection)
      } catch {
        setError(getSignalRConnectionErrorMessage())
        setActiveCommand(null)
        return
      }

      try {
        await connection.invoke(command)
      } catch (commandError) {
        setError(toHubErrorMessage(commandError))
      } finally {
        setActiveCommand(null)
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
      isBusy,
      isConnecting,
      error,
      connect,
      disconnect,
      tare,
    }),
    [connect, disconnect, error, isBusy, isConnecting, status, tare],
  )
}
