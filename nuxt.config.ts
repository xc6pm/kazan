// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,

      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    },
  },

  modules: ["@nuxt/ui", "nuxt-i18n-micro", "@nuxtjs/supabase"],

  i18n: {
    locales: [{ code: "fa", iso: "fa-IR", dir: "rtl" }],
    defaultLocale: "fa",
    translationDir: "locales",
    meta: true,
    disablePageLocales: true,
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    types: "./shared/types/database.types.ts",
    redirect: false,
  },

  css: ["~/assets/css/main.css"],

  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
})
