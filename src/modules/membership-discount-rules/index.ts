import { Module } from "@medusajs/framework/utils"
import { MEMBERSHIP_DISCOUNT_RULES_MODULE } from "./constants"
import MembershipDiscountRulesService from "./service"

export default Module(MEMBERSHIP_DISCOUNT_RULES_MODULE, {
  service: MembershipDiscountRulesService,
})

export { MEMBERSHIP_DISCOUNT_RULES_MODULE }
