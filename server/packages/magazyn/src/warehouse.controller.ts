import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { CatalogClient, CatalogUnavailableError } from "./catalog.client";
import { renderHealthPage, renderWarehousePage } from "./warehouse.page";
import { WarehouseQuery } from "./warehouse.query";

@Controller()
export class WarehouseController {
  constructor(private readonly catalog: CatalogClient) {}

  @Get("health")
  health(@Res() response: Response): void {
    response.status(200).type("html").send(renderHealthPage());
  }

  @Get()
  async show(@Query() query: WarehouseQuery, @Res() response: Response): Promise<void> {
    try {
      const boards = await this.catalog.list();
      response.status(200).type("html").send(renderWarehousePage({ boards, filters: query }));
    } catch (error) {
      if (!(error instanceof CatalogUnavailableError)) throw error;
      response.status(200).type("html").send(
        renderWarehousePage({
          boards: [],
          filters: query,
          error: "Nie udało się pobrać katalogu.",
        }),
      );
    }
  }
}
