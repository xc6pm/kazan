<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

definePageMeta({
  layout: "default",
})

const { $t } = useI18n()

useHead({
  title: $t("page_title_verify_phone")?.toString(),
})

const route = useRoute()
const phone = computed(() => (route.query.phone as string) ?? "")

const state = reactive({
  code: "",
})

const loading = ref(false)
const error = ref("")

const schema = z.object({
  code: z
    .string()
    .regex(
      /^\d{6}$/,
      $t("invalid_verification_code")?.toString() ??
        "Please enter a valid 6-digit code",
    ),
})

type Schema = z.output<typeof schema>

const supabase = useSupabaseClient()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ""

  try {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone.value,
      token: event.data.code,
      type: "sms",
    })

    if (verifyError) {
      error.value = verifyError.message
      console.error("verify error:", verifyError)
    } else {
      navigateTo("/signin")
    }
  } catch (e) {
    error.value =
      $t("unexpected_error")?.toString() ?? "An unexpected error occurred"
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function resendCode() {
  if (!phone.value) return
  loading.value = true
  error.value = ""

  try {
    const { error: resendError } = await supabase.auth.resend({
      type: "sms",
      phone: phone.value,
    })

    if (resendError) {
      error.value = resendError.message
      console.error("resend error:", resendError)
    }
  } catch (e) {
    error.value =
      $t("unexpected_error")?.toString() ?? "An unexpected error occurred"
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function requestOtp() {}
</script>

<template>
  <div class="flex md:mt-12 items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-2xl font-bold text-center">
          {{ $t("verify_phone") }}
        </h1>
        <p
          v-if="phone"
          class="text-sm text-gray-500 dark:text-gray-400 text-center mt-2"
        >
          {{ $t("verification_code_sent_to") }} {{ phone }}
        </p>
      </template>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('verification_code')?.toString()"
          name="code"
          required
        >
          <UInput
            v-model="state.code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            :placeholder="$t('verification_code_placeholder')?.toString()"
            icon="i-heroicons-shield-check"
            size="lg"
            block
          />
        </UFormField>

        <UAlert
          v-if="error"
          icon="i-heroicons-exclamation-triangle"
          color="error"
          variant="soft"
          :title="error"
          :close-button="{
            icon: 'i-heroicons-x-mark-20-solid',
            color: 'error',
            variant: 'link',
          }"
          @close="error = ''"
        />

        <UButton
          type="submit"
          size="lg"
          block
          :loading="loading"
          :disabled="loading"
        >
          {{ $t("verify") }}
        </UButton>
      </UForm>

      <template #footer>
        <div class="text-center text-sm">
          <p class="text-gray-600 dark:text-gray-400">
            {{ $t("didnt_receive_code?") }}
            <button
              type="button"
              class="text-primary font-semibold hover:underline"
              :disabled="loading"
              @click="resendCode"
            >
              {{ $t("resend_code") }}
            </button>
          </p>
        </div>
      </template>
    </UCard>
  </div>
</template>
