import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEMBERSHIP_DISCOUNT_RULES_MODULE } from "../../../modules/membership-discount-rules"
import type MembershipDiscountRulesService from "../../../modules/membership-discount-rules/service"
import type { CreateMembershipDiscountInput } from "../../../modules/membership-discount-rules/types"

/**
 * Contract: POST /admin/membership-discounts
 * Body: CreateMembershipDiscountInput
 * Response: { membership_discount: { ...discount, rules[] } }
 */
export const POST = async (
  req: MedusaRequest<CreateMembershipDiscountInput>,
  res: MedusaResponse
) => {
  const svc = req.scope.resolve(MEMBERSHIP_DISCOUNT_RULES_MODULE) as MembershipDiscountRulesService
  const out = await svc.createDiscountDefinition(req.body)
  res.json({ membership_discount: out })
}

/**
 * Contract: GET /admin/membership-discounts
 * Response: { membership_discounts: DiscountDefinition[] }
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(MEMBERSHIP_DISCOUNT_RULES_MODULE) as MembershipDiscountRulesService
  const rows = await svc.listDiscountDefinitions()
  res.json({ membership_discounts: rows })
}
