import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HubConnectionState } from "@microsoft/signalr";

import { ApiClientError, apiRequest } from "@/lib/api-client";
import { ensureConnected } from "@/lib/signalr/ensureConnected";
import { getSignalRConnectionErrorMessage, toHubErrorMessage } from "@/lib/signalr/hubErrorMessage";
import { useSignalR } from "@/hooks/useSignalR";

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
  cancelConnect: () => Promise<void>
  disconnect: () => Promise<void>
  tare: () => Promise<void>
}

type DeviceCommand = "Connect" | "Disconnect" | "Tare"

const emptyStatus: DeviceStatus = {
  isConnected: false,
  deviceName: null,
  batteryVoltage: null,
  firmwareVersion: null,
};

function normalizeStatus(status: Partial<DeviceStatus> | null | undefined): DeviceStatus {
  if (!status) {
    return emptyStatus;
  }

  return {
    isConnected: Boolean(status.isConnected),
    deviceName: status.deviceName ?? null,
    batteryVoltage: status.batteryVoltage ?? null,
    firmwareVersion: status.firmwareVersion ?? null,
  };
}

function toStatusLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function useDeviceStatus(): UseDeviceStatusResult {
  const { connection } = useSignalR();
  const [status, setStatus] = useState<DeviceStatus>(emptyStatus);
  const [activeCommand, setActiveCommand] = useState<DeviceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeCommandIdRef = useRef(0);
  const connectAttemptIdRef = useRef(0);
  const canceledConnectAttemptIdRef = useRef<number | null>(null);
  const isBusy = activeCommand !== null;
  const isConnecting = activeCommand === "Connect";

  useEffect(() => {
    const abortController = new AbortController();

    const loadInitialStatus = async () => {
      try {
        const initialStatus = await apiRequest<DeviceStatus>("/device/status", {
          signal: abortController.signal,
        });
        setStatus(normalizeStatus(initialStatus));
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        setError(toStatusLoadErrorMessage(loadError));
      }
    };

    void loadInitialStatus();

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    const onDeviceStatus = (nextStatus: DeviceStatus) => {
      setStatus(normalizeStatus(nextStatus));
      setError(null);
    };

    connection.on("DeviceStatus", onDeviceStatus);
    return () => {
      connection.off("DeviceStatus", onDeviceStatus);
    };
  }, [connection]);

  const runCommand = useCallback(
    async (command: DeviceCommand) => {
      const commandId = ++activeCommandIdRef.current;
      const connectAttemptId = command === "Connect" ? ++connectAttemptIdRef.current : null;
      const wasConnectCanceled = () =>
        connectAttemptId !== null && canceledConnectAttemptIdRef.current === connectAttemptId;
      const finishCommand = () => {
        if (activeCommandIdRef.current === commandId) {
          setActiveCommand(null);
        }
      };

      if (connectAttemptId !== null) {
        canceledConnectAttemptIdRef.current = null;
      }

      setActiveCommand(command);
      setError(null);

      try {
        await ensureConnected(connection);
      } catch {
        if (wasConnectCanceled()) {
          finishCommand();
          return;
        }

        setError(getSignalRConnectionErrorMessage());
        finishCommand();
        return;
      }

      if (wasConnectCanceled()) {
        finishCommand();
        return;
      }

      try {
        await connection.invoke(command);
      } catch (commandError) {
        if (wasConnectCanceled()) {
          return;
        }

        setError(toHubErrorMessage(commandError));
      } finally {
        finishCommand();
      }
    },
    [connection],
  );

  const connect = useCallback(async () => {
    await runCommand("Connect");
  }, [runCommand]);

  const cancelConnect = useCallback(async () => {
    if (activeCommand !== "Connect") {
      return;
    }

    canceledConnectAttemptIdRef.current = connectAttemptIdRef.current;
    try {
      setError(null);
      setActiveCommand(null);

      if (connection.state === HubConnectionState.Disconnected) {
        return;
      }

      await connection.stop();
    } catch {
      // Stopping the hub connection is best effort when canceling an in-flight connect.
    }
  }, [activeCommand, connection]);

  const disconnect = useCallback(async () => {
    await runCommand("Disconnect");
  }, [runCommand]);

  const tare = useCallback(async () => {
    await runCommand("Tare");
  }, [runCommand]);

  return useMemo(
    () => ({
      status,
      isBusy,
      isConnecting,
      error,
      connect,
      cancelConnect,
      disconnect,
      tare,
    }),
    [cancelConnect, connect, disconnect, error, isBusy, isConnecting, status, tare],
  );
}
