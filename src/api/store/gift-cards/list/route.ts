import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GIFT_CARD_LEDGER_MODULE } from "../../../../modules/gift-card-ledger"
import type GiftCardLedgerService from "../../../../modules/gift-card-ledger/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(GIFT_CARD_LEDGER_MODULE) as GiftCardLedgerService

  const rows = await svc.listAll() // you must implement this

  res.json(rows)
}