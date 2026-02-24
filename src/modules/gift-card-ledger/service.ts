import {
  MedusaService,
  InjectManager,
  MedusaContext,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import type { EntityManager } from "@medusajs/framework/mikro-orm/knex"
import { randomBytes } from "crypto"

import { GiftCard } from "./models/gift-card"
import { GiftCardEvent } from "./models/gift-card-event"

type IssueInput = {
  amount: number // cents
  currency: string
  legal_entity_id: string
  reference: string
  idempotency_key: string
  source?: "MEDUSA" | "ADMIN"
}

type RedeemInput = {
  code: string
  amount: number // cents, positive
  currency: string
  reference: string
  idempotency_key: string
  source: "MEDUSA" | "LIGHTSPEED"
}

function assertPositiveInt(n: number, name: string) {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer (cents)`)
  }
}

function normalizeCurrency(c: string) {
  return c.trim().toUpperCase()
}

function generateCode() {
  return `GC-${randomBytes(16).toString("hex").toUpperCase()}`
}

function cryptoRandomId(): string {
  // Node 18+/20+
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { randomUUID } = require("crypto")
  return randomUUID()
}

/**
 * Gift Card Ledger Service
 * - Append-only events
 * - Atomic redeem via SELECT ... FOR UPDATE
 * - Idempotent issue/redeem via idempotency_key (unique)
 *
 * NOTE on timestamps:
 * Your DB schema appears to have:
 * - gift_card.created_at NOT NULL
 * - gift_card_event.occurred_at NOT NULL
 * This service sets those explicitly in INSERTs to avoid "null value" errors.
 */
export default class GiftCardLedgerService extends MedusaService({
  GiftCard,
  GiftCardEvent,
}) {
  /**
   * Create a new gift card + ISSUE event (idempotent).
   */
  @InjectManager()
  async issue(
    input: IssueInput,
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<{ code: string; balance: number; event_id: string }> {
    if (!ctx?.manager) throw new Error("DB manager not available")
    assertPositiveInt(input.amount, "amount")

    const currency = normalizeCurrency(input.currency)

    return await ctx.manager.transactional(async (m) => {
      // Idempotency: if we've seen this key, return the same result
      const existing = (await m.execute(
        `SELECT e.id as event_id, c.code as code, c.id as gift_card_id
         FROM gift_card_event e
         JOIN gift_card c ON c.id = e.gift_card_id
         WHERE e.idempotency_key = ?`,
        [input.idempotency_key]
      )) as Array<{ event_id: string; code: string; gift_card_id: string }>

      if (existing?.[0]) {
        const bal = await this.getBalanceByGiftCardId(existing[0].gift_card_id, { manager: m })
        return { code: existing[0].code, balance: bal, event_id: existing[0].event_id }
      }

      const cardId = cryptoRandomId()
      const code = generateCode()

      // gift_card.created_at is NOT NULL in your schema -> set it
      await m.execute(
        `INSERT INTO gift_card (id, code, currency, legal_entity_id, status, created_at)
         VALUES (?, ?, ?, ?, 'active', NOW())`,
        [cardId, code, currency, input.legal_entity_id]
      )

      const eventId = cryptoRandomId()

      // gift_card_event.occurred_at is NOT NULL in your schema -> set it
      await m.execute(
        `INSERT INTO gift_card_event
          (id, gift_card_id, type, amount, currency, source, reference, idempotency_key, occurred_at)
         VALUES (?, ?, 'ISSUE', ?, ?, ?, ?, ?, NOW())`,
        [
          eventId,
          cardId,
          input.amount,
          currency,
          input.source ?? "MEDUSA",
          input.reference,
          input.idempotency_key,
        ]
      )

      return { code, balance: input.amount, event_id: eventId }
    })
  }

  /**
   * Get card metadata + computed balance by code.
   */
  @InjectManager()
  async getByCode(
    code: string,
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<{
    card: {
      id: string
      code: string
      currency: string
      legal_entity_id: string
      status: string
      created_at?: string
    }
    balance: number
  }> {
    if (!ctx?.manager) throw new Error("DB manager not available")

    const rows = (await ctx.manager.execute(
      `SELECT id, code, currency, legal_entity_id, status, created_at
       FROM gift_card
       WHERE code = ?`,
      [code]
    )) as Array<{
      id: string
      code: string
      currency: string
      legal_entity_id: string
      status: string
      created_at?: string
    }>

    const card = rows?.[0]
    if (!card) throw new Error("gift card not found")

    const balance = await this.getBalanceByGiftCardId(card.id, ctx)
    return { card, balance }
  }

  /**
   * Redeem value (idempotent, atomic).
   * Returns approved amount (<= requested) and remaining balance.
   */
  @InjectManager()
  async redeem(
    input: RedeemInput,
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<{ approved_amount: number; remaining_balance: number; event_id: string | null }> {
    if (!ctx?.manager) throw new Error("DB manager not available")
    assertPositiveInt(input.amount, "amount")

    const currency = normalizeCurrency(input.currency)

    return await ctx.manager.transactional(async (m) => {
      // Idempotency first
      const existing = (await m.execute(
        `SELECT e.id as event_id, e.amount as signed_amount, c.id as gift_card_id
         FROM gift_card_event e
         JOIN gift_card c ON c.id = e.gift_card_id
         WHERE e.idempotency_key = ?`,
        [input.idempotency_key]
      )) as Array<{ event_id: string; signed_amount: number; gift_card_id: string }>

      if (existing?.[0]) {
        const bal = await this.getBalanceByGiftCardId(existing[0].gift_card_id, { manager: m })
        return {
          approved_amount: Math.abs(existing[0].signed_amount),
          remaining_balance: bal,
          event_id: existing[0].event_id,
        }
      }

      // Lock the card row to prevent concurrent redemption (double-spend)
      const cardRows = (await m.execute(
        `SELECT id, currency, status
         FROM gift_card
         WHERE code = ?
         FOR UPDATE`,
        [input.code]
      )) as Array<{ id: string; currency: string; status: string }>

      const card = cardRows?.[0]
      if (!card) throw new Error("gift card not found")
      if (card.status !== "active") throw new Error("gift card disabled")
      if (normalizeCurrency(card.currency) !== currency) throw new Error("currency mismatch")

      const balance = await this.getBalanceByGiftCardId(card.id, { manager: m })
      const approved = Math.min(balance, input.amount)

      if (approved <= 0) {
        return { approved_amount: 0, remaining_balance: balance, event_id: null }
      }

      const eventId = cryptoRandomId()

      await m.execute(
        `INSERT INTO gift_card_event
          (id, gift_card_id, type, amount, currency, source, reference, idempotency_key, occurred_at)
         VALUES (?, ?, 'REDEEM', ?, ?, ?, ?, ?, NOW())`,
        [
          eventId,
          card.id,
          -approved,
          currency,
          input.source,
          input.reference,
          input.idempotency_key,
        ]
      )

      return {
        approved_amount: approved,
        remaining_balance: balance - approved,
        event_id: eventId,
      }
    })
  }

  /**
   * List all events for a gift card.
   * Orders by occurred_at if present; otherwise created_at.
   */
  @InjectManager()
  async listEvents(
    code: string,
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<
    Array<{
      id: string
      type: string
      amount: number
      currency: string
      source: string
      reference: string
      idempotency_key: string
      occurred_at?: string
      created_at?: string
    }>
  > {
    if (!ctx?.manager) throw new Error("DB manager not available")

    const card = (await ctx.manager.execute(
      `SELECT id FROM gift_card WHERE code = ?`,
      [code]
    )) as Array<{ id: string }>

    if (!card?.[0]) throw new Error("gift card not found")

    // occurred_at is in your schema (based on error), so we use it.
    return (await ctx.manager.execute(
      `SELECT id, type, amount, currency, source, reference, idempotency_key, occurred_at
       FROM gift_card_event
       WHERE gift_card_id = ?
       ORDER BY occurred_at DESC`,
      [card[0].id]
    )) as any
  }

  /**
   * List all gift cards (for UI/admin listing).
   * WARNING: returns codes. Do not expose in public store API in production.
   */
  @InjectManager()
  async listAll(
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<
    Array<{
      id: string
      code: string
      currency: string
      legal_entity_id: string
      status: string
      created_at?: string
    }>
  > {
    if (!ctx?.manager) throw new Error("DB manager not available")

    return (await ctx.manager.execute(
      `SELECT id, code, currency, legal_entity_id, status, created_at
       FROM gift_card
       ORDER BY created_at DESC`
    )) as any
  }

  /**
   * Disable a gift card (optional admin feature).
   */
  @InjectManager()
  async disable(
    code: string,
    @MedusaContext() ctx?: Context<EntityManager>
  ): Promise<{ code: string; status: "disabled" }> {
    if (!ctx?.manager) throw new Error("DB manager not available")

    await ctx.manager.execute(
      `UPDATE gift_card SET status = 'disabled' WHERE code = ?`,
      [code]
    )

    return { code, status: "disabled" }
  }

  // ---- internal ----

  private async getBalanceByGiftCardId(
    giftCardId: string,
    ctx: { manager?: EntityManager }
  ): Promise<number> {
    const manager = ctx.manager
    if (!manager) throw new Error("DB manager not available")

    const rows = (await manager.execute(
      `SELECT COALESCE(SUM(amount), 0) AS balance
       FROM gift_card_event
       WHERE gift_card_id = ?`,
      [giftCardId]
    )) as Array<{ balance: string | number }>

    return Number(rows?.[0]?.balance ?? 0)
  }
}