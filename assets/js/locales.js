import find from 'lodash.find';

export const locales = [
  {
    code: 'en',
    file: 'en.json',
    iso: 'en-US',
    name: 'English',
    validate: 'en',
    default: true
  },
  {
    code: 'es',
    file: 'es.json',
    iso: 'es-419',
    name: 'Español',
    validate: 'es',
  },
  // {
  //   code: 'it',
  //   file: 'it.json',
  //   iso: 'it-IT',
  //   name: 'Italiano',
  //   validate: 'it',
  // }
];

export const localeCodes = locales.map(locale => locale.code);

export const defaultLocale = find(locales, { default: true }).code;

export const routeRules = locales.reduce((obj, locale) => {
  obj[`/${locale.code}`] = {
    static: true,
    cors: true,
    headers: {
      'Cache-Control': `s-maxage=${60 * 60 * 24 * 365}`
    }
  }
  obj[`/${locale.code}/**`] = {
    static: true,
    cors: true,
    headers: {
      'Cache-Control': `s-maxage=${60 * 60 * 24 * 365}`
    }
  }
  obj[`/${locale.code}/invoice/**`] = {
    cors: true
  }
  return obj
}, {
  '/': {
    cors: true
  }
});
