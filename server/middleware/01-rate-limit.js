import { createError, getRequestHeader, setResponseHeader } from 'h3'

const buckets = new Map()

const getClientIP = (event) => {
  const cf = getRequestHeader(event, 'cf-connecting-ip')
  if (cf) return cf.trim()

  const xff = getRequestHeader(event, 'x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()

  const xr = getRequestHeader(event, 'x-real-ip')
  if (xr) return xr.trim()

  return event.node.req?.socket?.remoteAddress || 'unknown'
}

const hit = ({ key, limit, windowMs }) => {
  const now = Date.now()
  const k = String(key || 'unknown')

  const entry = buckets.get(k)
  if (!entry || (now - entry.start) > windowMs) {
    buckets.set(k, { start: now, count: 1 })
    return { ok: true, remaining: limit - 1, resetMs: windowMs }
  }

  entry.count += 1
  buckets.set(k, entry)

  const remaining = Math.max(0, limit - entry.count)
  const ok = entry.count <= limit
  const resetMs = windowMs - (now - entry.start)

  return { ok, remaining, resetMs }
}

const isWebhookPath = (path) => {
  // normalize: remove querystring
  const p = String(path || '').split('?')[0]
  const segs = p.split('/').filter(Boolean) // e.g. ["api","rails","peach","webhook","paid"]
  return segs.includes('webhook') || segs.includes('webhooks')
}

export default defineEventHandler((event) => {

  const path = event.path || ''

  // Only rate-limit API endpoints (recommended)
  if (!path.startsWith('/api/')) return
  if (path.startsWith('/api/_')) return
  if (path.includes('__nuxt')) return
  if (isWebhookPath(path)) return

  const ip = getClientIP(event)

  // Tweak limits here
  const limit = 60         // requests
  const windowMs = 60_000  // per minute

  const rl = hit({ key: ip, limit, windowMs })

  setResponseHeader(event, 'x-ratelimit-limit', String(limit))
  setResponseHeader(event, 'x-ratelimit-remaining', String(rl.remaining))
  setResponseHeader(event, 'x-ratelimit-reset-ms', String(rl.resetMs))

  if (!rl.ok) {
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })
  }
})
