import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { moneyFromPgNumeric } from '@shopsense/shared';
import { Pool, types } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

// Postgres OID for NUMERIC. pg leaves this as a string by default (it never
// silently narrows to float), but every NUMERIC column in this schema is
// money, so parsing it straight to our branded Money type here means no
// repository ever has to remember to call moneyFromPgNumeric itself.
const NUMERIC_OID = 1700;

// Postgres OID for DATE. pg's default parser converts this to a JS Date at
// UTC midnight, which then serializes as "2026-07-24T00:00:00.000Z" instead
// of the plain "2026-07-24" every date-typed column (business_date) is sent
// and compared as. Left as the raw wire string instead — Postgres already
// sends date columns as plain YYYY-MM-DD text, so no parsing is needed at all.
const DATE_OID = 1082;

/** Shared by the real DatabaseModule and by e2e tests constructing their own
 * Pool against a throwaway Postgres — both must apply the exact same NUMERIC
 * and DATE parsing, or a test could pass against behavior production doesn't have. */
export function shopSenseTypeParsers() {
  return {
    getTypeParser: (oid: number, format?: unknown) => {
      if (oid === NUMERIC_OID) return moneyFromPgNumeric;
      if (oid === DATE_OID) return (value: string) => value;
      return types.getTypeParser(oid, format as never);
    },
  };
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          types: shopSenseTypeParsers(),
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
