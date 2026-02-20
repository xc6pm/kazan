<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const { $t } = useI18n()

const route = useRoute()

const user = useSupabaseUser()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: "Docs",
    to: "/docs/getting-started",
    active: route.path.startsWith("/docs/getting-started"),
  },
  {
    label: "Components",
    to: "/docs/components",
    active: route.path.startsWith("/docs/components"),
  },
  {
    label: "Figma",
    to: "https://go.nuxt.com/figma-ui",
    target: "_blank",
  },
  {
    label: "Releases",
    to: "https://github.com/nuxt/ui/releases",
    target: "_blank",
  },
])
</script>

<template>
  <UHeader>
    <template #title>
      {{ $t("brand_name") }}
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />

      <UButton
        color="neutral"
        variant="ghost"
        :to="user?.email ? '/dashboard' : '/signin'"
        aria-label="Sign In"
        :label="user?.email ?? $t('sign_in')?.toString()"
      />
    </template>
  </UHeader>

  <UContainer class="h-32">
    <slot />
  </UContainer>
</template>
