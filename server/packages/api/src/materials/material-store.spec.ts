import { DataSource } from "typeorm";
import type { Material } from "@meble/domain";
import { MaterialStore } from "./material-store";
import { MaterialRow } from "./material.row";

const adminUrl = process.env.TEST_DATABASE_URL ?? "postgres://meble:meble@127.0.0.1:5432/meble";
const testUrl = adminUrl.replace(/\/[^/?]+(\?|$)/, "/meble_test$1");

function board(overrides: Partial<Material> = {}): Material {
  return {
    externalCode: "W1000 ST19",
    displayName: "W1000 ST19 / Biały premium",
    category: "plyty-meblowe",
    manufacturer: "Egger",
    structure: "ST19",
    thicknessMm: 18,
    availability: "in_stock",
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
      entities: [MaterialRow],
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
    store = new MaterialStore(dataSource.getRepository(MaterialRow));
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it("updates the same board on the second run instead of inserting a duplicate", async () => {
    await store.upsertAll([board()]);
    await store.upsertAll([
      board({
        displayName: "W1000 ST19 / Biały premium (aktualizacja)",
        manufacturer: "Egger",
        thicknessMm: 19,
        availability: "on_order",
        fetchedAt: new Date("2026-09-26T13:00:00.000Z"),
      }),
      board({
        externalCode: "U708 PGST9",
        displayName: "U708 PGST9 / Szary jasny",
        manufacturer: "Egger",
        structure: "PGST9",
        category: "plyty-wysoki-polysk",
        availability: "on_order_pallet",
      }),
    ]);

    const rows = await store.list();
    expect(rows).toHaveLength(2);
    const updated = rows.find((row) => row.externalCode === "W1000 ST19");
    expect(updated).toMatchObject({
      displayName: "W1000 ST19 / Biały premium (aktualizacja)",
      manufacturer: "Egger",
      thicknessMm: 19,
      availability: "on_order",
      structure: "ST19",
      category: "plyty-meblowe",
    });
    expect(updated?.fetchedAt.toISOString()).toBe("2026-09-26T13:00:00.000Z");
    const ids = await dataSource.getRepository(MaterialRow).find({ select: { id: true } });
    expect(new Set(ids.map((row) => row.id)).size).toBe(2);
  });
});
