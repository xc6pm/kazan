// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "nuxt-i18n-micro"],

  i18n: {
    locales: [{ code: "fa", iso: "fa-IR", dir: "rtl" }],
    defaultLocale: "fa",
    translationDir: "locales",
    meta: true,
    disablePageLocales: true,
  },

  css: ["~/assets/css/main.css"],

  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
})
