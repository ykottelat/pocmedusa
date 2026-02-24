import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import type { EntityManager } from "@medusajs/framework/mikro-orm/knex"
import { randomUUID } from "crypto"

import { MembershipDiscount } from "./models/membership-discount"
import { MembershipDiscountRule } from "./models/membership-discount-rule"
import { MembershipDiscountUsageEvent } from "./models/membership-discount-usage-event"
import type {
  CreateMembershipDiscountInput,
  MembershipDiscountMetadata,
  RulePeriod,
} from "./types"

function assertRequired(v: string, field: string) {
  if (!v || !v.trim()) throw new Error(`${field} is required`)
}

function parseScope(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

async function tableExists(manager: EntityManager, tableName: string): Promise<boolean> {
  const rows = (await manager.execute(
    `SELECT to_regclass(?) as table_name`,
    [tableName]
  )) as Array<{ table_name: string | null }>

  return Boolean(rows?.[0]?.table_name)
}

export default class MembershipDiscountRulesService extends MedusaService({
  MembershipDiscount,
  MembershipDiscountRule,
  MembershipDiscountUsageEvent,
}) {
  @InjectManager()
  async createDiscountDefinition(
    input: CreateMembershipDiscountInput,
    @MedusaContext() ctx?: Context<EntityManager>
  ) {
    if (!ctx?.manager) throw new Error("DB manager not available")

    assertRequired(input.name, "name")
    assertRequired(input.membership_product_id, "membership_product_id")

    return ctx.manager.transactional(async (m) => {
      const discountId = randomUUID()

      await m.execute(
        `INSERT INTO membership_discount
         (id, name, membership_product_id, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [discountId, input.name, input.membership_product_id, input.active ?? true]
      )

      const rules = [...(input.rules ?? [])].sort((a, b) => a.order_index - b.order_index)

      for (const rule of rules) {
        const ruleId = randomUUID()
        await m.execute(
          `INSERT INTO membership_discount_rule
           (id, membership_discount_id, name, order_index, discount_type, discount_value, applies_to_json, limit_count, period, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            ruleId,
            discountId,
            rule.name,
            rule.order_index,
            rule.discount_type,
            rule.discount_value,
            JSON.stringify(rule.applies_to ?? {}),
            rule.limit_count,
            rule.period,
            rule.active ?? true,
          ]
        )
      }

      return this.getDiscountDefinition(discountId, { manager: m })
    })
  }

  @InjectManager()
  async updateDiscountDefinition(
    id: string,
    input: CreateMembershipDiscountInput,
    @MedusaContext() ctx?: Context<EntityManager>
  ) {
    if (!ctx?.manager) throw new Error("DB manager not available")

    assertRequired(id, "id")
    assertRequired(input.name, "name")
    assertRequired(input.membership_product_id, "membership_product_id")

    return ctx.manager.transactional(async (m) => {
      const discountTableReady = await tableExists(m, "membership_discount")
      if (!discountTableReady) {
        throw new Error("membership discount tables are not migrated")
      }

      const existing = (await m.execute(
        `SELECT id FROM membership_discount WHERE id = ?`,
        [id]
      )) as Array<{ id: string }>

      if (!existing[0]) {
        throw new Error("membership discount not found")
      }

      await m.execute(
        `UPDATE membership_discount
         SET name = ?, membership_product_id = ?, active = ?, updated_at = NOW()
         WHERE id = ?`,
        [input.name, input.membership_product_id, input.active ?? true, id]
      )

      await m.execute(
        `DELETE FROM membership_discount_rule
         WHERE membership_discount_id = ?`,
        [id]
      )

      const rules = [...(input.rules ?? [])].sort((a, b) => a.order_index - b.order_index)

      for (const rule of rules) {
        const ruleId = randomUUID()
        await m.execute(
          `INSERT INTO membership_discount_rule
           (id, membership_discount_id, name, order_index, discount_type, discount_value, applies_to_json, limit_count, period, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            ruleId,
            id,
            rule.name,
            rule.order_index,
            rule.discount_type,
            rule.discount_value,
            JSON.stringify(rule.applies_to ?? {}),
            rule.limit_count,
            rule.period,
            rule.active ?? true,
          ]
        )
      }

      return this.getDiscountDefinition(id, { manager: m })
    })
  }

  @InjectManager()
  async listDiscountDefinitions(@MedusaContext() ctx?: Context<EntityManager>) {
    if (!ctx?.manager) throw new Error("DB manager not available")

    const discountTableReady = await tableExists(ctx.manager, "membership_discount")
    if (!discountTableReady) {
      return []
    }

    const discounts = (await ctx.manager.execute(
      `SELECT id, name, membership_product_id, active, created_at, updated_at
       FROM membership_discount
       ORDER BY created_at DESC`
    )) as Array<any>

    return Promise.all(discounts.map((d) => this.getDiscountDefinition(d.id, ctx)))
  }

  @InjectManager()
  async getDiscountDefinition(
    id: string,
    @MedusaContext() ctx?: Context<EntityManager>
  ) {
    if (!ctx?.manager) throw new Error("DB manager not available")

    const discountTableReady = await tableExists(ctx.manager, "membership_discount")
    if (!discountTableReady) {
      throw new Error("membership discount tables are not migrated")
    }

    const discountRows = (await ctx.manager.execute(
      `SELECT id, name, membership_product_id, active, created_at, updated_at
       FROM membership_discount
       WHERE id = ?`,
      [id]
    )) as Array<any>

    const discount = discountRows[0]
    if (!discount) throw new Error("membership discount not found")

    const ruleRows = (await ctx.manager.execute(
      `SELECT id, name, order_index, discount_type, discount_value, applies_to_json, limit_count, period, active, created_at, updated_at
       FROM membership_discount_rule
       WHERE membership_discount_id = ?
       ORDER BY order_index ASC`,
      [id]
    )) as Array<any>

    return {
      ...discount,
      rules: ruleRows.map((r) => ({ ...r, applies_to: parseScope(r.applies_to_json) })),
    }
  }

  getPeriodKey(period: RulePeriod, atIsoDate: string): string {
    const d = new Date(atIsoDate)
    if (Number.isNaN(d.getTime())) throw new Error("Invalid at date")

    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, "0")
    const day = String(d.getUTCDate()).padStart(2, "0")

    if (period === "day") return `${y}-${m}-${day}`
    if (period === "week") {
      const tmp = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()))
      const dayOfWeek = tmp.getUTCDay() || 7
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek)
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
      const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
    }
    if (period === "month") return `${y}-${m}`
    if (period === "year") return String(y)
    if (period === "membership") return "membership"
    return "unlimited"
  }

  canUseRule(
    metadata: MembershipDiscountMetadata,
    ruleId: string,
    period: RulePeriod,
    limitCount: number | null,
    atIsoDate: string
  ) {
    if (limitCount === null || period === "unlimited") {
      return { allowed: true, current: 0, period_key: this.getPeriodKey(period, atIsoDate) }
    }

    const period_key = this.getPeriodKey(period, atIsoDate)
    const counters = metadata.membership_discounts ?? {}
    const state = counters[`rule_${ruleId}`]

    const current = state?.period_key === period_key ? state.count_used : 0
    return {
      allowed: current < limitCount,
      current,
      period_key,
    }
  }

  incrementRuleCounter(
    metadata: MembershipDiscountMetadata,
    ruleId: string,
    period: RulePeriod,
    atIsoDate: string,
    step = 1
  ): MembershipDiscountMetadata {
    const period_key = this.getPeriodKey(period, atIsoDate)
    const next = { ...(metadata ?? {}) }
    const counters = { ...(next.membership_discounts ?? {}) }
    const key = `rule_${ruleId}`
    const prev = counters[key]

    const currentCount = prev?.period_key === period_key ? prev.count_used : 0
    const lifetime = prev?.lifetime_used ?? 0

    counters[key] = {
      period_key,
      count_used: currentCount + step,
      lifetime_used: lifetime + step,
    }

    next.membership_discounts = counters
    return next
  }

  decrementRuleCounter(
    metadata: MembershipDiscountMetadata,
    ruleId: string,
    period: RulePeriod,
    atIsoDate: string,
    step = 1
  ): MembershipDiscountMetadata {
    const period_key = this.getPeriodKey(period, atIsoDate)
    const next = { ...(metadata ?? {}) }
    const counters = { ...(next.membership_discounts ?? {}) }
    const key = `rule_${ruleId}`
    const prev = counters[key]

    const currentCount = prev?.period_key === period_key ? prev.count_used : 0
    const lifetime = prev?.lifetime_used ?? 0

    counters[key] = {
      period_key,
      count_used: Math.max(0, currentCount - step),
      lifetime_used: Math.max(0, lifetime - step),
    }

    next.membership_discounts = counters
    return next
  }

  @InjectManager()
  async appendUsageEvent(
    input: {
      customer_id: string
      membership_discount_rule_id: string
      period_key: string
      delta: number
      reason: string
      idempotency_key: string
    },
    @MedusaContext() ctx?: Context<EntityManager>
  ) {
    if (!ctx?.manager) throw new Error("DB manager not available")

    const existing = (await ctx.manager.execute(
      `SELECT id FROM membership_discount_usage_event WHERE idempotency_key = ?`,
      [input.idempotency_key]
    )) as Array<{ id: string }>

    if (existing[0]) return { id: existing[0].id, idempotent: true }

    const id = randomUUID()
    await ctx.manager.execute(
      `INSERT INTO membership_discount_usage_event
       (id, customer_id, membership_discount_rule_id, period_key, delta, reason, idempotency_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        input.customer_id,
        input.membership_discount_rule_id,
        input.period_key,
        input.delta,
        input.reason,
        input.idempotency_key,
      ]
    )

    return { id, idempotent: false }
  }
}
