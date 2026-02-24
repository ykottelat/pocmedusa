import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEMBERSHIP_DISCOUNT_RULES_MODULE } from "../../../../modules/membership-discount-rules"
import type MembershipDiscountRulesService from "../../../../modules/membership-discount-rules/service"
import type { CreateMembershipDiscountInput } from "../../../../modules/membership-discount-rules/types"

/**
 * Contract: GET /admin/membership-discounts/:id
 * Response: { membership_discount: DiscountDefinition }
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(MEMBERSHIP_DISCOUNT_RULES_MODULE) as MembershipDiscountRulesService
  const { id } = req.params
  const row = await svc.getDiscountDefinition(id)
  res.json({ membership_discount: row })
}

/**
 * Contract: PUT /admin/membership-discounts/:id
 * Body: CreateMembershipDiscountInput (replace current definition)
 * Response: { membership_discount: DiscountDefinition }
 */
export const PUT = async (
  req: MedusaRequest<CreateMembershipDiscountInput>,
  res: MedusaResponse
) => {
  const svc = req.scope.resolve(MEMBERSHIP_DISCOUNT_RULES_MODULE) as MembershipDiscountRulesService
  const { id } = req.params
  const row = await svc.updateDiscountDefinition(id, req.body)

  res.json({ membership_discount: row })
}
