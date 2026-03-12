import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { SignalRProvider } from "@/hooks/useSignalR";
import App from "@/App";
import "@/index.css";
import { initializeTelemetry } from "@/telemetry";

const queryClient = new QueryClient();

initializeTelemetry(
  import.meta.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  import.meta.env.OTEL_EXPORTER_OTLP_HEADERS,
  import.meta.env.OTEL_RESOURCE_ATTRIBUTES,
  import.meta.env.OTEL_SERVICE_NAME,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <SignalRProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ErrorBoundary>
        </SignalRProvider>
        <Toaster richColors />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
