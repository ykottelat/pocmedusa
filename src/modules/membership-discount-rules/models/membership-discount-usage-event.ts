import { model } from "@medusajs/framework/utils"

export const MembershipDiscountUsageEvent = model.define("membership_discount_usage_event", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  membership_discount_rule_id: model.text(),
  period_key: model.text(),
  delta: model.number(),
  reason: model.text(),
  idempotency_key: model.text().unique().index(),
})
