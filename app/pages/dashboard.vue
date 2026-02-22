<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

const { $t } = useI18n()

const supabase = useSupabaseClient()

const signout = async () => {
  const { error } = await supabase.auth.signOut()

  console.log("logout error:", error)
  if (!error) {
    await navigateTo("/")
  } else {
    const toast = useToast()
    toast.add({
      title: $t("signout_unsuccessful")?.toString(),
      description: error.message,
    })
  }
}

// Display name update
const displayNameState = reactive({
  displayName: "",
})

const displayNameLoading = ref(false)
const displayNameError = ref("")
const displayNameSuccess = ref(false)

const displayNameSchema = z.object({
  displayName: z
    .string()
    .min(
      2,
      $t("display_name_min_length")?.toString() ??
        "Display name must be at least 2 characters",
    )
    .max(
      50,
      $t("display_name_max_length")?.toString() ??
        "Display name must be at most 50 characters",
    ),
})

type DisplayNameSchema = z.output<typeof displayNameSchema>

async function onDisplayNameSubmit(event: FormSubmitEvent<DisplayNameSchema>) {
  displayNameLoading.value = true
  displayNameError.value = ""
  displayNameSuccess.value = false

  try {
    const { error } = await supabase.rpc("update_display_name", {
      new_display_name: event.data.displayName,
    })

    if (error) {
      displayNameError.value = error.message
      console.error("update display name error:", error)
    } else {
      displayNameSuccess.value = true
      setTimeout(() => {
        displayNameSuccess.value = false
      }, 3000)
    }
  } catch (e) {
    displayNameError.value =
      $t("unexpected_error")?.toString() ?? "An unexpected error occurred"
    console.error(e)
  } finally {
    displayNameLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="max-w-md space-y-4 mt-4">
      <h2 class="text-xl font-bold">{{ $t("update_display_name") }}</h2>

      <UForm
        :schema="displayNameSchema"
        :state="displayNameState"
        class="space-y-4"
        @submit="onDisplayNameSubmit"
      >
        <UFormField
          :label="$t('display_name')?.toString()"
          name="displayName"
          required
        >
          <UInput
            v-model="displayNameState.displayName"
            type="text"
            :placeholder="$t('display_name_placeholder')?.toString()"
            icon="i-heroicons-user"
            size="lg"
            block
          />
        </UFormField>

        <UAlert
          v-if="displayNameError"
          icon="i-heroicons-exclamation-triangle"
          color="error"
          variant="soft"
          :title="displayNameError"
          :close-button="{
            icon: 'i-heroicons-x-mark-20-solid',
            color: 'error',
            variant: 'link',
          }"
          @close="displayNameError = ''"
        />

        <UAlert
          v-if="displayNameSuccess"
          icon="i-heroicons-check-circle"
          color="success"
          variant="soft"
          :title="$t('display_name_updated')?.toString()"
        />

        <UButton
          type="submit"
          size="lg"
          :loading="displayNameLoading"
          :disabled="displayNameLoading"
        >
          {{ $t("save") }}
        </UButton>
      </UForm>
    </section>

    <UButton
      :label="$t('sign_out')?.toString()"
      color="error"
      variant="outline"
      @click="signout"
    />
  </div>
</template>
