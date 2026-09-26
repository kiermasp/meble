import { DataSource } from "typeorm";
import type { Material } from "@meble/domain";
import { LOOKUP_ENTITIES } from "../lookups/lookup.rows";
import { ShopLookupStore } from "../lookups/shop-lookup.store";
import { MaterialStore } from "./material-store";
import { MaterialCollectionStatusRow, MaterialRow } from "./material.row";

const adminUrl = process.env.TEST_DATABASE_URL ?? "postgres://meble:meble@127.0.0.1:5432/meble";
const testUrl = adminUrl.replace(/\/[^/?]+(\?|$)/, "/meble_test$1");

function variant(overrides: Partial<Material> = {}): Material {
  return {
    mebleRefId: "5829997",
    displayName: "Płyta meblowa EGGER W960 SM Biały klasyczny 18 mm",
    category: "plyty-meblowe",
    subtype: "Białe",
    manufacturer: "Egger",
    decorCode: "W960",
    decorName: "Biały klasyczny",
    structure: "SM SemiMatt",
    thicknessMm: 18,
    format: "2070x2800",
    availability: "48h",
    unitPriceAmount: 227.45,
    currency: "PLN",
    decorKind: "Magazynowe",
    waterResistance: "Suchotrwała",
    brightness: null,
    decorType: null,
    shade: "białe",
    color: "Biały klasyczny",
    statuses: ["Kolekcja 26+"],
    fetchedAt: new Date("2026-09-26T10:00:00.000Z"),
    ...overrides,
  };
}

describe("MaterialStore upsert", () => {
  let dataSource: DataSource;
  let store: MaterialStore;

  beforeAll(async () => {
    const admin = new DataSource({ type: "postgres", url: adminUrl });
    await admin.initialize();
    const existing: unknown[] = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      "meble_test",
    ]);
    if (existing.length === 0) {
      await admin.query("CREATE DATABASE meble_test");
    }
    await admin.destroy();

    dataSource = new DataSource({
      type: "postgres",
      url: testUrl,
      entities: [...LOOKUP_ENTITIES, MaterialRow, MaterialCollectionStatusRow],
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
    store = new MaterialStore(
      dataSource.getRepository(MaterialRow),
      dataSource.getRepository(MaterialCollectionStatusRow),
      new ShopLookupStore(dataSource),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it("updates the same variant and drops codes missing from the next run", async () => {
    await store.upsertAll([
      variant(),
      variant({
        mebleRefId: "3149044",
        manufacturer: "Kronospan",
        decorCode: "U8685",
        structure: "BS",
        unitPriceAmount: 160,
        availability: "48h",
      }),
    ]);
    await store.replaceCategory("plyty-meblowe", [
      variant({
        unitPriceAmount: 230,
        availability: "7 dni",
        fetchedAt: new Date("2026-09-26T13:00:00.000Z"),
      }),
    ]);
    await store.upsertAll([
      variant({
        mebleRefId: "1",
        category: "sklejki",
        displayName: "Sklejka",
        manufacturer: null,
        decorCode: null,
        decorName: null,
        structure: null,
        thicknessMm: null,
        format: null,
        availability: null,
        unitPriceAmount: null,
        currency: null,
        decorKind: null,
        waterResistance: null,
        shade: null,
        color: null,
        statuses: [],
        subtype: null,
      }),
    ]);
    await store.deleteOtherCategories(["plyty-meblowe"]);

    const rows = await store.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      mebleRefId: "5829997",
      unitPriceAmount: 230,
      availability: "7 dni",
      currency: "PLN",
      category: "plyty-meblowe",
    });
    expect(rows[0]?.fetchedAt.toISOString()).toBe("2026-09-26T13:00:00.000Z");
    expect(rows[0]?.updatedAt.toISOString()).toBe("2026-09-26T13:00:00.000Z");
    expect(rows[0]?.categoryId).toEqual(expect.any(String));
    expect(rows[0]?.manufacturerId).toEqual(expect.any(String));
    expect(rows[0]?.decorKind).toBe("Magazynowe");
    expect(rows[0]?.statuses).toEqual(["Kolekcja 26+"]);
    const foreignKeys: { definition: string }[] = await dataSource.query(
      `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint WHERE contype = 'f' AND conrelid = 'materials'::regclass`,
    );
    const definitions = foreignKeys.map((row) => row.definition).join("\n");
    expect(definitions).toContain("FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT");
    expect(definitions).toContain("FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE RESTRICT");
    expect(definitions).toContain("FOREIGN KEY (decor_kind_id) REFERENCES decor_kinds(id) ON DELETE RESTRICT");
  });

  it("keeps the previous update when the next fetch copies the same board", async () => {
    await store.replaceCategory("plyty-meblowe", [variant({ fetchedAt: new Date("2026-09-26T10:00:00.000Z") })]);
    await store.replaceCategory("plyty-meblowe", [
      variant({ fetchedAt: new Date("2026-09-26T16:00:00.000Z"), unitPriceAmount: 227.45 }),
    ]);
    const [row] = await store.list();
    expect(row?.fetchedAt.toISOString()).toBe("2026-09-26T16:00:00.000Z");
    expect(row?.updatedAt.toISOString()).toBe("2026-09-26T10:00:00.000Z");
  });
});
