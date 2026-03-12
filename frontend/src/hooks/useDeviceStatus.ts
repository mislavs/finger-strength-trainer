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
  isReconnecting: boolean
  reconnectionFailed: boolean
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
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectionFailed, setReconnectionFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeCommandIdRef = useRef(0);
  const connectAttemptIdRef = useRef(0);
  const canceledConnectAttemptIdRef = useRef<number | null>(null);
  const isBusy = activeCommand !== null;
  const isConnecting = activeCommand === "Connect";

  const clearReconnectState = useCallback(() => {
    setIsReconnecting(false);
    setReconnectionFailed(false);
  }, []);

  const applyStatus = useCallback((nextStatus: Partial<DeviceStatus> | null | undefined) => {
    setStatus(normalizeStatus(nextStatus));
    clearReconnectState();
    setError(null);
  }, [clearReconnectState]);

  const markDisconnected = useCallback((nextError: string | null) => {
    setStatus((currentStatus) => ({
      ...currentStatus,
      isConnected: false,
    }));
    setError(nextError);
  }, []);

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
      applyStatus(nextStatus);
    };

    connection.on("DeviceStatus", onDeviceStatus);
    return () => {
      connection.off("DeviceStatus", onDeviceStatus);
    };
  }, [applyStatus, connection]);

  useEffect(() => {
    const onConnectionLost = () => {
      markDisconnected(null);
      setIsReconnecting(true);
      setReconnectionFailed(false);
    };

    const onReconnected = (nextStatus: DeviceStatus) => {
      applyStatus(nextStatus);
    };

    const onReconnectionFailed = () => {
      markDisconnected("Lost the BLE connection and could not reconnect. Reconnect manually to continue.");
      setIsReconnecting(false);
      setReconnectionFailed(true);
    };

    connection.on("ConnectionLost", onConnectionLost);
    connection.on("Reconnected", onReconnected);
    connection.on("ReconnectionFailed", onReconnectionFailed);

    return () => {
      connection.off("ConnectionLost", onConnectionLost);
      connection.off("Reconnected", onReconnected);
      connection.off("ReconnectionFailed", onReconnectionFailed);
    };
  }, [applyStatus, connection, markDisconnected]);

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
      clearReconnectState();
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
    [clearReconnectState, connection],
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
      isReconnecting,
      reconnectionFailed,
      error,
      connect,
      cancelConnect,
      disconnect,
      tare,
    }),
    [cancelConnect, connect, disconnect, error, isBusy, isConnecting, isReconnecting, reconnectionFailed, status, tare],
  );
}
