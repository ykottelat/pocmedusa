import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEMBERSHIP_ENTITLEMENT_MODULE } from "../../../modules/membership-entitlement"
import type MembershipEntitlementService from "../../../modules/membership-entitlement/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(MEMBERSHIP_ENTITLEMENT_MODULE) as MembershipEntitlementService

  const [states, events] = await Promise.all([svc.listStates(), svc.listEvents()])

  res.json({ states, events })
}
