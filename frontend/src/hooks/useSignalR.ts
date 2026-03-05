import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr"

interface SignalRConnection {
  connection: HubConnection
  connectionState: HubConnectionState
}

const SignalRContext = createContext<SignalRConnection | null>(null)

export function SignalRProvider({ children }: { children: ReactNode }) {
  const connection = useMemo(
    () =>
      new HubConnectionBuilder()
        .withUrl("/hubs/training", { withCredentials: false })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build(),
    [],
  )

  const [connectionState, setConnectionState] = useState<HubConnectionState>(connection.state)

  useEffect(() => {
    const syncState = () => {
      setConnectionState(connection.state)
    }

    connection.onreconnecting(syncState)
    connection.onreconnected(syncState)
    connection.onclose(syncState)

    connection.start().then(syncState, syncState)

    return () => {
      void connection.stop()
    }
  }, [connection])

  const value = useMemo(
    () => ({
      connection,
      connectionState,
    }),
    [connection, connectionState],
  )

  return createElement(SignalRContext.Provider, { value }, children)
}

export function useSignalR(): SignalRConnection {
  const context = useContext(SignalRContext)

  if (!context) {
    throw new Error("useSignalR must be used within a SignalRProvider.")
  }

  return context
}
