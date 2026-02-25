<script setup lang="ts">
import type { Database } from "~~/shared/types/database.types"

const { $t } = useI18n()

useHead({
  title: $t("page_title_home")?.toString(),
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient<Database>()

const PAGE_SIZE = 5

const page = computed({
  get: () => Number(route.query.page) || 1,
  set: (val: number) => router.push({ query: { ...route.query, page: val } }),
})

const { data: result } = await useAsyncData(
  "books",
  async () => {
    const from = (page.value - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    return supabase
      .from("books")
      .select(
        "id, title, base_price, book_images(image_path, position), book_inventory(quantity)",
        { count: "exact" },
      )
      .eq("is_active", true)
      .order("book_inventory(quantity)", {
        ascending: false,
        nullsFirst: false,
      })
      .range(from, to)
  },
  { watch: [page] },
)

const books = computed(() => result.value?.data ?? [])
const totalBooks = computed(() => result.value?.count ?? 0)
</script>

<template>
  <div class="flex flex-col gap-6 py-6">
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
    >
      <BookCard v-for="book in books" :key="book.id" :book="book" />
    </div>

    <div class="flex justify-center">
      <UPagination
        v-model:page="page"
        :items-per-page="PAGE_SIZE"
        :total="totalBooks"
        :to="(p: number) => ({ query: { ...route.query, page: p } })"
        show-edges
        :sibling-count="1"
      />
    </div>
  </div>
</template>
