import { Migration } from "@mikro-orm/migrations"

export class Migration202602240101 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "membership_discount" (
        "id" uuid primary key,
        "name" varchar not null,
        "membership_product_id" varchar not null,
        "active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      );
    `)

    this.addSql(`
      create table if not exists "membership_discount_rule" (
        "id" uuid primary key,
        "membership_discount_id" uuid not null references "membership_discount"("id") on delete cascade,
        "name" varchar not null,
        "order_index" integer not null,
        "discount_type" varchar not null,
        "discount_value" integer not null,
        "applies_to_json" text not null,
        "limit_count" integer null,
        "period" varchar not null,
        "active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      );
      create index if not exists "membership_discount_rule_discount_idx"
        on "membership_discount_rule" ("membership_discount_id", "order_index");
    `)

    this.addSql(`
      create table if not exists "membership_discount_usage_event" (
        "id" uuid primary key,
        "customer_id" varchar not null,
        "membership_discount_rule_id" uuid not null references "membership_discount_rule"("id") on delete cascade,
        "period_key" varchar not null,
        "delta" integer not null,
        "reason" varchar not null,
        "idempotency_key" varchar not null unique,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      );
      create index if not exists "membership_discount_usage_event_lookup_idx"
        on "membership_discount_usage_event" ("customer_id", "membership_discount_rule_id", "period_key");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "membership_discount_usage_event";`)
    this.addSql(`drop table if exists "membership_discount_rule";`)
    this.addSql(`drop table if exists "membership_discount";`)
  }
}
