<script setup lang="ts">
import type { Database, Json } from "~~/shared/types/database.types"

const route = useRoute()
const supabase = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { $t } = useI18n()

const { data: book, error } = await useAsyncData(
  `book-${route.params.id}`,
  async () => {
    const { data } = await supabase
      .from("books")
      .select(
        `id, title, subtitle, base_price, isbn, metadata,
        book_images(id, image_path, position),
        book_inventory(quantity),
        book_authors(role, authors(name)),
        publishers(name),
        languages(name)`,
      )
      .eq("id", Number(route.params.id))
      .eq("is_active", true)
      .single()

    return data
  },
)

if (error.value || !book.value) {
  throw createError({
    statusCode: 404,
    statusMessage: $t("book_not_found")?.toString(),
  })
}

useHead({
  title: book.value?.title,
})

const imageUrls = computed(() => {
  const images = book.value?.book_images ?? []
  const sorted = [...images].sort((a, b) => a.position - b.position)
  return sorted.map(
    (img) =>
      supabase.storage.from("book-images").getPublicUrl(img.image_path).data
        .publicUrl,
  )
})

const selectedImage = ref(0)

const available = computed(
  () => (book.value?.book_inventory?.quantity ?? 0) > 0,
)

const formattedPrice = computed(() =>
  new Intl.NumberFormat("fa-IR").format(book.value?.base_price ?? 0),
)

const authorNames = computed(() => {
  const entries = book.value?.book_authors ?? []
  return entries
    .filter((ba) => ba.role === "author")
    .map((ba) => ba.authors?.name)
    .filter(Boolean)
})

const translatorNames = computed(() => {
  const entries = book.value?.book_authors ?? []
  return entries
    .filter((ba) => ba.role === "translator")
    .map((ba) => ba.authors?.name)
    .filter(Boolean)
})

const metadataEntries = computed(() => {
  const meta = book.value?.metadata as Record<string, Json> | null
  if (!meta || typeof meta !== "object") return []
  return Object.entries(meta).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  )
})

function handleBuy() {
  if (!user.value) {
    navigateTo("/signin")
    return
  }

  const cart = useCart()
  cart.addItem(book.value!.id, 1)
}
</script>

<template>
  <div v-if="book" class="py-8">
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Images -->
      <div class="lg:w-5/12">
        <UCarousel
          v-slot="{ item }"
          arrows
          dots
          :items="imageUrls"
          class="w-full max-w-md mx-auto"
          @select="(index: number) => (selectedImage = index)"
        >
          <img
            :src="item"
            :alt="book.title"
            class="w-full aspect-3/4 object-cover rounded-lg"
          />
        </UCarousel>

        <!-- Thumbnails -->
        <div v-if="imageUrls.length > 1" class="flex gap-2 justify-center mt-4">
          <div
            v-for="(url, index) in imageUrls"
            :key="index"
            class="size-16 rounded-md overflow-hidden cursor-pointer border-2 transition-all"
            :class="
              selectedImage === index
                ? 'border-primary opacity-100'
                : 'border-transparent opacity-50 hover:opacity-80'
            "
          >
            <img
              :src="url"
              :alt="`${book.title} - ${index + 1}`"
              class="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <!-- Details -->
      <div class="lg:w-7/12 flex flex-col gap-6">
        <!-- Title & Subtitle -->
        <div>
          <h1 class="text-2xl font-bold">{{ book.title }}</h1>
          <p v-if="book.subtitle" class="text-lg text-muted mt-1">
            {{ book.subtitle }}
          </p>
        </div>

        <!-- Authors & Translators -->
        <div class="flex flex-col gap-2">
          <div v-if="authorNames.length" class="flex items-center gap-2">
            <span class="text-sm text-muted">{{ $t("authors") }}:</span>
            <span class="text-sm font-medium">{{
              authorNames.join("، ")
            }}</span>
          </div>
          <div v-if="translatorNames.length" class="flex items-center gap-2">
            <span class="text-sm text-muted">{{ $t("translators") }}:</span>
            <span class="text-sm font-medium">{{
              translatorNames.join("، ")
            }}</span>
          </div>
        </div>

        <!-- Quick Info -->
        <div class="flex flex-wrap gap-4">
          <UBadge v-if="book.publishers" color="neutral" variant="subtle">
            {{ $t("publisher") }}: {{ book.publishers.name }}
          </UBadge>
          <UBadge v-if="book.languages" color="neutral" variant="subtle">
            {{ $t("language") }}: {{ book.languages.name }}
          </UBadge>
          <UBadge v-if="book.isbn" color="neutral" variant="subtle">
            ISBN: {{ book.isbn }}
          </UBadge>
        </div>

        <!-- Price & Buy -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p v-if="available" class="text-xl font-bold">
                {{ formattedPrice }} {{ $t("toman") }}
              </p>
              <p v-else class="text-lg text-muted">
                {{ $t("unavailable") }}
              </p>
            </div>
            <UButton
              :label="$t('buy')?.toString()"
              size="lg"
              :disabled="!available"
              icon="i-lucide-shopping-cart"
              @click="handleBuy"
            />
          </div>
        </UCard>

        <!-- Metadata Table -->
        <div v-if="metadataEntries.length">
          <h2 class="text-lg font-semibold mb-3">
            {{ $t("specifications") }}
          </h2>
          <UCard>
            <table class="w-full text-sm">
              <tbody>
                <tr
                  v-for="([key, value], index) in metadataEntries"
                  :key="key"
                  :class="index % 2 === 0 ? 'bg-elevated/50' : ''"
                >
                  <td class="py-2 px-3 font-medium text-muted w-1/3">
                    {{ key }}
                  </td>
                  <td class="py-2 px-3">{{ value }}</td>
                </tr>
              </tbody>
            </table>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
