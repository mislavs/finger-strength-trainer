import { useCallback, useEffect, useMemo, useState } from "react"
import { HubConnectionState } from "@microsoft/signalr"

import { ApiClientError, apiRequest } from "@/lib/api-client"
import { ensureConnected } from "@/lib/signalr/ensureConnected"
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

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred."
}

export function useDeviceStatus(): UseDeviceStatusResult {
  const { connection, connectionState } = useSignalR()
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
    async (command: DeviceCommand) => {
      setActiveCommand(command)
      setError(null)

      try {
        await ensureConnected(connection)
        await connection.invoke(command)
      } catch (commandError) {
        setError(toErrorMessage(commandError))
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
      connectionState,
      isBusy,
      isConnecting,
      error,
      connect,
      disconnect,
      tare,
    }),
    [connect, connectionState, disconnect, error, isBusy, isConnecting, status, tare],
  )
}
