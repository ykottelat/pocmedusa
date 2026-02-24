import { model } from "@medusajs/framework/utils"
import { GiftCard } from "./gift-card"

export const GiftCardEvent = model.define("gift_card_event", {
  id: model.id().primaryKey(),

  // This relation will create gift_card_id for you.
  gift_card: model.belongsTo(() => GiftCard, {
    foreignKey: true,
  }),

  type: model.enum(["ISSUE", "REDEEM", "VOID"]),

  // signed integer (cents): ISSUE positive, REDEEM negative
  amount: model.number(),

  currency: model.text(),

  source: model.enum(["MEDUSA", "LIGHTSPEED", "ADMIN"]),

  reference: model.text(),

  idempotency_key: model.text().unique().index(),
})