import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import { randomUUID } from "crypto"
import type { Context } from "@medusajs/framework/types"
import type { EntityManager } from "@medusajs/framework/mikro-orm/knex"

import { MembershipEntitlementEvent } from "./models/membership-entitlement-event"
import { MembershipEntitlementState } from "./models/membership-entitlement-state"

type ConsumeInput = {
  membership_id: string
  rule_id: string
  slot_key: string
  ticket_id: string
  booking_day: string
  idempotency_key: string
}

type ReleaseInput = {
  membership_id: string
  rule_id: string
  slot_key: string
  ticket_id: string
  idempotency_key: string
}

function toPeriodKey(bookingDay: string) {
  return bookingDay.slice(0, 7)
}

function validateRequired(value: string, field: string) {
  if (!value || !value.trim()) {
    throw new Error(`${field} is required`)
  }
}

export default class MembershipEntitlementService extends MedusaService({
  MembershipEntitlementState,
  MembershipEntitlementEvent,
}) {
  @InjectManager()
  async consume(
    input: ConsumeInput,
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<{
    consumed: boolean
    slot_key: string
    ticket_id: string
    period_key: string
    event_id: string | null
    reason?: string
  }> {
    if (!ctx?.manager) throw new Error("DB manager not available")

    validateRequired(input.membership_id, "membership_id")
    validateRequired(input.rule_id, "rule_id")
    validateRequired(input.slot_key, "slot_key")
    validateRequired(input.ticket_id, "ticket_id")
    validateRequired(input.booking_day, "booking_day")
    validateRequired(input.idempotency_key, "idempotency_key")

    const period_key = toPeriodKey(input.booking_day)

    return ctx.manager.transactional(async (m) => {
      const existingEvent = (await m.execute(
        `SELECT id, type, slot_key, ticket_id, period_key
         FROM membership_entitlement_event
         WHERE idempotency_key = ?`,
        [input.idempotency_key]
      )) as Array<{
        id: string
        type: "CONSUME" | "RELEASE"
        slot_key: string
        ticket_id: string
        period_key: string
      }>

      if (existingEvent?.[0]) {
        return {
          consumed: existingEvent[0].type === "CONSUME",
          slot_key: existingEvent[0].slot_key,
          ticket_id: existingEvent[0].ticket_id,
          period_key: existingEvent[0].period_key,
          event_id: existingEvent[0].id,
        }
      }

      const rows = (await m.execute(
        `INSERT INTO membership_entitlement_state
          (id, membership_id, rule_id, slot_key, ticket_id, period_key, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'CONSUMED', NOW(), NOW())
         ON CONFLICT (membership_id, rule_id, slot_key)
         DO UPDATE SET
           ticket_id = EXCLUDED.ticket_id,
           period_key = EXCLUDED.period_key,
           status = 'CONSUMED',
           updated_at = NOW()
         WHERE membership_entitlement_state.status = 'RELEASED'
         RETURNING id, slot_key, ticket_id, period_key, status`,
        [randomUUID(), input.membership_id, input.rule_id, input.slot_key, input.ticket_id, period_key]
      )) as Array<{
        id: string
        slot_key: string
        ticket_id: string
        period_key: string
        status: "CONSUMED" | "RELEASED"
      }>

      if (!rows?.[0]) {
        const existingState = (await m.execute(
          `SELECT slot_key, ticket_id, period_key, status
           FROM membership_entitlement_state
           WHERE membership_id = ? AND rule_id = ? AND slot_key = ?
           FOR UPDATE`,
          [input.membership_id, input.rule_id, input.slot_key]
        )) as Array<{
          slot_key: string
          ticket_id: string
          period_key: string
          status: "CONSUMED" | "RELEASED"
        }>

        const owner = existingState?.[0]
        return {
          consumed: owner?.status === "CONSUMED" && owner.ticket_id === input.ticket_id,
          slot_key: input.slot_key,
          ticket_id: owner?.ticket_id ?? input.ticket_id,
          period_key: owner?.period_key ?? period_key,
          event_id: null,
          reason: owner?.status === "CONSUMED" ? "slot_already_consumed" : "state_not_updated",
        }
      }

      const ev = (await m.execute(
        `INSERT INTO membership_entitlement_event
          (id, membership_id, rule_id, slot_key, ticket_id, period_key, type, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'CONSUME', ?, NOW(), NOW())
         RETURNING id`,
        [
          randomUUID(),
          input.membership_id,
          input.rule_id,
          input.slot_key,
          input.ticket_id,
          period_key,
          input.idempotency_key,
        ]
      )) as Array<{ id: string }>

      return {
        consumed: true,
        slot_key: input.slot_key,
        ticket_id: input.ticket_id,
        period_key,
        event_id: ev[0].id,
      }
    })
  }

  @InjectManager()
  async release(
    input: ReleaseInput,
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<{
    released: boolean
    slot_key: string
    ticket_id: string
    period_key: string | null
    event_id: string | null
    reason?: string
  }> {
    if (!ctx?.manager) throw new Error("DB manager not available")

    validateRequired(input.membership_id, "membership_id")
    validateRequired(input.rule_id, "rule_id")
    validateRequired(input.slot_key, "slot_key")
    validateRequired(input.ticket_id, "ticket_id")
    validateRequired(input.idempotency_key, "idempotency_key")

    return ctx.manager.transactional(async (m) => {
      const existingEvent = (await m.execute(
        `SELECT id, type, slot_key, ticket_id, period_key
         FROM membership_entitlement_event
         WHERE idempotency_key = ?`,
        [input.idempotency_key]
      )) as Array<{
        id: string
        type: "CONSUME" | "RELEASE"
        slot_key: string
        ticket_id: string
        period_key: string
      }>

      if (existingEvent?.[0]) {
        return {
          released: existingEvent[0].type === "RELEASE",
          slot_key: existingEvent[0].slot_key,
          ticket_id: existingEvent[0].ticket_id,
          period_key: existingEvent[0].period_key,
          event_id: existingEvent[0].id,
        }
      }

      const state = (await m.execute(
        `SELECT id, ticket_id, period_key, status
         FROM membership_entitlement_state
         WHERE membership_id = ? AND rule_id = ? AND slot_key = ?
         FOR UPDATE`,
        [input.membership_id, input.rule_id, input.slot_key]
      )) as Array<{
        id: string
        ticket_id: string
        period_key: string
        status: "CONSUMED" | "RELEASED"
      }>

      const owner = state?.[0]

      if (!owner || owner.status !== "CONSUMED") {
        return {
          released: false,
          slot_key: input.slot_key,
          ticket_id: input.ticket_id,
          period_key: owner?.period_key ?? null,
          event_id: null,
          reason: "not_consumed",
        }
      }

      if (owner.ticket_id !== input.ticket_id) {
        return {
          released: false,
          slot_key: input.slot_key,
          ticket_id: owner.ticket_id,
          period_key: owner.period_key,
          event_id: null,
          reason: "not_owner",
        }
      }

      await m.execute(
        `UPDATE membership_entitlement_state
         SET status = 'RELEASED', updated_at = NOW()
         WHERE id = ?`,
        [owner.id]
      )

      const ev = (await m.execute(
        `INSERT INTO membership_entitlement_event
          (id, membership_id, rule_id, slot_key, ticket_id, period_key, type, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'RELEASE', ?, NOW(), NOW())
         RETURNING id`,
        [
          randomUUID(),
          input.membership_id,
          input.rule_id,
          input.slot_key,
          input.ticket_id,
          owner.period_key,
          input.idempotency_key,
        ]
      )) as Array<{ id: string }>

      return {
        released: true,
        slot_key: input.slot_key,
        ticket_id: input.ticket_id,
        period_key: owner.period_key,
        event_id: ev[0].id,
      }
    })
  }

  @InjectManager()
  async listStates(
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<
    Array<{
      membership_id: string
      rule_id: string
      slot_key: string
      ticket_id: string
      period_key: string
      status: "CONSUMED" | "RELEASED"
      updated_at?: string
    }>
  > {
    if (!ctx?.manager) throw new Error("DB manager not available")

    return (await ctx.manager.execute(
      `SELECT membership_id, rule_id, slot_key, ticket_id, period_key, status, updated_at
       FROM membership_entitlement_state
       ORDER BY updated_at DESC`
    )) as any
  }

  @InjectManager()
  async listEvents(
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<
    Array<{
      id: string
      membership_id: string
      rule_id: string
      slot_key: string
      ticket_id: string
      period_key: string
      type: "CONSUME" | "RELEASE"
      idempotency_key: string
      created_at?: string
    }>
  > {
    if (!ctx?.manager) throw new Error("DB manager not available")

    return (await ctx.manager.execute(
      `SELECT id, membership_id, rule_id, slot_key, ticket_id, period_key, type, idempotency_key, created_at
       FROM membership_entitlement_event
       ORDER BY created_at DESC`
    )) as any
  }
}
