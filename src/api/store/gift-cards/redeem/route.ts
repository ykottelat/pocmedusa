import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GIFT_CARD_LEDGER_MODULE } from "../../../../modules/gift-card-ledger"
import type GiftCardLedgerService from "../../../../modules/gift-card-ledger/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(GIFT_CARD_LEDGER_MODULE) as GiftCardLedgerService

  const body = req.body as any
  const idempotency_key =
    (req.headers["idempotency-key"] as string | undefined) ?? body.idempotency_key

  if (!idempotency_key) {
    throw new Error("Missing Idempotency-Key header (or idempotency_key in body)")
  }

  const { code, amount, currency, pos_receipt_id } = body

  const out = await svc.redeem({
    code,
    amount,
    currency,
    reference: pos_receipt_id,
    idempotency_key,
    source: "LIGHTSPEED",
  })

  res.json(out)
}