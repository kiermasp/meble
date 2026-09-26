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
  it("accepts one filter value or several of the same field", async () => {
    const one = await pipe.transform({ manufacturer: "Egger", thickness: "18.6" }, metadata);
    expect(one).toMatchObject({ manufacturer: ["Egger"], thickness: ["18.6"] });

    const many = await pipe.transform(
      { manufacturer: ["Egger", "Kronospan"], status: ["Końcówka serii"] },
      metadata,
    );
    expect(many).toMatchObject({
      manufacturer: ["Egger", "Kronospan"],
      status: ["Końcówka serii"],
    });
  });

  it("treats empty filters as the whole catalog", async () => {
    const query = await pipe.transform({ manufacturer: "", thickness: "" }, metadata);
    expect(query.manufacturer).toBeUndefined();
    expect(query.thickness).toBeUndefined();
  });

  it("rejects query fields the page does not declare", async () => {
    await expect(pipe.transform({ manufacturer: "Egger", extra: "1" }, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
