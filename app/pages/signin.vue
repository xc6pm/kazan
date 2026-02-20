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
})

const loading = ref(false)
const error = ref("")

const schema = z.object({
  email: z.email($t("invalid_email")?.toString() ?? "Invalid email address"),
  password: z
    .string()
    .min(
      6,
      $t("password_min_length")?.toString() ??
        "Password must be at least 6 characters",
    ),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ""

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: event.data.email,
      password: event.data.password,
    })

    if (signInError) {
      if (signInError.code === "email_not_confirmed") {
        error.value =
          $t("email_not_confirmed")?.toString() ??
          "Email not confirmed. Please check your inbox."
        const otpResendRes = await supabase.auth.resend({
          type: "signup",
          email: state.email,
        })
        console.log(otpResendRes)
      } else {
        error.value = signInError.message
        console.error(signInError)
      }
    } else {
      // Redirect will happen automatically via watchEffect
      router.push("/")
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex md:mt-12 items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-2xl font-bold text-center">{{ $t("sign_in") }}</h1>
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
            placeholder="your@email.com"
            icon="i-heroicons-envelope"
            size="lg"
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
            block
          />
        </UFormField>

        <UAlert
          v-if="error"
          icon="i-heroicons-exclamation-triangle"
          color="error"
          variant="soft"
          :title="$t('error')?.toString()"
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
          {{ $t("sign_in") }}
        </UButton>
      </UForm>

      <template #footer>
        <div class="text-center text-sm">
          <p class="text-gray-600 dark:text-gray-400">
            {{ $t("dont_have_account?") }}
            <NuxtLink
              to="/signup"
              class="text-primary font-semibold hover:underline"
            >
              {{ $t("sign_up") }}
            </NuxtLink>
          </p>
        </div>
      </template>
    </UCard>
  </div>
</template>
