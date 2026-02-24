import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEMBERSHIP_DISCOUNT_RULES_MODULE } from "../../../../modules/membership-discount-rules"
import type MembershipDiscountRulesService from "../../../../modules/membership-discount-rules/service"
import type { MembershipDiscountMetadata, RuleScope } from "../../../../modules/membership-discount-rules/types"
import { Modules } from "@medusajs/framework/utils"

type EvaluateLineItem = {
  line_id: string
  product_id?: string
  variant_id?: string
  unit_price: number
  quantity: number
}

type EvaluateBody = {
  membership_discount_id: string
  customer_id: string
  at?: string
  items: EvaluateLineItem[]
}

function matchesScope(item: EvaluateLineItem, scope: RuleScope): boolean {
  if (scope.product_ids?.length && item.product_id && scope.product_ids.includes(item.product_id)) {
    return true
  }
  if (scope.variant_ids?.length && item.variant_id && scope.variant_ids.includes(item.variant_id)) {
    return true
  }
  return false
}

/**
 * Contract: POST /store/membership-discounts/evaluate
 * Returns applicable rules in order with allowance status based on customer metadata counters.
 */
export const POST = async (req: MedusaRequest<EvaluateBody>, res: MedusaResponse) => {
  const svc = req.scope.resolve(MEMBERSHIP_DISCOUNT_RULES_MODULE) as MembershipDiscountRulesService
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  const body = req.body
  const at = body.at ?? new Date().toISOString()

  const discount = await svc.getDiscountDefinition(body.membership_discount_id)
  const customer = await customerModuleService.retrieveCustomer(body.customer_id, {
    select: ["id", "metadata"],
  })
  const metadata = (customer.metadata ?? {}) as MembershipDiscountMetadata

  const evaluations = body.items.map((item) => {
    const applicable = discount.rules.filter((r: any) => r.active && matchesScope(item, r.applies_to as RuleScope))

    const ordered = applicable.map((rule: any) => {
      const check = svc.canUseRule(metadata, rule.id, rule.period, rule.limit_count, at)
      return {
        rule_id: rule.id,
        rule_name: rule.name,
        order_index: rule.order_index,
        discount_type: rule.discount_type,
        discount_value: rule.discount_value,
        period: rule.period,
        limit_count: rule.limit_count,
        counter_current: check.current,
        period_key: check.period_key,
        allowed: check.allowed,
      }
    })

    return {
      line_id: item.line_id,
      applicable_rules: ordered,
      first_allowed_rule: ordered.find((r) => r.allowed) ?? null,
    }
  })

  res.json({
    membership_discount_id: discount.id,
    customer_id: body.customer_id,
    evaluated_at: at,
    items: evaluations,
  })
}
