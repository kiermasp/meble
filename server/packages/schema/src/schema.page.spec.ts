import type { SchemaGraph } from "./schema.graph";
import { renderSchemaPage } from "./schema.page";

function graph(): SchemaGraph {
  return {
    tables: [
      {
        schema: "public",
        name: "materials",
        primaryKey: ["id"],
        columns: [
          { name: "id", dataType: "uuid", nullable: false, primaryKey: true, foreignKey: false },
          { name: "manufacturer", dataType: "text", nullable: true, primaryKey: false, foreignKey: false },
          { name: "category_id", dataType: "uuid", nullable: false, primaryKey: false, foreignKey: true },
        ],
      },
      {
        schema: "public",
        name: "categories",
        primaryKey: ["id"],
        columns: [{ name: "id", dataType: "uuid", nullable: false, primaryKey: true, foreignKey: false }],
      },
    ],
    relations: [
      {
        name: "materials_category_id_fkey",
        fromSchema: "public",
        fromTable: "materials",
        fromColumns: ["category_id"],
        toSchema: "public",
        toTable: "categories",
        toColumns: ["id"],
      },
    ],
  };
}

describe("renderSchemaPage", () => {
  it("shows Polish section labels, columns, keys, and a relation edge", () => {
    const html = renderSchemaPage({ graph: graph() });

    expect(html).toContain("<h2>Tabele</h2>");
    expect(html).toContain("<h2>Pola</h2>");
    expect(html).toContain("<h2>Relacje</h2>");
    expect(html).toContain("<th>Nazwa</th>");
    expect(html).toContain("<th>Typ</th>");
    expect(html).toContain("<th>Puste</th>");
    expect(html).toContain("uuid");
    expect(html).toContain(">tak<");
    expect(html).toContain(">nie<");
    expect(html).toContain("klucz główny");
    expect(html).toContain("klucz obcy");
    expect(html).toContain('data-relation="materials_category_id_fkey"');
    expect(html).toContain("category_id → id");
    expect(html).toContain("<svg");
    expect(html).toContain("1 relacja");
  });

  it("limits fields to the selected table and escapes identifiers", () => {
    const html = renderSchemaPage({
      graph: {
        tables: [
          {
            schema: "public",
            name: "a<b",
            primaryKey: [],
            columns: [{ name: "x&y", dataType: "text", nullable: true, primaryKey: false, foreignKey: false }],
          },
        ],
        relations: [],
      },
      selected: { schema: "public", name: "a<b" },
    });

    expect(html).toContain("a&lt;b");
    expect(html).toContain("x&amp;y");
    expect(html).not.toContain("a<b");
    expect(html).toContain("Brak relacji.");
  });

  it("says when the database schema cannot be read", () => {
    const html = renderSchemaPage({
      graph: { tables: [], relations: [] },
      error: "Nie udało się odczytać schematu bazy.",
    });

    expect(html).toContain("Nie udało się odczytać schematu bazy.");
    expect(html).toContain("Brak tabel.");
    expect(html).toContain("Brak pól.");
    expect(html).toContain("Brak relacji.");
  });
});
