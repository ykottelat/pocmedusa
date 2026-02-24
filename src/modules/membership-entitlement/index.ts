import { Module } from "@medusajs/framework/utils"
import { MEMBERSHIP_ENTITLEMENT_MODULE } from "./constants"
import MembershipEntitlementService from "./service"

export default Module(MEMBERSHIP_ENTITLEMENT_MODULE, {
  service: MembershipEntitlementService,
})

export { MEMBERSHIP_ENTITLEMENT_MODULE }
