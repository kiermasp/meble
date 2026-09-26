import "reflect-metadata";
import { Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { configureHttp } from "../configure-http";
import { EdgebandRow } from "../edgebands/edgeband.row";
import { MaterialRow } from "../materials/material.row";
import { CuttingOrdersModule } from "./cutting-orders.module";
import { CUTTING_ORDER_ENTITIES } from "./cutting-order.rows";

const adminUrl = process.env.TEST_DATABASE_URL ?? "postgres://meble:meble@127.0.0.1:5432/meble";
const testUrl = adminUrl.replace(/\/[^/?]+(\?|$)/, "/meble_test$1");

const ENTITIES = [MaterialRow, EdgebandRow, ...CUTTING_ORDER_ENTITIES];

function piece(materialId: string, edgebandId: string, overrides: Record<string, unknown> = {}) {
  return {
    widthMm: 600,
    heightMm: 720,
    thicknessMm: 18,
    quantity: 2,
    materialId,
    grain: "along-length",
    edges: [
      { side: "top", edgebandId, thicknessMm: 0.8 },
      { side: "left", edgebandId, thicknessMm: null },
    ],
    holes: [
      { xMm: 37, yMm: 37, diameterMm: 5, depthMm: 12 },
      { xMm: 37, yMm: 100, diameterMm: 8, depthMm: null },
    ],
    ...overrides,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: testUrl,
      entities: ENTITIES,
      synchronize: false,
    }),
    CuttingOrdersModule,
  ],
})
class CuttingOrdersTestApp {}

