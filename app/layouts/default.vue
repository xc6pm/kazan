<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const { $t } = useI18n()

const route = useRoute()

const user = useSupabaseUser()

const { cart, count: cartItemCount } = useCart()

const supabase = useSupabaseClient()
const displayNameFromServer = ref<string | null>(null)
if (user.value) {
  const { data } = await supabase
    .from("users")
    .select("display_name")
    .eq("auth_user_id", user.value.sub)

  displayNameFromServer.value = data?.[0]?.display_name ?? null
}
const displayName = computed(
  () =>
    displayNameFromServer.value ??
    user.value?.email ??
    $t("sign_in")?.toString(),
)

const items = computed<NavigationMenuItem[]>(() => [])
</script>

<template>
  <UHeader>
    <template #title>
      {{ $t("brand_name") }}
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />

      <UChip
        :show="cartItemCount > 0"
        :text="cartItemCount"
        size="3xl"
        class="text-3xl"
      >
        <UButton
          color="neutral"
          variant="ghost"
          to="/cart"
          icon="i-lucide-shopping-cart"
          aria-label="Cart"
        />
      </UChip>

      <UButton
        color="neutral"
        variant="ghost"
        :to="user?.email ? '/dashboard' : '/signin'"
        aria-label="Sign In"
        :label="displayName"
      />
    </template>
  </UHeader>

  <UContainer>
    <slot />
  </UContainer>
</template>
