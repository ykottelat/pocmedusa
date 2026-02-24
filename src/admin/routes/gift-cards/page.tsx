import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CreditCard } from "@medusajs/icons"
import { Badge, Container, Heading, Table } from "@medusajs/ui"
import { useEffect, useState } from "react"

type GiftCardEvent = {
  id: string
  type: "ISSUE" | "REDEEM" | "VOID" | string
  amount: number
  currency: string
  source: string
  reference: string
  idempotency_key: string
  occurred_at?: string
  created_at?: string
}

type GiftCard = {
  id: string
  code: string
  currency: string
  legal_entity_id: string
  status: string
  created_at?: string
  updated_at?: string
  deleted_at?: string

  // computed / enriched by admin endpoint
  balance: number
  events: GiftCardEvent[]
}

const GiftCardsPage = () => {
  const [cards, setCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch("/admin/gift-cards", { credentials: "include" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setCards(data.gift_cards ?? [])
      } catch (e: any) {
        setError(e?.message ?? "Failed to load gift cards")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const formatMoney = (cents: number) => {
    if (!Number.isFinite(cents)) return ""
    return (cents / 100).toFixed(2)
  }

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <Heading level="h1">Gift Cards</Heading>
      </div>

      {loading && <div className="mt-4">Loading…</div>}
      {error && <pre className="mt-4">{error}</pre>}

      {!loading && !error && (
        <Table className="mt-6">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Code</Table.HeaderCell>
              <Table.HeaderCell>Balance</Table.HeaderCell>
              <Table.HeaderCell>Currency</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Legal Entity</Table.HeaderCell>
              <Table.HeaderCell>Created</Table.HeaderCell>
              <Table.HeaderCell>Updated</Table.HeaderCell>
              <Table.HeaderCell>Deleted</Table.HeaderCell>
              <Table.HeaderCell>ID</Table.HeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {cards.map((c) => {
              const isExpanded = expandedId === c.id

              return (
                <>
                  <Table.Row
                    key={c.id}
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    style={{ cursor: "pointer" }}
                    title="Click to toggle event log"
                  >
                    <Table.Cell>{c.code}</Table.Cell>
                    <Table.Cell>
                      <strong>
                        {formatMoney(c.balance)} {c.currency}
                      </strong>
                    </Table.Cell>
                    <Table.Cell>{c.currency}</Table.Cell>
                    <Table.Cell>
                      <Badge color={c.status === "active" ? "green" : "red"}>
                        {c.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{c.legal_entity_id}</Table.Cell>
                    <Table.Cell>{c.created_at ?? ""}</Table.Cell>
                    <Table.Cell>{c.updated_at ?? ""}</Table.Cell>
                    <Table.Cell>{c.deleted_at ?? ""}</Table.Cell>
                    <Table.Cell style={{ fontFamily: "monospace" }}>{c.id}</Table.Cell>
                  </Table.Row>

                  {isExpanded && (
                    <Table.Row key={`${c.id}-events`}>
                      <Table.Cell colSpan={9}>
                        <div className="p-3">
                          <Heading level="h2" className="mb-3">
                            Event log
                          </Heading>

                          {(!c.events || c.events.length === 0) ? (
                            <div>No events found.</div>
                          ) : (
                            <Table>
                              <Table.Header>
                                <Table.Row>
                                  <Table.HeaderCell>Type</Table.HeaderCell>
                                  <Table.HeaderCell>Amount</Table.HeaderCell>
                                  <Table.HeaderCell>Currency</Table.HeaderCell>
                                  <Table.HeaderCell>Source</Table.HeaderCell>
                                  <Table.HeaderCell>Reference</Table.HeaderCell>
                                  <Table.HeaderCell>Idempotency</Table.HeaderCell>
                                  <Table.HeaderCell>Occurred</Table.HeaderCell>
                                  <Table.HeaderCell>Created</Table.HeaderCell>
                                  <Table.HeaderCell>Event ID</Table.HeaderCell>
                                </Table.Row>
                              </Table.Header>

                              <Table.Body>
                                {c.events.map((e) => (
                                  <Table.Row key={e.id}>
                                    <Table.Cell>
                                      <Badge
                                        color={
                                          e.type === "ISSUE"
                                            ? "blue"
                                            : e.type === "REDEEM"
                                            ? "orange"
                                            : "grey"
                                        }
                                      >
                                        {e.type}
                                      </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                      {formatMoney(e.amount)} {e.currency}
                                    </Table.Cell>
                                    <Table.Cell>{e.currency}</Table.Cell>
                                    <Table.Cell>{e.source}</Table.Cell>
                                    <Table.Cell>{e.reference}</Table.Cell>
                                    <Table.Cell style={{ fontFamily: "monospace" }}>
                                      {e.idempotency_key}
                                    </Table.Cell>
                                    <Table.Cell>{e.occurred_at ?? ""}</Table.Cell>
                                    <Table.Cell>{e.created_at ?? ""}</Table.Cell>
                                    <Table.Cell style={{ fontFamily: "monospace" }}>{e.id}</Table.Cell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              )
            })}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Gift Cards",
  icon: CreditCard,
})

export default GiftCardsPage