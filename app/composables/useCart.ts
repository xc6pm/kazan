export default function useCart() {
  const cart = useStatefulCookie<{ bookId: number; quantity: number }[]>("cart")
  if (!cart.value) cart.value = []

  const count = computed(() => cart.value.length)

  const addItem = (bookId: number, quantity: number) => {
    const existingItem = cart.value.find((item) => item.bookId === bookId)

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      cart.value.push({ bookId, quantity })
    }
  }

  const removeItem = (bookId: number, quantity: number) => {
    const item = cart.value.find((i) => i.bookId === bookId)
    if (!item) return
    item.quantity -= quantity
    if (item.quantity <= 0) {
      cart.value = cart.value.filter((i) => i.bookId !== bookId)
    }
  }

  return {
    cart,
    count,
    addItem,
    removeItem,
  }
}
