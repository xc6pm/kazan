<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

definePageMeta({
  layout: "default",
})

const { $t } = useI18n()

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

// Redirect if already logged in
watchEffect(() => {
  if (user.value) {
    router.push("/")
  }
})

const state = reactive({
  email: "",
  password: "",
  confirmPassword: "",
})

const loading = ref(false)
const error = ref("")
const success = ref(false)

const schema = z
  .object({
    email: z.email($t("invalid_email")?.toString() ?? "Invalid email address"),
    password: z
      .string()
      .min(
        6,
        $t("password_min_length")?.toString() ??
          "Password must be at least 6 characters",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: $t("passwords_dont_match")?.toString() ?? "Passwords don't match",
    path: ["confirmPassword"],
  })

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ""
  success.value = false

  try {
    const { error: signUpError } = await supabase.auth.signUp({
      email: event.data.email,
      password: event.data.password,
    })

    if (signUpError) {
      error.value = signUpError.message
    } else {
      success.value = true
      // Redirect after successful signup
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    }
  } catch (e) {
    error.value =
      $t("unexpected_error")?.toString() ?? "An unexpected error occurred"
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-2xl font-bold text-center">{{ $t("sign_up") }}</h1>
      </template>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField :label="$t('email')?.toString()" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            :placeholder="$t('email_placeholder')?.toString()"
            icon="i-heroicons-envelope"
            size="lg"
            block
          />
        </UFormField>

        <UFormField
          :label="$t('password')?.toString()"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            type="password"
            placeholder="******"
            icon="i-heroicons-lock-closed"
            size="lg"
          />
        </UFormField>

        <UFormField
          :label="$t('confirm_password')?.toString()"
          name="confirmPassword"
          required
        >
          <UInput
            v-model="state.confirmPassword"
            type="password"
            placeholder="******"
            icon="i-heroicons-lock-closed"
            size="lg"
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

        <UAlert
          v-if="success"
          icon="i-heroicons-check-circle"
          color="success"
          variant="soft"
          :title="$t('signup_success')?.toString()"
          :description="$t('redirecting_to_login')?.toString()"
        />

        <UButton
          type="submit"
          size="lg"
          block
          :loading="loading"
          :disabled="loading || success"
        >
          {{ $t("sign_up") }}
        </UButton>
      </UForm>

      <template #footer>
        <div class="text-center text-sm">
          <p class="text-gray-600 dark:text-gray-400">
            {{ $t("already_have_account?") }}
            <NuxtLink
              to="/login"
              class="text-primary font-semibold hover:underline"
            >
              {{ $t("sign_in") }}
            </NuxtLink>
          </p>
        </div>
      </template>
    </UCard>
  </div>
</template>
