import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Users } from "@medusajs/icons"
import { Badge, Container, Heading, Table } from "@medusajs/ui"
import { useEffect, useState } from "react"

type StateRow = {
  membership_id: string
  rule_id: string
  slot_key: string
  ticket_id: string
  period_key: string
  status: "CONSUMED" | "RELEASED"
  updated_at?: string
}

type EventRow = {
  id: string
  membership_id: string
  rule_id: string
  slot_key: string
  ticket_id: string
  period_key: string
  type: "CONSUME" | "RELEASE"
  idempotency_key: string
  created_at?: string
}

const MembershipEntitlementsPage = () => {
  const [states, setStates] = useState<StateRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/admin/membership-entitlements", { credentials: "include" })
        const data = await res.json()
        setStates(data.states ?? [])
        setEvents(data.events ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <Container className="p-6 space-y-6">
      <Heading level="h1">Membership Entitlements</Heading>
      {loading && <div>Loading…</div>}

      {!loading && (
        <>
          <div>
            <Heading level="h2" className="mb-2">Current State</Heading>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Membership</Table.HeaderCell>
                  <Table.HeaderCell>Rule</Table.HeaderCell>
                  <Table.HeaderCell>Slot Key</Table.HeaderCell>
                  <Table.HeaderCell>Ticket</Table.HeaderCell>
                  <Table.HeaderCell>Period</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Updated</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {states.map((s) => (
                  <Table.Row key={`${s.membership_id}-${s.rule_id}-${s.slot_key}`}>
                    <Table.Cell>{s.membership_id}</Table.Cell>
                    <Table.Cell>{s.rule_id}</Table.Cell>
                    <Table.Cell>{s.slot_key}</Table.Cell>
                    <Table.Cell>{s.ticket_id}</Table.Cell>
                    <Table.Cell>{s.period_key}</Table.Cell>
                    <Table.Cell>
                      <Badge color={s.status === "CONSUMED" ? "green" : "grey"}>{s.status}</Badge>
                    </Table.Cell>
                    <Table.Cell>{s.updated_at ?? ""}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>

          <div>
            <Heading level="h2" className="mb-2">Ledger Events</Heading>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Type</Table.HeaderCell>
                  <Table.HeaderCell>Membership</Table.HeaderCell>
                  <Table.HeaderCell>Rule</Table.HeaderCell>
                  <Table.HeaderCell>Slot Key</Table.HeaderCell>
                  <Table.HeaderCell>Ticket</Table.HeaderCell>
                  <Table.HeaderCell>Period</Table.HeaderCell>
                  <Table.HeaderCell>Idempotency</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {events.map((e) => (
                  <Table.Row key={e.id}>
                    <Table.Cell>
                      <Badge color={e.type === "CONSUME" ? "blue" : "orange"}>{e.type}</Badge>
                    </Table.Cell>
                    <Table.Cell>{e.membership_id}</Table.Cell>
                    <Table.Cell>{e.rule_id}</Table.Cell>
                    <Table.Cell>{e.slot_key}</Table.Cell>
                    <Table.Cell>{e.ticket_id}</Table.Cell>
                    <Table.Cell>{e.period_key}</Table.Cell>
                    <Table.Cell>{e.idempotency_key}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Membership Entitlements",
  icon: Users,
})

export default MembershipEntitlementsPage
