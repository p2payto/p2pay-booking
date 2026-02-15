import { getRequestHeader } from 'h3'
import countryToCurrency from 'country-to-currency';

export default defineEventHandler(async (event) => {
  const { public: { isDeployed } } = useRuntimeConfig(event)
  if (!isDeployed) return { country: 'IT', currency: 'EUR', source: 'local-dev' }
  // 1) Prefer Cloudflare country when it is a real country code.
  // Cloudflare special values:
  // - T1 = Tor
  // - XX = Unknown
  const cfCountry = getRequestHeader(event, 'cf-ipcountry')
  if (cfCountry && cfCountry !== 'T1' && cfCountry !== 'XX') {
    console.error(JSON.stringify({ country: cfCountry, currency: countryToCurrency[cfCountry], source: 'cloudflare' }, null, 2))
    return { country: cfCountry, currency: countryToCurrency[cfCountry], source: 'cloudflare' }
  }

  // 2) Fallback to IP-based lookup via IPinfo (server-to-server)
  const ip = getRealIP(event)
  const { ipinfoApiKey } = useRuntimeConfig(event)
  console.error('Determining country for IP:', ip)
  console.error('Using IPinfo API key:', !!ipinfoApiKey)
  try {
    const res = await $fetch(`https://api.ipinfo.io/lite/${ip}`, {
      query: { token: ipinfoApiKey }
    })
    console.error('ipinfo response', res)

    // IPinfo does NOT use "XX". If it can't determine, `country` is usually missing/null.
    const country = res?.country_code || undefined
    const currency = country ? countryToCurrency[country] : undefined

    console.error(JSON.stringify({ country, currency, source: 'ipinfo' }, null, 2))
    return { country, currency, source: 'ipinfo' }
  } catch (error) {
    console.error('Error fetching country from IPinfo:', error)
    console.error(JSON.stringify({ country: undefined, currency: undefined, source: 'ipinfo-error' }, null, 2))
    return { country: undefined, currency: undefined, source: 'ipinfo-error' }
  }
})
