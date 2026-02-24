import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GIFT_CARD_LEDGER_MODULE } from "../../../modules/gift-card-ledger"
import type GiftCardLedgerService from "../../../modules/gift-card-ledger/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(GIFT_CARD_LEDGER_MODULE) as GiftCardLedgerService

  // List raw gift cards from DB
  const cards = await svc.listAll()

  // Enrich each card with computed balance + full event log
  const enriched = await Promise.all(
    cards.map(async (c: any) => {
      const { card, balance } = await svc.getByCode(c.code)
      const events = await svc.listEvents(c.code)

      // Merge DB row with computed fields (balance/events)
      return {
        ...card,      // ensures id/code/currency/legal_entity_id/status/created_at are present
        ...c,         // keeps any extra columns listAll returns
        balance,
        events,
      }
    })
  )

  res.json({ gift_cards: enriched })
}