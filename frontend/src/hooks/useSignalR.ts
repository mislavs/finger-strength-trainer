import { createContext, createElement, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";

interface SignalRConnection {
  connection: HubConnection
}

const SignalRContext = createContext<SignalRConnection | null>(null);

export function SignalRProvider({ children }: { children: ReactNode }) {
  const lifecycleIdRef = useRef(0);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const connection = useMemo(
    () =>
      new HubConnectionBuilder()
        .withUrl("/hubs/training", { withCredentials: false })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build(),
    [],
  );

  useEffect(() => {
    const lifecycleId = ++lifecycleIdRef.current;

    if (connection.state === HubConnectionState.Disconnected && startPromiseRef.current === null) {
      startPromiseRef.current = connection.start()
        .catch(() => undefined)
        .finally(() => {
          startPromiseRef.current = null;
        });
    }

    return () => {
      const stopConnection = async () => {
        const pendingStart = startPromiseRef.current;
        if (pendingStart !== null) {
          await pendingStart.catch(() => undefined);
        }

        if (lifecycleIdRef.current !== lifecycleId) {
          return;
        }

        if (connection.state !== HubConnectionState.Disconnected) {
          await connection.stop().catch(() => undefined);
        }
      };

      void stopConnection();
    };
  }, [connection]);

  const value = useMemo(
    () => ({
      connection,
    }),
    [connection],
  );

  return createElement(SignalRContext.Provider, { value }, children);
}

export function useSignalR(): SignalRConnection {
  const context = useContext(SignalRContext);

  if (!context) {
    throw new Error("useSignalR must be used within a SignalRProvider.");
  }

  return context;
}
