import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { MEMBERSHIP_DISCOUNT_RULES_MODULE } from "../../../../modules/membership-discount-rules"
import type MembershipDiscountRulesService from "../../../../modules/membership-discount-rules/service"
import type { MembershipDiscountMetadata } from "../../../../modules/membership-discount-rules/types"

type Body = {
  customer_id: string
  membership_discount_id: string
  membership_discount_rule_id: string
  at?: string
  reason?: string
  idempotency_key?: string
}

/**
 * Contract: POST /store/membership-discounts/reverse
 * Decrements metadata counters for a specific rule and appends usage event.
 */
export const POST = async (req: MedusaRequest<Body>, res: MedusaResponse) => {
  const svc = req.scope.resolve(MEMBERSHIP_DISCOUNT_RULES_MODULE) as MembershipDiscountRulesService
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  const body = req.body ?? ({} as Body)
  const at = body.at ?? new Date().toISOString()
  const idempotency_key =
    (req.headers["idempotency-key"] as string | undefined) ?? body.idempotency_key

  if (!idempotency_key) {
    throw new Error("Missing Idempotency-Key header (or idempotency_key in body)")
  }

  const discount = await svc.getDiscountDefinition(body.membership_discount_id)
  const rule = (discount.rules as any[]).find((r) => r.id === body.membership_discount_rule_id)
  if (!rule) throw new Error("membership discount rule not found")

  const customer = await customerModuleService.retrieveCustomer(body.customer_id, {
    select: ["id", "metadata"],
  })

  const metadata = (customer.metadata ?? {}) as MembershipDiscountMetadata
  const period_key = svc.getPeriodKey(rule.period, at)
  const nextMetadata = svc.decrementRuleCounter(metadata, rule.id, rule.period, at)

  await customerModuleService.updateCustomers([body.customer_id], {
    metadata: nextMetadata,
  })

  const event = await svc.appendUsageEvent({
    customer_id: body.customer_id,
    membership_discount_rule_id: rule.id,
    period_key,
    delta: -1,
    reason: body.reason ?? "reverse",
    idempotency_key,
  })

  res.json({
    reversed: true,
    customer_id: body.customer_id,
    membership_discount_rule_id: rule.id,
    period_key,
    usage_event_id: event.id,
    idempotent: event.idempotent,
  })
}
