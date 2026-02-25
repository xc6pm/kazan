<script setup lang="ts">
import type { Tables } from "~~/shared/types/database.types"

const { $t } = useI18n()

const supabase = useSupabaseClient()

type OrderWithStatus = Tables<"orders"> & {
  order_statuses: Pick<Tables<"order_statuses">, "id" | "code" | "name"> | null
  order_items: (Pick<
    Tables<"order_items">,
    "id" | "quantity" | "unit_price"
  > & {
    books: Pick<Tables<"books">, "id" | "title"> | null
  })[]
}

const loading = ref(true)
const orders = ref<OrderWithStatus[]>([])
const statuses = ref<Tables<"order_statuses">[]>([])
const selectedStatusId = ref<number | null>(null)

async function fetchStatuses() {
  const { data } = await supabase
    .from("order_statuses")
    .select("id, code, english_name, name")
    .order("id")

  if (data) {
    statuses.value = data
  }
}

async function fetchOrders() {
  loading.value = true

  let query = supabase
    .from("orders")
    .select(
      `
      id,
      created_at,
      subtotal_amount,
      delivery_price,
      total_amount,
      order_status_id,
      payment_reference,
      payment_provider_id,
      user_id,
      order_statuses (id, code, name),
      order_items (id, quantity, unit_price, books (id, title))
    `,
    )
    .order("created_at", { ascending: false })

  if (selectedStatusId.value !== null) {
    query = query.eq("order_status_id", selectedStatusId.value)
  }

  const { data, error } = await query

  if (error) {
    console.error("fetch orders error:", error)
  } else {
    orders.value = (data as unknown as OrderWithStatus[]) ?? []
  }

  loading.value = false
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(price)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

watch(selectedStatusId, () => {
  fetchOrders()
})

onMounted(async () => {
  await Promise.all([fetchStatuses(), fetchOrders()])
})
</script>

<template>
  <div class="space-y-6 mt-4">
    <!-- Filter by status -->
    <div class="flex items-center gap-3 flex-wrap">
      <span class="text-sm font-medium">{{ $t("filter_by_status") }}:</span>
      <UButton
        :variant="selectedStatusId === null ? 'solid' : 'outline'"
        size="sm"
        @click="selectedStatusId = null"
      >
        {{ $t("all") }}
      </UButton>
      <UButton
        v-for="status in statuses"
        :key="status.id"
        :variant="selectedStatusId === status.id ? 'solid' : 'outline'"
        size="sm"
        @click="selectedStatusId = status.id"
      >
        {{ status.name }}
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="orders.length === 0"
      class="text-center py-12 text-gray-500"
    >
      <UIcon name="i-heroicons-inbox" class="text-4xl mb-2" />
      <p>{{ $t("no_orders") }}</p>
    </div>

    <!-- Orders list -->
    <div v-else class="space-y-4">
      <ULink
        v-for="order in orders"
        :key="order.id"
        :to="`/order/${order.id}`"
        class="block"
      >
        <UCard
          class="transition-all duration-200 hover:shadow-lg cursor-pointer"
        >
          <div class="flex flex-col gap-3">
            <!-- Order header -->
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-3">
                <span class="font-semibold">
                  {{ $t("order") }} #{{ order.id }}
                </span>
                <UBadge v-if="order.order_statuses" variant="subtle">
                  {{ order.order_statuses.name }}
                </UBadge>
              </div>
              <span class="text-sm text-gray-500">
                {{ formatDate(order.created_at) }}
              </span>
            </div>

            <!-- Order items -->
            <div class="border-t pt-3 space-y-2">
              <div
                v-for="item in order.order_items"
                :key="item.id"
                class="flex items-center justify-between text-sm"
              >
                <span>
                  {{ item.books?.title ?? "—" }}
                  <span class="text-gray-500">× {{ item.quantity }}</span>
                </span>
                <span
                  >{{ formatPrice(item.unit_price * item.quantity) }}
                  {{ $t("toman") }}</span
                >
              </div>
            </div>

            <!-- Order totals -->
            <div
              class="border-t pt-3 flex items-center justify-between text-sm"
            >
              <div class="space-x-2 rtl:space-x-reverse flex gap-4">
                <span
                  >{{ $t("subtotal") }}:
                  {{ formatPrice(order.subtotal_amount) }}
                  {{ $t("toman") }}</span
                >
                <span
                  >{{ $t("delivery_cost") }}:
                  {{ formatPrice(order.delivery_price) }}
                  {{ $t("toman") }}</span
                >
              </div>
              <span class="font-bold">
                {{ $t("total") }}: {{ formatPrice(order.total_amount) }}
                {{ $t("toman") }}
              </span>
            </div>
          </div>
        </UCard>
      </ULink>
    </div>
  </div>
</template>
