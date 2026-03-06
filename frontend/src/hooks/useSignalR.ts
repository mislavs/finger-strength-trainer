import { createContext, createElement, useContext, useEffect, useMemo, type ReactNode } from "react";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

interface SignalRConnection {
  connection: HubConnection
}

const SignalRContext = createContext<SignalRConnection | null>(null);

export function SignalRProvider({ children }: { children: ReactNode }) {
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
    connection.start().catch(() => undefined);

    return () => {
      void connection.stop();
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
