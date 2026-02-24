import { model } from "@medusajs/framework/utils"

export const MembershipEntitlementEvent = model.define("membership_entitlement_event", {
  id: model.id().primaryKey(),
  membership_id: model.text(),
  rule_id: model.text(),
  slot_key: model.text(),
  ticket_id: model.text(),
  period_key: model.text(),
  type: model.enum(["CONSUME", "RELEASE"]),
  idempotency_key: model.text().unique().index(),
})
