export type SchemaColumn = {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey: boolean;
};

export type SchemaTable = {
  schema: string;
  name: string;
  primaryKey: string[];
  columns: SchemaColumn[];
};

export type SchemaRelation = {
  name: string;
  fromSchema: string;
  fromTable: string;
  fromColumns: string[];
  toSchema: string;
  toTable: string;
  toColumns: string[];
};

export type SchemaGraph = {
  tables: SchemaTable[];
  relations: SchemaRelation[];
};

export type TableRow = {
  schema_name: string;
  table_name: string;
};

export type ColumnRow = {
  schema_name: string;
  table_name: string;
  column_name: string;
  ordinal_position: number | string;
  is_nullable: string;
  data_type: string;
};

export type PrimaryKeyRow = {
  schema_name: string;
  table_name: string;
  column_name: string;
  ordinal_position: number | string;
};

export type ForeignKeyRow = {
  constraint_name: string;
  from_schema: string;
  from_table: string;
  from_column: string;
  to_schema: string;
  to_table: string;
  to_column: string;
  ordinal_position: number | string;
};

export type RawSchema = {
  tables: TableRow[];
  columns: ColumnRow[];
  primaryKeys: PrimaryKeyRow[];
  foreignKeys: ForeignKeyRow[];
};

export const EMPTY_SCHEMA_GRAPH: SchemaGraph = {
  tables: [],
  relations: [],
};

type MutableColumn = SchemaColumn & {
  ordinal: number;
};

type MutableTable = {
  schema: string;
  name: string;
  primaryKey: string[];
  columns: MutableColumn[];
};

export function tableKey(schema: string, name: string): string {
  return `${schema}.${name}`;
}

export function isVisibleSchema(schema: string): boolean {
  return (
    schema !== "pg_catalog" &&
    schema !== "information_schema" &&
    !schema.startsWith("pg_toast") &&
    !schema.startsWith("pg_temp")
  );
}

export function parseTableQuery(value: unknown): { schema: string; name: string } | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(value);
  if (!match) return undefined;
  return { schema: match[1], name: match[2] };
}

export function assembleSchemaGraph(input: RawSchema): SchemaGraph {
  const tables = new Map<string, MutableTable>();

  const ensure = (schema: string, name: string): MutableTable => {
    const key = tableKey(schema, name);
    const existing = tables.get(key);
    if (existing) return existing;
    const created: MutableTable = { schema, name, primaryKey: [], columns: [] };
    tables.set(key, created);
    return created;
  };

  for (const row of input.tables) {
    if (!isVisibleSchema(row.schema_name)) continue;
    ensure(row.schema_name, row.table_name);
  }

  for (const row of input.columns) {
    if (!isVisibleSchema(row.schema_name)) continue;
    const table = ensure(row.schema_name, row.table_name);
    if (table.columns.some((column) => column.name === row.column_name)) continue;
    table.columns.push({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === "YES",
      primaryKey: false,
      foreignKey: false,
      ordinal: Number(row.ordinal_position),
    });
  }

  const primaryKeys = [...input.primaryKeys].sort(
    (left, right) => Number(left.ordinal_position) - Number(right.ordinal_position),
  );
  for (const row of primaryKeys) {
    if (!isVisibleSchema(row.schema_name)) continue;
    const table = ensure(row.schema_name, row.table_name);
    if (!table.primaryKey.includes(row.column_name)) table.primaryKey.push(row.column_name);
    const column = table.columns.find((item) => item.name === row.column_name);
    if (column) column.primaryKey = true;
  }

  const relations = new Map<string, SchemaRelation>();
  const foreignKeys = [...input.foreignKeys].sort(
    (left, right) => Number(left.ordinal_position) - Number(right.ordinal_position),
  );
  for (const row of foreignKeys) {
    if (!isVisibleSchema(row.from_schema)) continue;
    const fromTable = ensure(row.from_schema, row.from_table);
    if (isVisibleSchema(row.to_schema)) ensure(row.to_schema, row.to_table);
    const key = `${row.from_schema}\0${row.from_table}\0${row.constraint_name}`;
    const relation = relations.get(key) ?? {
      name: row.constraint_name,
      fromSchema: row.from_schema,
      fromTable: row.from_table,
      fromColumns: [],
      toSchema: row.to_schema,
      toTable: row.to_table,
      toColumns: [],
    };
    const index = Number(row.ordinal_position) - 1;
    relation.fromColumns[index] = row.from_column;
    relation.toColumns[index] = row.to_column;
    relations.set(key, relation);
    const column = fromTable.columns.find((item) => item.name === row.from_column);
    if (column) column.foreignKey = true;
  }

  const graphTables = [...tables.values()]
    .map((table) => ({
      schema: table.schema,
      name: table.name,
      primaryKey: table.primaryKey,
      columns: table.columns
        .sort((left, right) => left.ordinal - right.ordinal || left.name.localeCompare(right.name))
        .map(({ ordinal: _ordinal, ...column }) => column),
    }))
    .sort((left, right) => left.schema.localeCompare(right.schema) || left.name.localeCompare(right.name));

  const graphRelations = [...relations.values()]
    .map((relation) => ({
      ...relation,
      fromColumns: relation.fromColumns.filter((column) => column != null),
      toColumns: relation.toColumns.filter((column) => column != null),
    }))
    .sort(
      (left, right) =>
        left.fromSchema.localeCompare(right.fromSchema) ||
        left.fromTable.localeCompare(right.fromTable) ||
        left.name.localeCompare(right.name),
    );

  return { tables: graphTables, relations: graphRelations };
}
