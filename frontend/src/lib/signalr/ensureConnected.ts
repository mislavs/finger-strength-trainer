import { HubConnection, HubConnectionState } from "@microsoft/signalr"

const connectionReadyTimeoutMs = 5000
const connectionReadyPollMs = 75

export async function ensureConnected(connection: HubConnection): Promise<void> {
  const isConnected = () => connection.state === HubConnectionState.Connected

  if (isConnected()) {
    return
  }

  if (connection.state === HubConnectionState.Disconnected) {
    await connection.start()
  }

  const startedAt = Date.now()

  while (!isConnected()) {
    if (Date.now() - startedAt > connectionReadyTimeoutMs) {
      throw new Error("SignalR connection is not ready yet. Please try again.")
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, connectionReadyPollMs)
    })

    if (connection.state === HubConnectionState.Disconnected) {
      await connection.start()
    }
  }
}
