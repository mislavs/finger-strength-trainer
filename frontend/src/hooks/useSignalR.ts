import { useEffect, useMemo, useState } from "react"
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr"

interface SignalRConnection {
  connection: HubConnection
  connectionState: HubConnectionState
}

export function useSignalR(): SignalRConnection {
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

    connection.onreconnecting(() => {
      syncState()
    })
    connection.onreconnected(() => {
      syncState()
    })
    connection.onclose(() => {
      syncState()
    })

    return () => {
      void connection.stop()
    }
  }, [connection])

  return { connection, connectionState }
}
