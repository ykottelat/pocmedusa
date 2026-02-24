import { Module } from "@medusajs/framework/utils"
import GiftCardLedgerService from "./service"
import { GIFT_CARD_LEDGER_MODULE } from "./constants"

export default Module(GIFT_CARD_LEDGER_MODULE, {
  service: GiftCardLedgerService,
})

export { GIFT_CARD_LEDGER_MODULE }