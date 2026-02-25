<script setup lang="ts">
import type { Tables } from "~~/shared/types/database.types"

const { $t } = useI18n()

useHead({
  title: $t("page_title_cart")?.toString(),
})

const supabase = useSupabaseClient()
const { cart, addItem, removeItem } = useCart()

type BookRow = Pick<Tables<"books">, "id" | "title" | "base_price"> & {
  book_images: Pick<Tables<"book_images">, "image_path" | "position">[]
}

const books = ref<BookRow[]>([])

const fetchBooks = async () => {
  const ids = cart.value.map((item) => item.bookId)
  if (!ids.length) {
    books.value = []
    return
  }
  const { data } = await supabase
    .from("books")
    .select("id, title, base_price, book_images(image_path, position)")
    .in("id", ids)

  books.value = (data as BookRow[]) ?? []
}

await fetchBooks()

watch(() => cart.value.map((i) => i.bookId), fetchBooks, { deep: true })

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
        ...entry,
        title: book.title,
        price: book.base_price,
        imageUrl,
      }
    })
    .filter(Boolean),
)

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fa-IR").format(price)

const total = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item!.price * item!.quantity, 0),
)
</script>

<template>
  <div class="flex flex-col gap-6 py-8">
    <h1 class="text-2xl font-bold">{{ $t("cart") }}</h1>

    <div v-if="!cartItems.length" class="text-center py-16 text-muted">
      <UIcon name="i-lucide-shopping-cart" class="text-5xl mb-4" />
      <p class="text-lg">{{ $t("cart_empty") }}</p>
    </div>

    <div v-else class="flex flex-col gap-4">
      <UCard
        v-for="item in cartItems"
        :key="item!.bookId"
        class="flex"
        :ui="{ body: 'w-full' }"
      >
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img
            :src="item!.imageUrl"
            :alt="item!.title"
            class="w-20 h-28 object-cover rounded-md shrink-0"
          />

          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <NuxtLink
              :to="`/book/${item!.bookId}`"
              class="font-semibold truncate hover:underline"
            >
              {{ item!.title }}
            </NuxtLink>
            <p class="text-sm text-muted">
              {{ formatPrice(item!.price) }} {{ $t("toman") }}
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0 text-left">
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              icon="i-lucide-plus"
              @click="addItem(item!.bookId, 1)"
            />
            <span class="w-8 text-center font-medium tabular-nums">
              {{ item!.quantity }}
            </span>
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              icon="i-lucide-minus"
              @click="removeItem(item!.bookId, 1)"
            />
          </div>
        </div>
      </UCard>

      <USeparator />

      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <span class="text-lg font-semibold">
          {{ $t("total") }}: {{ formatPrice(total) }} {{ $t("toman") }}
        </span>
        <UButton
          to="/fillAddress"
          color="primary"
          size="lg"
          block
          class="sm:w-auto"
          :label="$t('checkout')?.toString()"
          icon="i-lucide-arrow-left"
        />
      </div>
    </div>
  </div>
</template>
