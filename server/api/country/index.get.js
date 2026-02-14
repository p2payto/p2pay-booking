import { getRequestHeader } from 'h3'
import countryToCurrency from 'country-to-currency';

export default defineEventHandler(async (event) => {
  // 1) Prefer Cloudflare country when it is a real country code.
  // Cloudflare special values:
  // - T1 = Tor
  // - XX = Unknown
  const cfCountry = getRequestHeader(event, 'cf-ipcountry')
  if (cfCountry && cfCountry !== 'T1' && cfCountry !== 'XX') {
    return { country: cfCountry, currency: countryToCurrency[cfCountry], source: 'cloudflare' }
  }

  // 2) Fallback to IP-based lookup via IPinfo (server-to-server)
  const ip = getRealIP(event)
  const { ipinfoApiKey } = useRuntimeConfig(event)

  try {
    const res = await $fetch(`https://api.ipinfo.io/lite/${ip}`, {
      query: { token: ipinfoApiKey }
    })

    // IPinfo does NOT use "XX". If it can't determine, `country` is usually missing/null.
    const country = res?.country_code || undefined
    const currency = country ? countryToCurrency[country] : undefined

    return { country, currency, source: 'ipinfo' }
  } catch {
    return { country: undefined, currency: undefined, source: 'ipinfo-error' }
  }
})
