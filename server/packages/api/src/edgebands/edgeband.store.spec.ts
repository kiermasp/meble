import { DataSource } from "typeorm";
import type { Edgeband } from "@meble/domain";
import { EdgebandRow } from "./edgeband.row";
import { EdgebandStore } from "./edgeband.store";

const adminUrl = process.env.TEST_DATABASE_URL ?? "postgres://meble:meble@127.0.0.1:5432/meble";
const testUrl = adminUrl.replace(/\/[^/?]+(\?|$)/, "/meble_test$1");

function tape(overrides: Partial<Edgeband> = {}): Edgeband {
  return {
    externalCode: "1050019",
    displayName: "Obrzeże ABS U702 ST9 Kaszmir 23 x 0.8 mm EGGER",
    code: "U702",
    name: "Kaszmir",
    manufacturer: "Egger",
    structure: "ST9",
    widthMm: 23,
    thicknessMm: 0.8,
    availability: "24h",
    unitPriceAmount: 1.67,
    currency: "PLN",
    fetchedAt: new Date("2026-09-26T12:00:00.000Z"),
    ...overrides,
  };
}

describe("EdgebandStore", () => {
  let dataSource: DataSource;
  let store: EdgebandStore;

  beforeAll(async () => {
    const admin = new DataSource({ type: "postgres", url: adminUrl });
    await admin.initialize();
    const existing: unknown[] = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", ["meble_test"]);
    if (existing.length === 0) await admin.query("CREATE DATABASE meble_test");
    await admin.destroy();

    dataSource = new DataSource({
      type: "postgres",
      url: testUrl,
      entities: [EdgebandRow],
      synchronize: true,
    });
    await dataSource.initialize();
    store = new EdgebandStore(dataSource.getRepository(EdgebandRow));
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("upserts a variant and drops a code missing from the next run", async () => {
    await store.replaceAll([tape(), tape({ externalCode: "1050020", unitPriceAmount: 2.1 })]);
    await store.replaceAll([tape({ unitPriceAmount: 1.8, availability: "48h" })]);
    const rows = await store.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      externalCode: "1050019",
      code: "U702",
      widthMm: 23,
      thicknessMm: 0.8,
      unitPriceAmount: 1.8,
      availability: "48h",
    });
  });
});
