<script setup lang="ts">
import type { Database } from "#build/types/supabase-database"

const supabase = useSupabaseClient<Database>()

const { data: all } = await supabase.from("roles").select("*")

const user = useSupabaseUser()
</script>

<template>
  Some text

  <p>
    {{ all }}
  </p>

  <p>{{ user }}</p>
</template>
