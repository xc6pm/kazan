<script setup lang="ts">
import type { Tables } from "~~/shared/types/database.types"

const { $t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { cart } = useCart()

// Redirect if not authenticated
if (!user.value) {
  await navigateTo("/signin")
}

// Read shipment info from cookie
const shipmentInfo = useStatefulCookie<{
  recipientName: string
  phoneNumber: string
  province: string
  city: string
  address: string
  postalCode: string
  deliveryTypeId: number
  deliveryTypeName: string
  deliveryPrice: number
} | null>("shipmentInfo")

// Redirect back if no shipment info
if (!shipmentInfo.value) {
  await navigateTo("/fillAddress")
}

// Redirect if cart is empty
if (!cart.value.length) {
  await navigateTo("/cart")
}

// --- Cart summary ---

type BookRow = Pick<Tables<"books">, "id" | "title" | "base_price"> & {
  book_images: Pick<Tables<"book_images">, "image_path" | "position">[]
}

const books = ref<BookRow[]>([])

const { data: fetchedBooks } = await supabase
  .from("books")
  .select("id, title, base_price, book_images(image_path, position)")
  .in(
    "id",
    cart.value.map((i) => i.bookId),
  )

books.value = (fetchedBooks as BookRow[]) ?? []

const cartItems = computed(() =>
  cart.value
    .map((entry) => {
      const book = books.value.find((b) => b.id === entry.bookId)
      if (!book) return null
      const cover = book.book_images.find((img) => img.position === 0)
      const imageUrl = cover
        ? supabase.storage.from("book-images").getPublicUrl(cover.image_path)
            .data.publicUrl
        : "/placeholder-book.svg"
      return {
        bookId: entry.bookId,
        quantity: entry.quantity,
        title: book.title,
        price: book.base_price,
        imageUrl,
      }
    })
    .filter(Boolean),
)

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fa-IR").format(price)

const subtotal = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item!.price * item!.quantity, 0),
)

const deliveryPrice = computed(() => shipmentInfo.value?.deliveryPrice ?? 0)

const totalAmount = computed(() => subtotal.value + deliveryPrice.value)

// --- Payment providers ---

const paymentProviders = ref<Tables<"payment_providers">[]>([])
const { data: fetchedProviders } = await supabase
  .from("payment_providers")
  .select("*")
  .eq("is_active", true)
paymentProviders.value = fetchedProviders ?? []

const selectedProviderId = ref<number | undefined>(
  paymentProviders.value[0]?.id ?? undefined,
)

// --- Submit ---

const submitting = ref(false)
const errorMessage = ref("")

const handleSubmit = async () => {
  if (!selectedProviderId.value) {
    errorMessage.value = $t("payment_provider_required")?.toString() ?? ""
    return
  }

  submitting.value = true
  errorMessage.value = ""

  try {
    const result = await $fetch("/api/checkout", {
      method: "POST",
      body: {
        items: cart.value.map((i) => ({
          bookId: i.bookId,
          quantity: i.quantity,
        })),
        shipment: {
          recipientName: shipmentInfo.value!.recipientName,
          phoneNumber: shipmentInfo.value!.phoneNumber,
          city: shipmentInfo.value!.city,
          address: shipmentInfo.value!.address,
          postalCode: shipmentInfo.value!.postalCode || undefined,
          deliveryTypeId: shipmentInfo.value!.deliveryTypeId,
        },
        paymentProviderId: selectedProviderId.value,
      },
    })

    // Clear cart and shipment info after successful order
    cart.value = []
    shipmentInfo.value = null

    // Redirect to dashboard
    await navigateTo("/dashboard")
  } catch (err: any) {
    errorMessage.value =
      err?.data?.statusMessage ?? $t("unexpected_error")?.toString() ?? ""
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 py-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold">{{ $t("payment") }}</h1>

    <!-- Order summary -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ $t("order_summary") }}</h2>
      </template>

      <div class="flex flex-col gap-3">
        <div
          v-for="item in cartItems"
          :key="item!.bookId"
          class="flex items-center gap-3"
        >
          <img
            :src="item!.imageUrl"
            :alt="item!.title"
            class="w-12 h-16 object-cover rounded shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ item!.title }}</p>
            <p class="text-xs text-muted">
              {{ item!.quantity }} &times; {{ formatPrice(item!.price) }}
              {{ $t("toman") }}
            </p>
          </div>
          <p class="text-sm font-semibold shrink-0">
            {{ formatPrice(item!.price * item!.quantity) }} {{ $t("toman") }}
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <span>{{ $t("subtotal") }}</span>
            <span>{{ formatPrice(subtotal) }} {{ $t("toman") }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>{{ $t("delivery_cost") }}</span>
            <span>{{ formatPrice(deliveryPrice) }} {{ $t("toman") }}</span>
          </div>
          <USeparator />
          <div class="flex justify-between items-center font-bold">
            <span>{{ $t("total") }}</span>
            <span>{{ formatPrice(totalAmount) }} {{ $t("toman") }}</span>
          </div>
        </div>
      </template>
    </UCard>

    <!-- Delivery info summary -->
    <UCard v-if="shipmentInfo">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ $t("delivery_address") }}</h2>
          <UButton
            variant="ghost"
            size="xs"
            :label="$t('edit')?.toString()"
            icon="i-lucide-pencil"
            to="/fillAddress"
          />
        </div>
      </template>

      <div class="flex flex-col gap-2 text-sm">
        <div class="flex gap-2">
          <span class="text-muted">{{ $t("recipient_name") }}:</span>
          <span>{{ shipmentInfo.recipientName }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-muted">{{ $t("phone_number") }}:</span>
          <span dir="ltr">{{ shipmentInfo.phoneNumber }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-muted">{{ $t("province") }}:</span>
          <span>{{ shipmentInfo.province }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-muted">{{ $t("city") }}:</span>
          <span>{{ shipmentInfo.city }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-muted">{{ $t("address") }}:</span>
          <span>{{ shipmentInfo.address }}</span>
        </div>
        <div v-if="shipmentInfo.postalCode" class="flex gap-2">
          <span class="text-muted">{{ $t("postal_code") }}:</span>
          <span dir="ltr">{{ shipmentInfo.postalCode }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-muted">{{ $t("delivery_type") }}:</span>
          <span>{{ shipmentInfo.deliveryTypeName }}</span>
        </div>
      </div>
    </UCard>

    <!-- Payment provider selection -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ $t("payment_method") }}</h2>
      </template>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <URadioGroup
          v-if="paymentProviders.length"
          v-model="selectedProviderId"
          :items="
            paymentProviders.map((pp) => ({
              label: pp.name,
              value: pp.id,
            }))
          "
        />
        <p v-else class="text-muted text-sm">
          {{ $t("no_payment_providers") }}
        </p>

        <UAlert
          v-if="errorMessage"
          color="error"
          :title="$t('error')?.toString()"
          :description="errorMessage"
          icon="i-lucide-alert-circle"
        />

        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :loading="submitting"
          :disabled="!selectedProviderId"
          :label="$t('confirm_and_pay')?.toString()"
          icon="i-lucide-credit-card"
        />
      </form>
    </UCard>
  </div>
</template>
