import type { Database } from "~~/shared/types/database.types"
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server"

interface CheckoutBody {
  items: { bookId: number; quantity: number }[]
  shipment: {
    address: string
    city: string
    recipientName: string
    phoneNumber: string
    postalCode?: string
    deliveryTypeId?: number
  }
  paymentProviderId: number
}

export default defineEventHandler(async (event) => {
  // Only accept POST
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method Not Allowed" })
  }

  // Authenticate user
  const authUser = await serverSupabaseUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Look up internal user by auth_user_id
  const { data: user, error: userError } = await client
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.sub)
    .single()

  if (userError || !user) {
    throw createError({ statusCode: 401, statusMessage: "User not found" })
  }

  // Parse and validate request body
  const body = await readBody<CheckoutBody>(event)

  if (!body.items || !body.items.length) {
    throw createError({ statusCode: 400, statusMessage: "Cart is empty" })
  }

  if (!body.shipment) {
    throw createError({
      statusCode: 400,
      statusMessage: "Shipment info is required",
    })
  }

  if (!body.paymentProviderId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Payment provider is required",
    })
  }

  // Fetch book prices for all items in the cart
  const bookIds = body.items.map((item) => item.bookId)

  const { data: books, error: booksError } = await client
    .from("books")
    .select("id, base_price, is_active")
    .in("id", bookIds)

  if (booksError || !books) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch book data",
    })
  }

  // Validate all books exist and are active
  const bookMap = new Map(books.map((b) => [b.id, b]))

  for (const item of body.items) {
    const book = bookMap.get(item.bookId)
    if (!book) {
      throw createError({
        statusCode: 400,
        statusMessage: `Book with id ${item.bookId} not found`,
      })
    }
    if (!book.is_active) {
      throw createError({
        statusCode: 400,
        statusMessage: `Book with id ${item.bookId} is not available`,
      })
    }
    if (item.quantity < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: "Quantity must be at least 1",
      })
    }
  }

  // Calculate totals
  const subtotalAmount = body.items.reduce((sum, item) => {
    const book = bookMap.get(item.bookId)!
    return sum + book.base_price * item.quantity
  }, 0)

  const deliveryPrice = 80000 // Temporary fake value
  const totalAmount = subtotalAmount + deliveryPrice

  // Create order, items, and shipment in a single transaction via RPC
  const orderItems = body.items.map((item) => ({
    book_id: item.bookId,
    quantity: item.quantity,
    unit_price: bookMap.get(item.bookId)!.base_price,
  }))

  const { data: orderId, error: rpcError } = await client.rpc("create_order", {
    p_user_id: user.id,
    p_order_status_id: 1, // pending
    p_payment_provider_id: body.paymentProviderId,
    p_subtotal_amount: subtotalAmount,
    p_delivery_price: deliveryPrice,
    p_total_amount: totalAmount,
    p_items: orderItems,
    p_shipment: {
      address: body.shipment.address,
      city: body.shipment.city,
      recipient_name: body.shipment.recipientName,
      phone_number: body.shipment.phoneNumber,
      postal_code: body.shipment.postalCode ?? null,
      delivery_type_id: body.shipment.deliveryTypeId ?? null,
    },
  })

  if (rpcError || !orderId) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create order",
    })
  }

  return {
    orderId,
    totalAmount,
    status: "pending",
  }
})
