import { registerOTel } from '@vercel/otel'
import { LangfuseExporter } from 'langfuse-vercel'

export function register() {
  // Skip instrumentation in development to improve startup performance
  if (process.env.NODE_ENV !== 'production') {
    return
  }
  
  registerOTel({
    serviceName: 'qurious-ai-search',
    traceExporter: new LangfuseExporter()
  })
}
