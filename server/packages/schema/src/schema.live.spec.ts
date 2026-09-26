import { Pool } from "pg";
import { readSchemaGraph } from "./schema.reader";

const databaseUrl = "postgres://meble:meble@127.0.0.1:5432/meble";

describe("live database schema", () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5000,
    application_name: "meble_schema_test",
    options: "-c default_transaction_read_only=on",
  });

  afterAll(async () => {
    await pool.end();
  });

  it("reads tables, columns, and keys from the current Postgres catalog", async () => {
    const graph = await readSchemaGraph(pool);
    expect(graph.tables.every((table) => table.schema !== "pg_catalog" && table.schema !== "information_schema")).toBe(
      true,
    );

    const materials = graph.tables.find((table) => table.schema === "public" && table.name === "materials");
    expect(materials).toBeDefined();
    expect(materials?.primaryKey).toEqual(["id"]);
    expect(materials?.columns.find((column) => column.name === "id")).toMatchObject({
      dataType: "uuid",
      nullable: false,
      primaryKey: true,
    });
    expect(materials?.columns.find((column) => column.name === "manufacturer")).toMatchObject({
      dataType: "text",
      nullable: true,
      primaryKey: false,
    });
    expect(materials?.columns.find((column) => column.name === "thickness_mm")?.dataType).toBe("numeric(5,1)");
    expect(Array.isArray(graph.relations)).toBe(true);
  });
});
