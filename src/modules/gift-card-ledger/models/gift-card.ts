import { model } from "@medusajs/framework/utils"

export const GiftCard = model.define("gift_card", {
  id: model.id().primaryKey(),

  code: model.text().unique(),

  currency: model.text(),

  legal_entity_id: model.text(),

  status: model.enum(["active", "disabled"]).default("active"),
})