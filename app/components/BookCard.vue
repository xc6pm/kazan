<script setup lang="ts">
import type { Tables } from "~~/shared/types/database.types"

const props = defineProps<{
  book: Pick<Tables<"books">, "id" | "title" | "base_price"> & {
    book_images: Pick<Tables<"book_images">, "image_path" | "position">[]
  } & {
    book_inventory: Pick<Tables<"book_inventory">, "quantity"> | null
  }
}>()

const { $t } = useI18n()

const supabase = useSupabaseClient()

const imageUrl = computed(() => {
  const cover = props.book.book_images.find((img) => img.position === 0)
  if (!cover) return "/placeholder-book.svg"
  return supabase.storage.from("book-images").getPublicUrl(cover.image_path)
    .data.publicUrl
})

const available = computed(() => !!props.book.book_inventory?.quantity)

const formattedPrice = computed(() =>
  new Intl.NumberFormat("fa-IR").format(props.book.base_price),
)
</script>

<template>
  <ULink :to="`/book/${props.book.id}`">
    <UCard
      class="transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-pointer"
    >
      <template #header>
        <img
          :src="imageUrl"
          :alt="props.book.title"
          class="w-full h-56 object-cover rounded-md"
        />
      </template>

      <div class="flex flex-col gap-1">
        <p class="font-semibold text-sm truncate" :title="props.book.title">
          {{ props.book.title }}
        </p>
        <p v-if="available" class="text-xs text-muted text-left">
          {{ formattedPrice }} تومان
        </p>
        <p v-else class="text-xs text-muted text-left">
          {{ $t("unavailable") }}
        </p>
      </div>
    </UCard>
  </ULink>
</template>
