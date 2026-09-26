import { assembleSchemaGraph, isVisibleSchema, parseTableQuery } from "./schema.graph";
import { catalogQueriesReadInformationSchema } from "./schema.reader";

describe("assembleSchemaGraph", () => {
  it("builds tables, nullability, keys, and composite foreign keys from catalog rows", () => {
    const graph = assembleSchemaGraph({
      tables: [
        { schema_name: "public", table_name: "materials" },
        { schema_name: "pg_catalog", table_name: "pg_class" },
        { schema_name: "public", table_name: "categories" },
      ],
      columns: [
        {
          schema_name: "public",
          table_name: "materials",
          column_name: "category_id",
          ordinal_position: "2",
          is_nullable: "NO",
          data_type: "uuid",
        },
        {
          schema_name: "public",
          table_name: "materials",
          column_name: "id",
          ordinal_position: 1,
          is_nullable: "NO",
          data_type: "uuid",
        },
        {
          schema_name: "public",
          table_name: "materials",
          column_name: "manufacturer",
          ordinal_position: 3,
          is_nullable: "YES",
          data_type: "text",
        },
        {
          schema_name: "public",
          table_name: "categories",
          column_name: "id",
          ordinal_position: 1,
          is_nullable: "NO",
          data_type: "uuid",
        },
        {
          schema_name: "public",
          table_name: "categories",
          column_name: "shop_id",
          ordinal_position: 2,
          is_nullable: "NO",
          data_type: "uuid",
        },
        {
          schema_name: "pg_catalog",
          table_name: "pg_class",
          column_name: "oid",
          ordinal_position: 1,
          is_nullable: "NO",
          data_type: "oid",
        },
      ],
      primaryKeys: [
        { schema_name: "public", table_name: "categories", column_name: "shop_id", ordinal_position: 2 },
        { schema_name: "public", table_name: "categories", column_name: "id", ordinal_position: 1 },
        { schema_name: "public", table_name: "materials", column_name: "id", ordinal_position: 1 },
      ],
      foreignKeys: [
        {
          constraint_name: "materials_category_fkey",
          from_schema: "public",
          from_table: "materials",
          from_column: "shop_id",
          to_schema: "public",
          to_table: "categories",
          to_column: "shop_id",
          ordinal_position: "2",
        },
        {
          constraint_name: "materials_category_fkey",
          from_schema: "public",
          from_table: "materials",
          from_column: "category_id",
          to_schema: "public",
          to_table: "categories",
          to_column: "id",
          ordinal_position: 1,
        },
      ],
    });

    expect(graph.tables.map((table) => table.name)).toEqual(["categories", "materials"]);
    expect(graph.tables.find((table) => table.name === "categories")?.primaryKey).toEqual(["id", "shop_id"]);
    const materials = graph.tables.find((table) => table.name === "materials");
    expect(materials?.columns.map((column) => column.name)).toEqual(["id", "category_id", "manufacturer"]);
    expect(materials?.columns.find((column) => column.name === "manufacturer")).toMatchObject({
      dataType: "text",
      nullable: true,
      primaryKey: false,
      foreignKey: false,
    });
    expect(materials?.columns.find((column) => column.name === "id")).toMatchObject({
      nullable: false,
      primaryKey: true,
    });
    expect(materials?.columns.find((column) => column.name === "category_id")?.foreignKey).toBe(true);
    expect(graph.relations).toEqual([
      {
        name: "materials_category_fkey",
        fromSchema: "public",
        fromTable: "materials",
        fromColumns: ["category_id", "shop_id"],
        toSchema: "public",
        toTable: "categories",
        toColumns: ["id", "shop_id"],
      },
    ]);
  });

  it("adds a foreign-key target that was missing from the table list", () => {
    const graph = assembleSchemaGraph({
      tables: [{ schema_name: "public", table_name: "boards" }],
      columns: [],
      primaryKeys: [],
      foreignKeys: [
        {
          constraint_name: "boards_owner_fkey",
          from_schema: "public",
          from_table: "boards",
          from_column: "owner_id",
          to_schema: "public",
          to_table: "owners",
          to_column: "id",
          ordinal_position: 1,
        },
      ],
    });

    expect(graph.tables.map((table) => table.name)).toEqual(["boards", "owners"]);
  });
});

describe("parseTableQuery", () => {
  it("accepts schema.table and rejects anything else", () => {
    expect(parseTableQuery("public.materials")).toEqual({ schema: "public", name: "materials" });
    expect(parseTableQuery("public.materials;drop")).toBeUndefined();
    expect(parseTableQuery("materials")).toBeUndefined();
    expect(parseTableQuery(undefined)).toBeUndefined();
  });
});

describe("catalog queries", () => {
  it("reads information_schema and pg_catalog", () => {
    expect(catalogQueriesReadInformationSchema()).toBe(true);
    expect(isVisibleSchema("public")).toBe(true);
    expect(isVisibleSchema("pg_catalog")).toBe(false);
    expect(isVisibleSchema("information_schema")).toBe(false);
  });
});
