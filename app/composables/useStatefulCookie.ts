// Expires in 1 year
const expires = new Date()
expires.setTime(expires.getTime() + 365 * 24 * 60 * 60 * 1000)

// Make cookie use state across app
export default function useStatefulCookie<TState>(name: string) {
  const cookie = useCookie<TState>(name, { expires })
  const state = useState<TState>(name, () => cookie.value)

  watch(
    state,
    () => {
      cookie.value = state.value
    },
    { deep: true },
  )

  return state
}
