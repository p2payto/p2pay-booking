import { getRequestHeader } from 'h3'

export const getRealIP = (event) => {
  const { public: { isDeployed } } = useRuntimeConfig(event)

  // Local/dev testing: return a fixed public IP.
  if (!isDeployed) return '146.70.182.38'

  // Cloudflare (most reliable when present)
  const cf = getRequestHeader(event, 'cf-connecting-ip')
  if (cf) return cf.trim()

  // Standard proxy header (may contain "client, proxy1, proxy2")
  const xff = getRequestHeader(event, 'x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()

  // Some proxies use this
  const xr = getRequestHeader(event, 'x-real-ip')
  if (xr) return xr.trim()

  // Direct connection fallback
  return event.node.req?.socket?.remoteAddress || undefined
}