describe("parked cutting orders", () => {
  let app: INestApplication;
  let base: string;
  let boardA = "";
  let boardB = "";
  let tapeId = "";

  beforeAll(async () => {
    const admin = new DataSource({ type: "postgres", url: adminUrl });
    await admin.initialize();
    const existing: unknown[] = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      "meble_test",
    ]);
    if (existing.length === 0) await admin.query("CREATE DATABASE meble_test");
    await admin.destroy();

    const schema = new DataSource({
      type: "postgres",
      url: testUrl,
      entities: ENTITIES,
      synchronize: true,
      dropSchema: true,
    });
    await schema.initialize();
    const inserted: { id: string }[] = await schema.query(
      `INSERT INTO materials (meble_ref_id, display_name, category, structure, thickness_mm, fetched_at)
       VALUES
         ('1039757', 'Płyta meblowa EGGER H1250 ST36 Jesion Navarra 18.6 mm', 'plyty-meblowe', 'ST36 Feelwood Brushed', 18.6, now()),
         ('1039758', 'Płyta meblowa EGGER H1250 ST36 Jesion Navarra 2800x1032 37.2 mm', 'plyty-meblowe', 'ST36 Feelwood Brushed', 37.2, now())
       RETURNING id`,
    );
    boardA = inserted[0]?.id ?? "";
    boardB = inserted[1]?.id ?? "";
    const tapes: { id: string }[] = await schema.query(
      `INSERT INTO edgebands (meble_ref_id, display_name, code, name, manufacturer, width_mm, thickness_mm, unit_price_amount, currency, availability, fetched_at)
       VALUES ('1050019', 'Obrzeże ABS U702 ST9 Kaszmir 23 x 0.8 mm EGGER', 'U702', 'Kaszmir', 'Egger', 23, 0.8, 1.67, 'PLN', '24h', now())
       RETURNING id`,
    );
    tapeId = tapes[0]?.id ?? "";
    const pieceKeys: { definition: string }[] = await schema.query(
      `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE contype = 'f' AND conrelid = 'cutting_pieces'::regclass`,
    );
    expect(pieceKeys.map((row) => row.definition).join("\n")).toContain(
      "FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT",
    );
    const edgeKeys: { definition: string }[] = await schema.query(
      `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE contype = 'f' AND conrelid = 'piece_edges'::regclass`,
    );
    expect(edgeKeys.map((row) => row.definition).join("\n")).toContain(
      "FOREIGN KEY (edgeband_id) REFERENCES edgebands(id) ON DELETE RESTRICT",
    );
    await schema.destroy();

    app = await NestFactory.create(CuttingOrdersTestApp, { bodyParser: false, logger: false });
    configureHttp(app);
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function send(method: string, path: string, body?: unknown) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload: unknown = await response.json();
    return { status: response.status, contentType: response.headers.get("content-type"), payload };
  }

  it("creates, reads, and replaces a parked order without leaving the database", async () => {
    const created = await send("POST", "/cutting-orders", { pieces: [piece(boardA, tapeId)] });
    expect(created.status).toBe(201);
    expect(created.contentType).toContain("application/json");
    const order = created.payload as {
      id: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      pieces: Array<{
        id: string;
        materialId: string;
        grain: string;
        edges: Array<{ side: string; thicknessMm: number | null }>;
        holes: Array<{ depthMm: number | null }>;
      }>;
    };
    expect(order.status).toBe("parked");
    expect(order.createdAt).toEqual(expect.any(String));
    expect(order.pieces).toHaveLength(1);
    expect(order.pieces[0]).toMatchObject({
      widthMm: 600,
      heightMm: 720,
      thicknessMm: 18,
      quantity: 2,
      materialId: boardA,
      grain: "along-length",
    });
    expect(order.pieces[0]?.edges.map((edge) => edge.side)).toEqual(["top", "left"]);
    expect(order.pieces[0]?.holes.map((hole) => hole.depthMm)).toEqual([12, null]);

    const read = await send("GET", `/cutting-orders/${order.id}`);
    expect(read.status).toBe(200);
    expect(read.payload).toEqual(created.payload);

    const listed = await send("GET", "/cutting-orders");
    expect(listed.status).toBe(200);
    expect(listed.payload).toEqual([created.payload]);

    await new Promise((resolve) => setTimeout(resolve, 20));
    const updated = await send("PATCH", `/cutting-orders/${order.id}`, {
      pieces: [
        piece(boardB, tapeId, {
          widthMm: 400,
          heightMm: 500,
          thicknessMm: 18,
          quantity: 1,
          grain: "none",
          edges: [],
          holes: [],
        }),
      ],
    });
    expect(updated.status).toBe(200);
    const next = updated.payload as {
      createdAt: string;
      updatedAt: string;
      pieces: Array<{ materialId: string; edges: unknown[]; holes: unknown[] }>;
    };
    expect(next.createdAt).toBe(order.createdAt);
    expect(Date.parse(next.updatedAt)).toBeGreaterThan(Date.parse(order.createdAt));
    expect(next.pieces).toEqual([
      expect.objectContaining({
        widthMm: 400,
        quantity: 1,
        materialId: boardB,
        grain: "none",
        edges: [],
        holes: [],
      }),
    ]);
  });

  it("rejects a grain outside the contract and an unknown id", async () => {
    const invalid = await send("POST", "/cutting-orders", {
      pieces: [piece(boardA, tapeId, { grain: "wzdłuż" })],
    });
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(invalid.payload)).toContain("Usłojenie (grain)");

    const extra = await send("POST", "/cutting-orders", { pieces: [piece(boardA, tapeId)], status: "sent" });
    expect(extra.status).toBe(400);
    expect(JSON.stringify(extra.payload)).toContain("Pole status nie jest dozwolone.");

    const missing = await send("GET", "/cutting-orders/00000000-0000-4000-8000-000000000000");
    expect(missing.status).toBe(404);
    expect(JSON.stringify(missing.payload)).toContain("Nie ma zaparkowanego rozkroju");

    const badId = await send("GET", "/cutting-orders/nie-uuid");
    expect(badId.status).toBe(400);
    expect(JSON.stringify(badId.payload)).toContain("UUID");

    const unknownBoard = await send("POST", "/cutting-orders", {
      pieces: [piece("00000000-0000-4000-8000-000000000099", tapeId)],
    });
    expect(unknownBoard.status).toBe(400);
    expect(JSON.stringify(unknownBoard.payload)).toContain("Nie ma płyty o identyfikatorze");

    const unknownTape = await send("POST", "/cutting-orders", {
      pieces: [piece(boardA, "00000000-0000-4000-8000-000000000088")],
    });
    expect(unknownTape.status).toBe(400);
    expect(JSON.stringify(unknownTape.payload)).toContain("Nie ma obrzeża o identyfikatorze");

    const looseCode = await send("POST", "/cutting-orders", {
      pieces: [piece(boardA, tapeId, { materialReference: "1039757" })],
    });
    expect(looseCode.status).toBe(400);
    expect(JSON.stringify(looseCode.payload)).toContain("Pole materialReference nie jest dozwolone.");
  });

  it("rejects two edges on the same side", async () => {
    const invalid = await send("POST", "/cutting-orders", {
      pieces: [
        piece(boardA, tapeId, {
          edges: [
            { side: "top", edgebandId: tapeId, thicknessMm: 1 },
            { side: "top", edgebandId: tapeId, thicknessMm: 1 },
          ],
        }),
      ],
    });
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(invalid.payload)).toContain("jedno obrzeże");
  });
});
