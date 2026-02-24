import { model } from "@medusajs/framework/utils"

export const MembershipEntitlementState = model.define("membership_entitlement_state", {
  id: model.id().primaryKey(),
  membership_id: model.text(),
  rule_id: model.text(),
  slot_key: model.text(),
  ticket_id: model.text(),
  period_key: model.text(),
  status: model.enum(["CONSUMED", "RELEASED"]).default("CONSUMED"),
})
