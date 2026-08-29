import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const sdk = new NodeSDK({
  resource: { 'service.name': 'osiris-api', 'service.version': '0.1.0' } as any,
  traceExporter: exporter,
  instrumentations: [new HttpInstrumentation()],
});

if (process.env.NODE_ENV !== 'test') {
  sdk.start();
}
