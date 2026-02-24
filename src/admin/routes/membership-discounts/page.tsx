import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Container, Heading, Table } from "@medusajs/ui"
import { Users } from "@medusajs/icons"
import { useEffect, useState } from "react"

type Rule = {
  id: string
  name: string
  order_index: number
  discount_type: "percentage" | "fixed"
  discount_value: number
  applies_to?: {
    product_ids?: string[]
    variant_ids?: string[]
    collection_ids?: string[]
  }
  limit_count: number | null
  period: "day" | "week" | "month" | "year" | "membership" | "unlimited"
  active: boolean
}

type DiscountDefinition = {
  id: string
  name: string
  membership_product_id: string
  active: boolean
  rules: Rule[]
}

const MembershipDiscountsPage = () => {
  const [rows, setRows] = useState<DiscountDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/admin/membership-discounts", { credentials: "include" })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        setRows(data.membership_discounts ?? [])
      } catch (e: any) {
        setError(e?.message ?? "Failed to load membership discount rules")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <Container className="p-6">
      <Heading level="h1">Membership Discount Rules</Heading>

      {loading && <div className="mt-4">Loading…</div>}
      {error && <pre className="mt-4">{error}</pre>}

      {!loading && !error && (
        <Table className="mt-6">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Membership Product</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Rule Count</Table.HeaderCell>
              <Table.HeaderCell>ID</Table.HeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {rows.map((d) => {
              const isExpanded = expandedId === d.id

              return (
                <>
                  <Table.Row
                    key={d.id}
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    style={{ cursor: "pointer" }}
                    title="Click to show ordered rules"
                  >
                    <Table.Cell>{d.name}</Table.Cell>
                    <Table.Cell>{d.membership_product_id}</Table.Cell>
                    <Table.Cell>
                      <Badge color={d.active ? "green" : "grey"}>{d.active ? "active" : "inactive"}</Badge>
                    </Table.Cell>
                    <Table.Cell>{d.rules?.length ?? 0}</Table.Cell>
                    <Table.Cell style={{ fontFamily: "monospace" }}>{d.id}</Table.Cell>
                  </Table.Row>

                  {isExpanded && (
                    <Table.Row key={`${d.id}-rules`}>
                      <Table.Cell colSpan={5}>
                        <div className="p-3">
                          <Heading level="h2" className="mb-3">Ordered Rules</Heading>

                          {(!d.rules || d.rules.length === 0) ? (
                            <div>No rules configured.</div>
                          ) : (
                            <Table>
                              <Table.Header>
                                <Table.Row>
                                  <Table.HeaderCell>Order</Table.HeaderCell>
                                  <Table.HeaderCell>Name</Table.HeaderCell>
                                  <Table.HeaderCell>Type</Table.HeaderCell>
                                  <Table.HeaderCell>Value</Table.HeaderCell>
                                  <Table.HeaderCell>Limit</Table.HeaderCell>
                                  <Table.HeaderCell>Period</Table.HeaderCell>
                                  <Table.HeaderCell>Applies To</Table.HeaderCell>
                                  <Table.HeaderCell>Status</Table.HeaderCell>
                                </Table.Row>
                              </Table.Header>

                              <Table.Body>
                                {d.rules.map((r) => (
                                  <Table.Row key={r.id}>
                                    <Table.Cell>{r.order_index}</Table.Cell>
                                    <Table.Cell>{r.name}</Table.Cell>
                                    <Table.Cell>{r.discount_type}</Table.Cell>
                                    <Table.Cell>{r.discount_value}</Table.Cell>
                                    <Table.Cell>{r.limit_count ?? "Unlimited"}</Table.Cell>
                                    <Table.Cell>{r.period}</Table.Cell>
                                    <Table.Cell>
                                      {[
                                        ...(r.applies_to?.product_ids?.map((x) => `product:${x}`) ?? []),
                                        ...(r.applies_to?.variant_ids?.map((x) => `variant:${x}`) ?? []),
                                        ...(r.applies_to?.collection_ids?.map((x) => `collection:${x}`) ?? []),
                                      ].join(", ") || "-"}
                                    </Table.Cell>
                                    <Table.Cell>
                                      <Badge color={r.active ? "green" : "grey"}>{r.active ? "active" : "inactive"}</Badge>
                                    </Table.Cell>
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
  label: "Membership Discounts",
  icon: Users,
})

export default MembershipDiscountsPage
