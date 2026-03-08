import { ZoneContextManager } from "@opentelemetry/context-zone";
import { SpanStatusCode } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

function parseDelimitedValues(value: string): Record<string, string> {
  if (!value.trim()) {
    return {};
  }

  return Object.fromEntries(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((pair) => {
        const separatorIndex = pair.indexOf("=");
        if (separatorIndex === -1) {
          return [pair, ""];
        }

        return [
          pair.slice(0, separatorIndex).trim(),
          pair.slice(separatorIndex + 1).trim(),
        ];
      }),
  );
}

function resolveRequestDetails(request: Request | RequestInit) {
  const method = (request.method ?? "GET").toUpperCase();
  const rawUrl =
    request instanceof Request
      ? request.url
      : typeof request === "object" && "url" in request && typeof request.url === "string"
        ? request.url
        : undefined;

  if (!rawUrl) {
    return { method, path: undefined as string | undefined, url: undefined as string | undefined };
  }

  try {
    const resolvedUrl = new URL(rawUrl, window.location.origin);
    return {
      method,
      path: `${resolvedUrl.pathname}${resolvedUrl.search}`,
      url: resolvedUrl.toString(),
    };
  } catch {
    return {
      method,
      path: rawUrl,
      url: rawUrl,
    };
  }
}

function resolveUrlDetails(url: string, method = "GET") {
  try {
    const resolvedUrl = new URL(url, window.location.origin);
    return {
      method: method.toUpperCase(),
      path: `${resolvedUrl.pathname}${resolvedUrl.search}`,
      url: resolvedUrl.toString(),
    };
  } catch {
    return {
      method: method.toUpperCase(),
      path: url,
      url,
    };
  }
}

export function initializeTelemetry(
  otlpEndpoint = "",
  headers = "",
  resourceAttributes = "",
  serviceName = "",
) {
  const trimmedEndpoint = otlpEndpoint.trim();
  if (!trimmedEndpoint) {
    return;
  }

  const tracesUrl = `${trimmedEndpoint.replace(/\/+$/, "")}/v1/traces`;
  const exporter = new OTLPTraceExporter({
    url: tracesUrl,
    headers: parseDelimitedValues(headers),
  });

  const attributes = parseDelimitedValues(resourceAttributes);
  attributes[ATTR_SERVICE_NAME] = serviceName.trim() || attributes[ATTR_SERVICE_NAME] || "frontend";

  const spanProcessors = [new SimpleSpanProcessor(exporter)];
  if (import.meta.env.DEV) {
    spanProcessors.unshift(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes(attributes),
    spanProcessors,
  });

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        clearTimingResources: true,
        ignoreUrls: [tracesUrl],
        propagateTraceHeaderCorsUrls: [/\/api\//],
        requestHook(span, request) {
          const details = resolveRequestDetails(request);
          if (details.path) {
            span.setAttribute("url.full", details.url ?? details.path);
            span.setAttribute("http.url", details.url ?? details.path);
            span.setAttribute("app.request.path", details.path);
          }
        },
        applyCustomAttributesOnSpan(span, request, result) {
          const details = resolveRequestDetails(request);
          const method = details.method;
          if (details.path) {
            span.setAttribute("app.request.path", details.path);
          }

          if (result instanceof Response) {
            const responseDetails = resolveUrlDetails(result.url, method);
            span.updateName(`${responseDetails.method} ${responseDetails.path}`);
            span.setAttribute("url.full", responseDetails.url);
            span.setAttribute("http.url", responseDetails.url);
            span.setAttribute("app.request.path", responseDetails.path);
            span.setAttribute("http.response.status_code", result.status);
            span.setAttribute("http.status_code", result.status);

            if (result.status >= 500) {
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `HTTP ${result.status}`,
              });
            }
          }
        },
      }),
    ],
  });
}
