export async function register() {
  // Skip instrumentation in development to improve startup performance
  // Also skip during builds to prevent hangs with heavy OTel dependency graph
  if (process.env.NODE_ENV !== 'production' || process.env.DISABLE_OTEL === '1') {
    return
  }
  
  // Use dynamic imports to prevent static resolution of heavy OTel dependencies during build
  const { registerOTel } = await import('@vercel/otel')
  const { LangfuseExporter } = await import('langfuse-vercel')
  
  registerOTel({
    serviceName: 'qurious-ai-search',
    traceExporter: new LangfuseExporter()
  })
}
