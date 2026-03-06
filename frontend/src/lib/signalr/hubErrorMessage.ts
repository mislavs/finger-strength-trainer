const genericHubErrorMessage = "Something went wrong. Please try again.";
const signalRConnectionErrorMessage = "Couldn't connect. Please try again.";

const hubExceptionPrefix = /^An unexpected error occurred invoking '.*?' on the server\.\s*HubException:\s*/;

function extractHubMessage(raw: string): string {
  return raw.replace(hubExceptionPrefix, "").trim();
}

export function toHubErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return extractHubMessage(error.message) || genericHubErrorMessage;
  }

  return genericHubErrorMessage;
}

export function getSignalRConnectionErrorMessage(): string {
  return signalRConnectionErrorMessage;
}
