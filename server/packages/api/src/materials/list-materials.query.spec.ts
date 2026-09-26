import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { ListMaterialsQuery } from "./list-materials.query";

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const metadata = { type: "query" as const, metatype: ListMaterialsQuery, data: "" };

describe("ListMaterialsQuery", () => {
  it("accepts a category defined in the domain", async () => {
    const query = await pipe.transform({ category: "hdf" }, metadata);
    expect(query).toMatchObject({ category: "hdf" });
  });

  it("treats a missing category as the whole catalog", async () => {
    const query = await pipe.transform({}, metadata);
    expect(query.category).toBeUndefined();
  });

  it("rejects an unknown category", async () => {
    await expect(pipe.transform({ category: "sklejka" }, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects query fields the endpoint does not declare", async () => {
    await expect(pipe.transform({ category: "hdf", extra: "1" }, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
