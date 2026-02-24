import { Migration } from "@mikro-orm/migrations"

export class Migration202602230001_gift_card_defaults extends Migration {
  async up(): Promise<void> {
    // gift_card.created_at default
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

    // gift_card.updated_at default (only if it exists)
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card'
            AND column_name = 'updated_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card ALTER COLUMN updated_at SET DEFAULT NOW()';
        END IF;
      END
      $$;
    `)

    // gift_card_event.created_at default
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card_event'
            AND column_name = 'created_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card_event ALTER COLUMN created_at SET DEFAULT NOW()';
        END IF;
      END
      $$;
    `)

    // gift_card_event.updated_at default (only if it exists)
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card_event'
            AND column_name = 'updated_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card_event ALTER COLUMN updated_at SET DEFAULT NOW()';
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
    // gift_card.created_at drop default
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

    // gift_card.updated_at drop default
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card'
            AND column_name = 'updated_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card ALTER COLUMN updated_at DROP DEFAULT';
        END IF;
      END
      $$;
    `)

    // gift_card_event.created_at drop default
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card_event'
            AND column_name = 'created_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card_event ALTER COLUMN created_at DROP DEFAULT';
        END IF;
      END
      $$;
    `)

    // gift_card_event.updated_at drop default
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'gift_card_event'
            AND column_name = 'updated_at'
        ) THEN
          EXECUTE 'ALTER TABLE gift_card_event ALTER COLUMN updated_at DROP DEFAULT';
        END IF;
      END
      $$;
    `)

    // gift_card_event.occurred_at drop default
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