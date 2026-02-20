<script setup lang="ts">
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
</script>

<template>
  <UButton
    :label="$t('sign_out')?.toString()"
    color="error"
    variant="outline"
    class="mt-4"
    @click="signout"
  />
</template>
