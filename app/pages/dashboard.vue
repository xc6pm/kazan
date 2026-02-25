<script setup lang="ts">
const { $t } = useI18n()

const tabs = computed(() => [
  {
    label: $t("profile")?.toString() ?? "Profile",
    value: "profile",
    icon: "i-heroicons-user-circle",
  },
  {
    label: $t("orders")?.toString() ?? "Orders",
    value: "orders",
    icon: "i-heroicons-shopping-bag",
  },
])

const activeTab = ref("orders")
</script>

<template>
  <div>
    <UTabs :items="tabs" v-model="activeTab" class="mt-4" />

    <DashboardOrders v-if="activeTab === 'orders'" />
    <DashboardProfile v-else-if="activeTab === 'profile'" />
  </div>
</template>
