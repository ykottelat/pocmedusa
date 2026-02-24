import { model } from "@medusajs/framework/utils"

export const MembershipDiscount = model.define("membership_discount", {
  id: model.id().primaryKey(),
  name: model.text(),
  membership_product_id: model.text(),
  active: model.boolean().default(true),
})
