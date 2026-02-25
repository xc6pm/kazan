<script setup lang="ts">
import type { Tables } from "~~/shared/types/database.types"

const { $t } = useI18n()
const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

if (!user.value) {
  await navigateTo("/signin")
}

const orderId = Number(route.params.id)

const loading = ref(true)
const error = ref("")

type OrderDetail = Tables<"orders"> & {
  order_statuses: Pick<Tables<"order_statuses">, "id" | "code" | "name"> | null
  payment_providers: Pick<Tables<"payment_providers">, "id" | "name"> | null
  order_items: (Pick<
    Tables<"order_items">,
    "id" | "quantity" | "unit_price"
  > & {
    books:
      | (Pick<Tables<"books">, "id" | "title" | "base_price"> & {
          book_images: Pick<Tables<"book_images">, "image_path" | "position">[]
        })
      | null
  })[]
  order_shipments:
    | (Pick<
        Tables<"order_shipments">,
        | "recipient_name"
        | "phone_number"
        | "city"
        | "address"
        | "postal_code"
        | "tracking_number"
      > & {
        delivery_types: Pick<Tables<"delivery_types">, "name"> | null
      })
    | null
}

const order = ref<OrderDetail | null>(null)

async function fetchOrder() {
  loading.value = true
  error.value = ""

  const { data, error: fetchError } = await supabase
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
      payment_providers (id, name),
      order_items (id, quantity, unit_price, books (id, title, base_price, book_images (image_path, position))),
      order_shipments (recipient_name, phone_number, city, address, postal_code, tracking_number, delivery_types (name))
    `,
    )
    .eq("id", orderId)
    .single()

  if (fetchError) {
    console.error("fetch order error:", fetchError)
    error.value = fetchError.message
  } else {
    order.value = data as unknown as OrderDetail
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

function getImageUrl(item: OrderDetail["order_items"][number]) {
  const cover = item.books?.book_images.find((img) => img.position === 0)
  if (!cover) return "/placeholder-book.svg"
  return supabase.storage.from("book-images").getPublicUrl(cover.image_path)
    .data.publicUrl
}

await fetchOrder()
</script>

<template>
  <div class="flex flex-col gap-6 py-8 max-w-2xl mx-auto">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="error"
      variant="soft"
      :title="error"
    />

    <template v-else-if="order">
      <!-- Header with order number, date, and status -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold">{{ $t("order") }} #{{ order.id }}</h1>
          <UBadge v-if="order.order_statuses" variant="subtle" size="lg">
            {{ order.order_statuses.name }}
          </UBadge>
        </div>
        <span class="text-sm text-gray-500">
          {{ formatDate(order.created_at) }}
        </span>
      </div>

      <!-- Order items summary -->
      <UCard>
        <template #header>
          <h2 class="font-semibold">{{ $t("order_summary") }}</h2>
        </template>

        <div class="flex flex-col gap-3">
          <div
            v-for="item in order.order_items"
            :key="item.id"
            class="flex items-center gap-3"
          >
            <img
              :src="getImageUrl(item)"
              :alt="item.books?.title"
              class="w-12 h-16 object-cover rounded shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                {{ item.books?.title ?? "—" }}
              </p>
              <p class="text-xs text-muted">
                {{ item.quantity }} &times; {{ formatPrice(item.unit_price) }}
                {{ $t("toman") }}
              </p>
            </div>
            <p class="text-sm font-semibold shrink-0">
              {{ formatPrice(item.unit_price * item.quantity) }}
              {{ $t("toman") }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center">
              <span>{{ $t("subtotal") }}</span>
              <span
                >{{ formatPrice(order.subtotal_amount) }}
                {{ $t("toman") }}</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span>{{ $t("delivery_cost") }}</span>
              <span
                >{{ formatPrice(order.delivery_price) }} {{ $t("toman") }}</span
              >
            </div>
            <USeparator />
            <div class="flex justify-between items-center font-bold">
              <span>{{ $t("total") }}</span>
              <span
                >{{ formatPrice(order.total_amount) }} {{ $t("toman") }}</span
              >
            </div>
          </div>
        </template>
      </UCard>

      <!-- Shipment info -->
      <UCard v-if="order.order_shipments">
        <template #header>
          <h2 class="font-semibold">{{ $t("delivery_address") }}</h2>
        </template>

        <div class="flex flex-col gap-2 text-sm">
          <div class="flex gap-2">
            <span class="text-muted">{{ $t("recipient_name") }}:</span>
            <span>{{ order.order_shipments.recipient_name }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-muted">{{ $t("phone_number") }}:</span>
            <span dir="ltr">{{ order.order_shipments.phone_number }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-muted">{{ $t("city") }}:</span>
            <span>{{ order.order_shipments.city }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-muted">{{ $t("address") }}:</span>
            <span>{{ order.order_shipments.address }}</span>
          </div>
          <div v-if="order.order_shipments.postal_code" class="flex gap-2">
            <span class="text-muted">{{ $t("postal_code") }}:</span>
            <span dir="ltr">{{ order.order_shipments.postal_code }}</span>
          </div>
          <div v-if="order.order_shipments.delivery_types" class="flex gap-2">
            <span class="text-muted">{{ $t("delivery_type") }}:</span>
            <span>{{ order.order_shipments.delivery_types.name }}</span>
          </div>
          <div v-if="order.order_shipments.tracking_number" class="flex gap-2">
            <span class="text-muted">{{ $t("tracking_number") }}:</span>
            <span dir="ltr">{{ order.order_shipments.tracking_number }}</span>
          </div>
        </div>
      </UCard>

      <!-- Payment info -->
      <UCard>
        <template #header>
          <h2 class="font-semibold">{{ $t("payment_info") }}</h2>
        </template>

        <div class="flex flex-col gap-2 text-sm">
          <div v-if="order.payment_providers" class="flex gap-2">
            <span class="text-muted">{{ $t("payment_method") }}:</span>
            <span>{{ order.payment_providers.name }}</span>
          </div>
          <div v-if="order.payment_reference" class="flex gap-2">
            <span class="text-muted">{{ $t("payment_reference") }}:</span>
            <span dir="ltr">{{ order.payment_reference }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-muted">{{ $t("order_status") }}:</span>
            <UBadge v-if="order.order_statuses" variant="subtle">
              {{ order.order_statuses.name }}
            </UBadge>
          </div>
        </div>
      </UCard>

      <!-- Back to dashboard -->
      <UButton
        variant="outline"
        icon="i-heroicons-arrow-right"
        :label="$t('back_to_dashboard')?.toString()"
        to="/dashboard"
      />
    </template>
  </div>
</template>
