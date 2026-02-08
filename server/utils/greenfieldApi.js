import { readBody, getQuery } from 'h3'
import { ofetch } from 'ofetch'
import { defaultLocale } from '~/assets/js/locales'

// Wrapper for the BTCPay Greenfield API fetch
export const greenfieldApi = async (endpoint, event) => {
  const config = useRuntimeConfig()
  const { btcpayApikey } = config
  const { isDev } = config.public

  // IMPORTANT:
  // Use $fetch for internal Nitro calls (relative URLs supported).
  // Do NOT use ofetch with relative paths in Node.
  const [{ btcpay: { storeid, host } }] = await $fetch('/api/_content/query', {
    query: {
      _params: JSON.stringify({
        where: [{
          _partial: false,
          _locale: defaultLocale,
          _path: '/settings',
          _dir: ''
        }]
      })
    }
  })

  const apiFetch = ofetch.create({
    baseURL: `${host}/api/v1/stores/${storeid}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `token ${btcpayApikey}`
    },
    redirect: 'follow',
    async onRequestError({ request, error }) {
      if (isDev) console.log('[fetch request error]', request, error)
    },
    async onResponseError({ request, response }) {
      if (isDev) console.log('[fetch response error]', request, response.status, response.body)
    }
  })

  const method = event.method
  const query = getQuery(event)

  let body
  if (method !== 'GET') {
    body = await readBody(event)
  }

  return await apiFetch(endpoint, {
    method,
    query,
    body
  })
}
