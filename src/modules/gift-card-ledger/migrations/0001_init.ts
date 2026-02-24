import { Migration } from "@mikro-orm/migrations"

export class Migration202602230001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "gift_card" (
        "id" uuid primary key,
        "code" varchar not null unique,
        "currency" varchar not null,
        "legal_entity_id" varchar not null,
        "status" varchar not null,
        "created_at" timestamptz not null
      );
    `)

    this.addSql(`
      create table if not exists "gift_card_event" (
        "id" uuid primary key,
        "gift_card_id" uuid not null references "gift_card" ("id") on delete cascade,
        "type" varchar not null,
        "amount" integer not null,
        "currency" varchar not null,
        "source" varchar not null,
        "reference" varchar not null,
        "idempotency_key" varchar not null unique,
        "occurred_at" timestamptz not null
      );
      create index if not exists "gift_card_event_gift_card_id_idx" on "gift_card_event" ("gift_card_id");
      create index if not exists "gift_card_event_idempotency_idx" on "gift_card_event" ("idempotency_key");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "gift_card_event";`)
    this.addSql(`drop table if exists "gift_card";`)
  }
}