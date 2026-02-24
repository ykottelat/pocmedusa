import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEMBERSHIP_ENTITLEMENT_MODULE } from "../../../../modules/membership-entitlement"
import type MembershipEntitlementService from "../../../../modules/membership-entitlement/service"

type Body = {
  membership_id: string
  rule_id: string
  slot_key: string
  ticket_id: string
  booking_day: string
  idempotency_key?: string
}

export const POST = async (req: MedusaRequest<Body>, res: MedusaResponse) => {
  const svc = req.scope.resolve(MEMBERSHIP_ENTITLEMENT_MODULE) as MembershipEntitlementService

  const body = req.body ?? ({} as Body)
  const idempotency_key =
    (req.headers["idempotency-key"] as string | undefined) ?? body.idempotency_key

  if (!idempotency_key) {
    throw new Error("Missing Idempotency-Key header (or idempotency_key in body)")
  }

  const out = await svc.consume({
    membership_id: body.membership_id,
    rule_id: body.rule_id,
    slot_key: body.slot_key,
    ticket_id: body.ticket_id,
    booking_day: body.booking_day,
    idempotency_key,
  })

  res.json(out)
}
