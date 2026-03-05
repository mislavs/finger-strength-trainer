const genericHubErrorMessage = "Something went wrong. Please try again."
const signalRConnectionErrorMessage = "Couldn't connect. Please try again."

export function toHubErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "HubException") {
    return error.message.trim() || genericHubErrorMessage
  }

  return genericHubErrorMessage
}

export function getSignalRConnectionErrorMessage(): string {
  return signalRConnectionErrorMessage
}
