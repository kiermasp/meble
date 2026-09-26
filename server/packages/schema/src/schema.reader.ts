import type { Pool, PoolClient } from "pg";
import {
  assembleSchemaGraph,
  type ColumnRow,
  type ForeignKeyRow,
  type PrimaryKeyRow,
  type SchemaGraph,
  type TableRow,
} from "./schema.graph";

export const TABLES_SQL = `
  SELECT table_schema AS schema_name, table_name
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema <> 'pg_catalog'
    AND table_schema <> 'information_schema'
    AND table_schema NOT LIKE 'pg_toast%'
    AND table_schema NOT LIKE 'pg_temp%'
  ORDER BY table_schema, table_name
`;

export const COLUMNS_SQL = `
  SELECT
    columns.table_schema AS schema_name,
    columns.table_name,
    columns.column_name,
    columns.ordinal_position,
    columns.is_nullable,
    pg_catalog.format_type(attributes.atttypid, attributes.atttypmod) AS data_type
  FROM information_schema.columns AS columns
  JOIN pg_catalog.pg_namespace AS namespaces
    ON namespaces.nspname = columns.table_schema
  JOIN pg_catalog.pg_class AS tables
    ON tables.relnamespace = namespaces.oid
   AND tables.relname = columns.table_name
   AND tables.relkind IN ('r', 'p')
  JOIN pg_catalog.pg_attribute AS attributes
    ON attributes.attrelid = tables.oid
   AND attributes.attname = columns.column_name
   AND attributes.attnum > 0
   AND NOT attributes.attisdropped
  WHERE columns.table_schema <> 'pg_catalog'
    AND columns.table_schema <> 'information_schema'
    AND columns.table_schema NOT LIKE 'pg_toast%'
    AND columns.table_schema NOT LIKE 'pg_temp%'
  ORDER BY columns.table_schema, columns.table_name, columns.ordinal_position
`;

export const PRIMARY_KEYS_SQL = `
  SELECT
    key_columns.table_schema AS schema_name,
    key_columns.table_name,
    key_columns.column_name,
    key_columns.ordinal_position
  FROM information_schema.table_constraints AS constraints
  JOIN information_schema.key_column_usage AS key_columns
    ON constraints.constraint_name = key_columns.constraint_name
   AND constraints.table_schema = key_columns.table_schema
   AND constraints.constraint_catalog = key_columns.constraint_catalog
  WHERE constraints.constraint_type = 'PRIMARY KEY'
    AND constraints.table_schema <> 'pg_catalog'
    AND constraints.table_schema <> 'information_schema'
    AND constraints.table_schema NOT LIKE 'pg_toast%'
    AND constraints.table_schema NOT LIKE 'pg_temp%'
  ORDER BY key_columns.table_schema, key_columns.table_name, key_columns.ordinal_position
`;

export const FOREIGN_KEYS_SQL = `
  SELECT
    constraints.conname AS constraint_name,
    source_namespace.nspname AS from_schema,
    source_table.relname AS from_table,
    source_attribute.attname AS from_column,
    target_namespace.nspname AS to_schema,
    target_table.relname AS to_table,
    target_attribute.attname AS to_column,
    columns.ordinality AS ordinal_position
  FROM pg_catalog.pg_constraint AS constraints
  JOIN pg_catalog.pg_class AS source_table
    ON source_table.oid = constraints.conrelid
  JOIN pg_catalog.pg_namespace AS source_namespace
    ON source_namespace.oid = source_table.relnamespace
  JOIN pg_catalog.pg_class AS target_table
    ON target_table.oid = constraints.confrelid
  JOIN pg_catalog.pg_namespace AS target_namespace
    ON target_namespace.oid = target_table.relnamespace
  JOIN LATERAL unnest(constraints.conkey, constraints.confkey)
    WITH ORDINALITY AS columns(source_attnum, target_attnum, ordinality)
    ON true
  JOIN pg_catalog.pg_attribute AS source_attribute
    ON source_attribute.attrelid = source_table.oid
   AND source_attribute.attnum = columns.source_attnum
  JOIN pg_catalog.pg_attribute AS target_attribute
    ON target_attribute.attrelid = target_table.oid
   AND target_attribute.attnum = columns.target_attnum
  WHERE constraints.contype = 'f'
    AND source_namespace.nspname <> 'pg_catalog'
    AND source_namespace.nspname <> 'information_schema'
    AND source_namespace.nspname NOT LIKE 'pg_toast%'
    AND source_namespace.nspname NOT LIKE 'pg_temp%'
  ORDER BY from_schema, from_table, constraint_name, ordinal_position
`;

export async function readSchemaGraph(pool: Pool): Promise<SchemaGraph> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const graph = await readConsistentSchema(client);
    await client.query("COMMIT");
    return graph;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function readConsistentSchema(client: PoolClient): Promise<SchemaGraph> {
  const tables = await client.query<TableRow>(TABLES_SQL);
  const columns = await client.query<ColumnRow>(COLUMNS_SQL);
  const primaryKeys = await client.query<PrimaryKeyRow>(PRIMARY_KEYS_SQL);
  const foreignKeys = await client.query<ForeignKeyRow>(FOREIGN_KEYS_SQL);
  return assembleSchemaGraph({
    tables: tables.rows,
    columns: columns.rows,
    primaryKeys: primaryKeys.rows,
    foreignKeys: foreignKeys.rows,
  });
}

export function catalogQueriesReadInformationSchema(): boolean {
  return (
    [TABLES_SQL, COLUMNS_SQL, PRIMARY_KEYS_SQL].every((sql) => sql.includes("information_schema")) &&
    COLUMNS_SQL.includes("pg_catalog.format_type") &&
    FOREIGN_KEYS_SQL.includes("pg_catalog.pg_constraint")
  );
}
