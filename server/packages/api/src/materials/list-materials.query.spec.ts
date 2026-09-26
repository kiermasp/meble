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
  it("accepts a shop section, including one that is not ingested yet", async () => {
    const boards = await pipe.transform({ category: "plyty-meblowe" }, metadata);
    const plywood = await pipe.transform({ category: "sklejki" }, metadata);
    expect(boards).toMatchObject({ category: "plyty-meblowe" });
    expect(plywood).toMatchObject({ category: "sklejki" });
  });

  it("treats a missing category as the whole catalog", async () => {
    const query = await pipe.transform({}, metadata);
    expect(query.category).toBeUndefined();
  });

  it("accepts a category code that is not compiled into the client", async () => {
    const query = await pipe.transform({ category: "nowa-kategoria" }, metadata);
    expect(query).toMatchObject({ category: "nowa-kategoria" });
  });

  it("rejects query fields the endpoint does not declare", async () => {
    await expect(pipe.transform({ category: "blaty", extra: "1" }, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
