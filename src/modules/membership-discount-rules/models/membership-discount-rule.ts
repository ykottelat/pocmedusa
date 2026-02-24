import { model } from "@medusajs/framework/utils"
import { MembershipDiscount } from "./membership-discount"

export const MembershipDiscountRule = model.define("membership_discount_rule", {
  id: model.id().primaryKey(),
  membership_discount: model.belongsTo(() => MembershipDiscount, {
    foreignKey: true,
  }),
  name: model.text(),
  order_index: model.number(),
  discount_type: model.enum(["percentage", "fixed"]),
  discount_value: model.number(),
  applies_to_json: model.text(),
  limit_count: model.number().nullable(),
  period: model.enum(["day", "week", "month", "year", "membership", "unlimited"]),
  active: model.boolean().default(true),
})
