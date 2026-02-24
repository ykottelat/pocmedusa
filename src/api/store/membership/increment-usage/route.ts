import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const POST = async (_req: MedusaRequest, res: MedusaResponse) => {
  return res.status(410).json({
    error: "Deprecated endpoint. Use /store/membership-entitlements/consume and /store/membership-entitlements/release.",
  })
}
