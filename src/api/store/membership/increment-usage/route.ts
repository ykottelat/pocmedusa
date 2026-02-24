import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type Body = {
  customer_id: string
  increment_by?: number
}

type MembershipDetailsMeta = {
  usage_count?: number
  [key: string]: unknown
}

export const POST = async (req: MedusaRequest<Body>, res: MedusaResponse) => {
  const { customer_id, increment_by } = req.body ?? {}

  if (!customer_id) {
    return res.status(400).json({ error: "customer_id is required" })
  }

  const inc = Number.isFinite(increment_by) ? Number(increment_by) : 1
  if (!Number.isInteger(inc) || inc <= 0) {
    return res.status(400).json({ error: "increment_by must be a positive integer" })
  }

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  // Ensure metadata is loaded (otherwise you can't preserve it)
  const customer = await customerModuleService.retrieveCustomer(customer_id, {
    select: ["id", "metadata"],
  })

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>

  const existing = metadata["Membership_Details"]
  const details: MembershipDetailsMeta =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as MembershipDetailsMeta)
      : {}

  const currentRaw = details.usage_count
  const current =
    typeof currentRaw === "number"
      ? currentRaw
      : parseInt(String(currentRaw ?? "0"), 10) || 0

  const next = current + inc

  const newDetails: MembershipDetailsMeta = {
    ...details,          // preserves abc/other/etc
    usage_count: next,   // overwrites only the counter
  }

  await customerModuleService.updateCustomers([customer_id], {
    metadata: {
      ...metadata, // preserves other top-level metadata keys
      Membership_Details: newDetails,
    },
  })

  return res.json({
    customer_id,
    previous: current,
    current: next,
    Membership_Details: newDetails,
  })
}