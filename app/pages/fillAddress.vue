<script setup lang="ts">
import type { Tables } from "~~/shared/types/database.types"

const { $t } = useI18n()

useHead({
  title: $t("page_title_shipping")?.toString(),
})

const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { cart } = useCart()

// Redirect to cart if empty
if (!cart.value.length) {
  await navigateTo("/cart")
}

// Redirect to signin if not authenticated
if (!user.value) {
  await navigateTo("/signin")
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

// --- Delivery types ---

const deliveryTypes = ref<Tables<"delivery_types">[]>([])
const { data: fetchedDeliveryTypes } = await supabase
  .from("delivery_types")
  .select("*")
deliveryTypes.value = fetchedDeliveryTypes ?? []

// --- Provinces of Iran ---

const provinces = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
]

const provinceItems = provinces.map((p) => ({ label: p, value: p }))

// --- Form state ---

const form = reactive({
  recipientName: "",
  phoneNumber: "",
  province: undefined as { label: string; value: string } | undefined,
  city: "",
  address: "",
  postalCode: "",
  deliveryTypeId:
    deliveryTypes.value[0]?.id ?? (undefined as number | undefined),
})

// --- Delivery price (hardcoded for now) ---

const deliveryPrice = computed(() => (form.deliveryTypeId ? 80000 : 0))

const errorMessage = ref("")

// --- Validation ---

const validate = () => {
  if (!form.recipientName.trim()) return $t("recipient_name_required")
  if (!form.phoneNumber.trim()) return $t("phone_required")
  if (!/^09\d{9}$/.test(form.phoneNumber.trim())) return $t("phone_invalid")
  if (!form.province) return $t("province_required")
  if (!form.city.trim()) return $t("city_required")
  if (!form.address.trim()) return $t("address_required")
  if (form.postalCode.trim() && !/^\d{10}$/.test(form.postalCode.trim()))
    return $t("postal_code_invalid")
  if (!form.deliveryTypeId) return $t("delivery_type_required")
  return null
}

// --- Shared state for payment page ---

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

// --- Submit: save data and go to payment ---

const handleSubmit = () => {
  const validationError = validate()
  if (validationError) {
    errorMessage.value = validationError?.toString() ?? ""
    return
  }

  errorMessage.value = ""

  const selectedDelivery = deliveryTypes.value.find(
    (dt) => dt.id === form.deliveryTypeId,
  )

  shipmentInfo.value = {
    recipientName: form.recipientName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    province: form.province!.value,
    city: form.city.trim(),
    address: form.address.trim(),
    postalCode: form.postalCode.trim(),
    deliveryTypeId: form.deliveryTypeId!,
    deliveryTypeName: selectedDelivery?.name ?? "",
    deliveryPrice: deliveryPrice.value,
  }

  navigateTo("/payment")
}
</script>

<template>
  <div class="flex flex-col gap-6 py-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold">{{ $t("shipping_info") }}</h1>

    <!-- Cart summary (compact) -->
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
        <div class="flex justify-between items-center">
          <span class="font-semibold">{{ $t("subtotal") }}</span>
          <span class="font-bold">
            {{ formatPrice(subtotal) }} {{ $t("toman") }}
          </span>
        </div>
      </template>
    </UCard>

    <!-- Address form -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ $t("delivery_address") }}</h2>
      </template>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <UFormField :label="$t('recipient_name')?.toString()">
          <UInput
            v-model="form.recipientName"
            :placeholder="$t('recipient_name_placeholder')?.toString()"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('phone_number')?.toString()">
          <UInput
            v-model="form.phoneNumber"
            :placeholder="$t('phone_placeholder')?.toString()"
            dir="ltr"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('province')?.toString()">
          <USelectMenu
            v-model="form.province"
            :items="provinceItems"
            :placeholder="$t('province_placeholder')?.toString()"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('city')?.toString()">
          <UInput
            v-model="form.city"
            :placeholder="$t('city_placeholder')?.toString()"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('address')?.toString()">
          <UTextarea
            v-model="form.address"
            :placeholder="$t('address_placeholder')?.toString()"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('postal_code')?.toString()">
          <UInput
            v-model="form.postalCode"
            :placeholder="$t('postal_code_placeholder')?.toString()"
            dir="ltr"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="deliveryTypes.length"
          :label="$t('delivery_type')?.toString()"
        >
          <USelectMenu
            v-model="form.deliveryTypeId"
            :items="
              deliveryTypes.map((dt) => ({
                label: dt.name,
                value: dt.id,
              }))
            "
            value-key="value"
            :placeholder="$t('delivery_type_placeholder')?.toString()"
            class="w-full"
            :search-input="false"
          />
        </UFormField>

        <!-- Delivery price display -->
        <div
          v-if="form.deliveryTypeId"
          class="flex justify-between items-center p-3 bg-muted/30 rounded-lg"
        >
          <span class="text-sm">{{ $t("delivery_cost") }}</span>
          <span class="font-semibold">
            {{ formatPrice(deliveryPrice) }} {{ $t("toman") }}
          </span>
        </div>

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
          :label="$t('continue_to_payment')?.toString()"
          icon="i-lucide-arrow-left"
        />
      </form>
    </UCard>
  </div>
</template>
