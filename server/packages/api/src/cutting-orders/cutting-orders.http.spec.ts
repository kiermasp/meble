import "reflect-metadata";
import { Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { configureHttp } from "../configure-http";
import { CuttingOrdersModule } from "./cutting-orders.module";
import { CUTTING_ORDER_ENTITIES } from "./cutting-order.rows";

const adminUrl = process.env.TEST_DATABASE_URL ?? "postgres://meble:meble@127.0.0.1:5432/meble";
const testUrl = adminUrl.replace(/\/[^/?]+(\?|$)/, "/meble_test$1");

const parked = {
  pieces: [
    {
      widthMm: 600,
      heightMm: 720,
      thicknessMm: 18,
      quantity: 2,
      materialReference: "5829997",
      grain: "along-length",
      edges: [
        { side: "top", materialReference: "W960-ABS-1", thicknessMm: 1 },
        { side: "left", materialReference: null, thicknessMm: null },
      ],
      holes: [
        { xMm: 37, yMm: 37, diameterMm: 5, depthMm: 12 },
        { xMm: 37, yMm: 100, diameterMm: 8, depthMm: null },
      ],
    },
  ],
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: testUrl,
      entities: [...CUTTING_ORDER_ENTITIES],
      synchronize: false,
    }),
    CuttingOrdersModule,
  ],
})
class CuttingOrdersTestApp {}

describe("parked cutting orders", () => {
  let app: INestApplication;
  let base: string;

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
      entities: [...CUTTING_ORDER_ENTITIES],
      synchronize: true,
      dropSchema: true,
    });
    await schema.initialize();
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
    const created = await send("POST", "/cutting-orders", parked);
    expect(created.status).toBe(201);
    expect(created.contentType).toContain("application/json");
    const order = created.payload as {
      id: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      pieces: Array<{
        id: string;
        materialReference: string;
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
      materialReference: "5829997",
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
        {
          widthMm: 400,
          heightMm: 500,
          thicknessMm: 18,
          quantity: 1,
          materialReference: "3149044",
          grain: "none",
          edges: [],
          holes: [],
        },
      ],
    });
    expect(updated.status).toBe(200);
    const next = updated.payload as {
      createdAt: string;
      updatedAt: string;
      pieces: Array<{ materialReference: string; edges: unknown[]; holes: unknown[] }>;
    };
    expect(next.createdAt).toBe(order.createdAt);
    expect(Date.parse(next.updatedAt)).toBeGreaterThan(Date.parse(order.createdAt));
    expect(next.pieces).toEqual([
      expect.objectContaining({
        widthMm: 400,
        quantity: 1,
        materialReference: "3149044",
        grain: "none",
        edges: [],
        holes: [],
      }),
    ]);
  });

  it("rejects a grain outside the contract and an unknown id", async () => {
    const invalid = await send("POST", "/cutting-orders", {
      pieces: [{ ...parked.pieces[0], grain: "wzdłuż" }],
    });
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(invalid.payload)).toContain("Usłojenie (grain)");

    const extra = await send("POST", "/cutting-orders", { ...parked, status: "sent" });
    expect(extra.status).toBe(400);
    expect(JSON.stringify(extra.payload)).toContain("Pole status nie jest dozwolone.");

    const missing = await send("GET", "/cutting-orders/00000000-0000-4000-8000-000000000000");
    expect(missing.status).toBe(404);
    expect(JSON.stringify(missing.payload)).toContain("Nie ma zaparkowanego rozkroju");

    const badId = await send("GET", "/cutting-orders/nie-uuid");
    expect(badId.status).toBe(400);
    expect(JSON.stringify(badId.payload)).toContain("UUID");
  });

  it("rejects two edges on the same side", async () => {
    const invalid = await send("POST", "/cutting-orders", {
      pieces: [
        {
          ...parked.pieces[0],
          edges: [
            { side: "top", materialReference: "A", thicknessMm: 1 },
            { side: "top", materialReference: "B", thicknessMm: 1 },
          ],
        },
      ],
    });
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(invalid.payload)).toContain("jedno obrzeże");
  });
});
