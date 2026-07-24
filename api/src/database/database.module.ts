import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { moneyFromPgNumeric } from '@shopsense/shared';
import { Pool, types } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

// Postgres OID for NUMERIC. pg leaves this as a string by default (it never
// silently narrows to float), but every NUMERIC column in this schema is
// money, so parsing it straight to our branded Money type here means no
// repository ever has to remember to call moneyFromPgNumeric itself.
const NUMERIC_OID = 1700;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          types: {
            getTypeParser: (oid, format) =>
              oid === NUMERIC_OID ? moneyFromPgNumeric : types.getTypeParser(oid, format),
          },
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
