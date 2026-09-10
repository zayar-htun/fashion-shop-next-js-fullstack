#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/ef4b89442dba51ccd4888f02b8247d31246ef228e84ffeb9f87689e82848c5ef/contract';
import startContract from '../../snapshots/ef4b89442dba51ccd4888f02b8247d31246ef228e84ffeb9f87689e82848c5ef/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f3aa654b33ac02ca8076397086f6121dd5f85b07576ad12c247ad326ba03e462/contract';
import endContract from '../../snapshots/f3aa654b33ac02ca8076397086f6121dd5f85b07576ad12c247ad326ba03e462/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('sku', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
