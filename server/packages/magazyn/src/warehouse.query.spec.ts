import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { WarehouseQuery } from "./warehouse.query";

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const metadata = { type: "query" as const, metatype: WarehouseQuery, data: "" };

describe("WarehouseQuery", () => {
  it("accepts a category and availability from the domain", async () => {
    const query = await pipe.transform(
      { category: "plyty-meblowe", availability: "on_order_pallet" },
      metadata,
    );
    expect(query).toMatchObject({ category: "plyty-meblowe", availability: "on_order_pallet" });
  });

  it("treats empty filters as the whole catalog", async () => {
    const query = await pipe.transform({ category: "", availability: "" }, metadata);
    expect(query.category).toBeUndefined();
    expect(query.availability).toBeUndefined();
  });

  it("rejects an unknown category", async () => {
    await expect(pipe.transform({ category: "sklejka" }, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects query fields the page does not declare", async () => {
    await expect(pipe.transform({ category: "hdf", extra: "1" }, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
