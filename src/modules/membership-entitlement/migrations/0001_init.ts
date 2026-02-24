import { Migration } from "@mikro-orm/migrations"

export class Migration202602240001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "membership_entitlement_state" (
        "id" uuid primary key,
        "membership_id" varchar not null,
        "rule_id" varchar not null,
        "slot_key" varchar not null,
        "ticket_id" varchar not null,
        "period_key" varchar not null,
        "status" varchar not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      );
      create unique index if not exists "membership_entitlement_state_slot_unique"
        on "membership_entitlement_state" ("membership_id", "rule_id", "slot_key");
      create index if not exists "membership_entitlement_state_period_idx"
        on "membership_entitlement_state" ("period_key");
    `)

    this.addSql(`
      create table if not exists "membership_entitlement_event" (
        "id" uuid primary key,
        "membership_id" varchar not null,
        "rule_id" varchar not null,
        "slot_key" varchar not null,
        "ticket_id" varchar not null,
        "period_key" varchar not null,
        "type" varchar not null,
        "idempotency_key" varchar not null unique,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      );
      create index if not exists "membership_entitlement_event_lookup_idx"
        on "membership_entitlement_event" ("membership_id", "rule_id", "slot_key");
      create index if not exists "membership_entitlement_event_period_idx"
        on "membership_entitlement_event" ("period_key");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "membership_entitlement_event";`)
    this.addSql(`drop table if exists "membership_entitlement_state";`)
  }
}
