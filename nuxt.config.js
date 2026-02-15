import { nodePolyfills } from 'vite-plugin-node-polyfills';

import {
  locales,
  localeCodes,
  defaultLocale,
  routeRules
} from './assets/js/locales'

export default defineNuxtConfig({

  // Settings specific for production
  $production: {

    // Static routes and cors
    routeRules,

    // Use umami analytics
    extends: [
      'nuxt-umami'
    ],
  },

  // Head script default tags
  app: {
    head: {
      meta: [
        {
          charset: 'utf-8'
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1"
        },
        {
          id: 'googlebot',
          name: 'googlebot',
          content: 'notranslate'
        },
        {
          id: 'og:type',
          name: 'og:type',
          content: 'website'
        },
        {
          id: 'og:url',
          name: 'og:url',
          content: process.env.DEPLOYMENT_DOMAIN || 'http://localhost:3000',
        },
        {
          id: 'og:site_name',
          name: 'og:site_name',
          content: 'p2pay-booking-template'
        },
        {
          id: 'og:image',
          name: 'og:image',
          content: `${process.env.DEPLOYMENT_DOMAIN || 'http://localhost:3000'}/favicon/favicon.png`
        },
        {
          id: 'twitter:card',
          name: 'twitter:card',
          content: 'summary'
        },
        {
          id: 'twitter:image',
          name: 'twitter:image',
          content: `${process.env.DEPLOYMENT_DOMAIN || 'http://localhost:3000'}/favicon/favicon.png`
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon/favicon.ico'
        },
      ]
    },
  },

  // Define the private and public env variables
  runtimeConfig: {
    ngrokToken: process.env.NGROK_TOKEN,
    btcpayApikey: process.env.BTCPAY_APIKEY,
    pusherSecret: process.env.PUSHER_SECRET,
    smtpPassword: process.env.SMTP_PASSWORD,
    googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    googleServiceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    googlePesonalCalendarIds: process.env.GOOGLE_PERSONAL_CALENDAR_IDS,
    googleBookingCalendarId: process.env.GOOGLE_BOOKING_CALENDAR_ID,
    ipinfoApiKey: process.env.IPINFO_API_KEY,
    public: {
      defaultService: process.env.DEFAULT_SERVICE,
      isDev: process.env.NODE_ENV !== 'production',
      isDeployed: process.env.NODE_ENV === 'production',
      deploymentDomain: process.env.DEPLOYMENT_DOMAIN ?? 'http://localhost:3000',
      pusherApikey: process.env.PUSHER_APIKEY,
      pusherCluster: process.env.PUSHER_CLUSTER,
      pusherAppId: process.env.PUSHER_APP_ID
    }
  },

  // Import the scss srylesheets
  css: [
    '~/assets/scss/main.scss',
    '~/assets/scss/mdi.scss',
    // "@mdi/font/css/materialdesignicons.css"
  ],

  // Skip the folders in the components import
  components: [{
    path: '~/components',
    pathPrefix: false,
    global: true
  }],

  // Import the nuxt modules
  modules: [
    '@nuxt/content',
    '@nuxtjs/i18n',
    '@nuxt/image',
    'nuxt-icons',
    '@nuxtjs/device',
    'nuxt-delay-hydration'
  ],

  // Setting for content module with i18n
  content: {
    locales: localeCodes,
    defaultLocale,
  },

  // settings for i18n module
  i18n: {
    baseUrl: process.env.DEPLOYMENT_DOMAIN || 'http://localhost:3000',
    locales,
    defaultLocale,
    lazy: true,
    langDir: 'lang',
    strategy: 'prefix',
    detectBrowserLanguage: {
      useCookie: false,
      // Those 2 settings are silly
      // but to work the redirect set in the index.vue page the are needed
      // actual strategy is that it redirects only on home page
      redirectOnRoot: true,
      alwaysRedirect: true,
    }
  },

  // Define the presets for nuxt image module
  image: {
    screens: {
      avatar: 192,
      preview: 192,
    },
    presets: {
      avatar: {
        modifiers: {
          format: 'webp',
          width: 192,
          height: 192,
          quality: 70
        }
      },
      preview: {
        modifiers: {
          format: 'webp',
          fit: 'cover',
          width: 192,
          height: 192,
          quality: 70
        }
      }
    }
  },

  // Delay hidration to deastically improve google loghhouse performance score
  delayHydration: {
    mode: 'init',
    exclude: localeCodes.map(code => `/${code}/invoice/**`),
    debug: process.env.NODE_ENV === 'development'
  },

  // Enanble the storage layer on nitro server
  // Filesystem on development
  // Github on production
  nitro: {
    devStorage: {
      lang: {
        driver: 'fs',
        base: './lang'
      },
      content: {
        driver: 'fs',
        base: './content'
      }
    },
    storage: {
      lang: {
        driver: 'github',
        repo: process.env.GITHUB_REPO,
        token: process.env.GITHUB_TOKEN,
        branch: 'main',
        dir: '/lang',
      },
      content: {
        driver: 'github',
        repo: process.env.GITHUB_REPO,
        token: process.env.GITHUB_TOKEN,
        branch: 'main',
        dir: '/content',
      }
    }
  },

  vite: {
    build: {
      sourcemap: true
    },
    // This is needed to inject bulma custom sass variables such as $primary 
    // in the css page and component stylesheets 
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/scss/custom.scss" as *;'
        }
      }
    },
    // Include nodejs module that are purged by vite in the browser by default
    plugins: [
      nodePolyfills({
        include: [
          'buffer',
          'util',
          'stream',
          'crypto'
        ],
        globals: {
          process: false,
        }
      }),
    ]
  },

  appConfig: {

    // id and host provided as env variables on production
    umami: {
      version: 2,
    },
  },
});
