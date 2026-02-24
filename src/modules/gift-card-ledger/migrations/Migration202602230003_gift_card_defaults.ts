import { Migration } from "@mikro-orm/migrations"

export class Migration202602230002_gift_card_timestamp_defaults extends Migration {
  async up(): Promise<void> {
    // gift_card.created_at default (only if it exists)
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card'
            AND column_name = 'created_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card ALTER COLUMN created_at SET DEFAULT NOW()';
        END IF;
      END
      $$;
    `)

    // gift_card_event.occurred_at default (only if it exists)
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card_event'
            AND column_name = 'occurred_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card_event ALTER COLUMN occurred_at SET DEFAULT NOW()';
        END IF;
      END
      $$;
    `)
  }

  async down(): Promise<void> {
    // gift_card.created_at drop default (only if it exists)
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card'
            AND column_name = 'created_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card ALTER COLUMN created_at DROP DEFAULT';
        END IF;
      END
      $$;
    `)

    // gift_card_event.occurred_at drop default (only if it exists)
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card_event'
            AND column_name = 'occurred_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card_event ALTER COLUMN occurred_at DROP DEFAULT';
        END IF;
      END
      $$;
    `)
  }
}