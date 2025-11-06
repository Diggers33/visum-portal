import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from './locales/en/common.json';
import enProducts from './locales/en/products.json';
import enAccount from './locales/en/account.json';

import deCommon from './locales/de/common.json';
import deProducts from './locales/de/products.json';
import deAccount from './locales/de/account.json';

import frCommon from './locales/fr/common.json';
import frProducts from './locales/fr/products.json';
import frAccount from './locales/fr/account.json';

import esCommon from './locales/es/common.json';
import esProducts from './locales/es/products.json';
import esAccount from './locales/es/account.json';

import itCommon from './locales/it/common.json';
import itProducts from './locales/it/products.json';
import itAccount from './locales/it/account.json';

const resources = {
  en: {
    common: enCommon,
    products: enProducts,
    account: enAccount,
  },
  de: {
    common: deCommon,
    products: deProducts,
    account: deAccount,
  },
  fr: {
    common: frCommon,
    products: frProducts,
    account: frAccount,
  },
  es: {
    common: esCommon,
    products: esProducts,
    account: esAccount,
  },
  it: {
    common: itCommon,
    products: itProducts,
    account: itAccount,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
