export type RulePeriod = "day" | "week" | "month" | "year" | "membership" | "unlimited"
export type RuleDiscountType = "percentage" | "fixed"

export type RuleScope = {
  product_ids?: string[]
  variant_ids?: string[]
  collection_ids?: string[]
}

export type CreateMembershipDiscountRuleInput = {
  name: string
  order_index: number
  discount_type: RuleDiscountType
  discount_value: number
  applies_to: RuleScope
  limit_count: number | null
  period: RulePeriod
  active?: boolean
}

export type CreateMembershipDiscountInput = {
  name: string
  membership_product_id: string
  active?: boolean
  rules: CreateMembershipDiscountRuleInput[]
}

export type MembershipCounterMap = Record<string, {
  period_key: string
  count_used: number
  lifetime_used: number
}>

export type MembershipDiscountMetadata = {
  membership_discounts?: MembershipCounterMap
  [key: string]: unknown
}
