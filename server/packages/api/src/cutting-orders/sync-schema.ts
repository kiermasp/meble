import "reflect-metadata";
import { DataSource } from "typeorm";
import { EdgebandRow } from "../edgebands/edgeband.row";
import { LOOKUP_ENTITIES } from "../lookups/lookup.rows";
import { MaterialCollectionStatusRow, MaterialRow } from "../materials/material.row";
import { CUTTING_ORDER_ENTITIES } from "./cutting-order.rows";

/**
 * Applies the cutting-order tables with TypeORM synchronize.
 * This process does not start the catalog client and does not call the shop.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? "postgres://meble:meble@127.0.0.1:5432/meble";
  const dataSource = new DataSource({
    type: "postgres",
    url,
    entities: [...LOOKUP_ENTITIES, MaterialRow, MaterialCollectionStatusRow, EdgebandRow, ...CUTTING_ORDER_ENTITIES],
    synchronize: true,
    dropSchema: false,
  });
  await dataSource.initialize();
  const tables: { table_name: string }[] = await dataSource.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('cutting_orders', 'cutting_pieces', 'piece_edges', 'piece_holes')
     ORDER BY table_name`,
  );
  const foreignKeys: { table_name: string; definition: string }[] = await dataSource.query(
    `SELECT conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE contype = 'f'
       AND conrelid::regclass::text IN ('cutting_orders', 'cutting_pieces', 'piece_edges', 'piece_holes')
     ORDER BY 1, 2`,
  );
  console.log(
    JSON.stringify({
      synchronized: true,
      tables: tables.map((row) => row.table_name),
      foreignKeys,
    }),
  );
  await dataSource.destroy();
}

void main();
