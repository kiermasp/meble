import { Controller, Get, Logger, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { EMPTY_SCHEMA_GRAPH, parseTableQuery } from "./schema.graph";
import { renderHealthPage, renderSchemaPage } from "./schema.page";
import { safeDatabaseMessage, SchemaService } from "./schema.service";

@Controller()
export class SchemaController {
  private readonly logger = new Logger(SchemaController.name);

  constructor(private readonly schemas: SchemaService) {}

  @Get("health")
  health(@Res() response: Response): void {
    response.setHeader("Cache-Control", "no-store");
    response.status(200).type("html").send(renderHealthPage());
  }

  @Get("schema")
  async schema(@Res() response: Response): Promise<void> {
    response.setHeader("Cache-Control", "no-store");
    try {
      const graph = await this.schemas.read();
      response.status(200).type("application/json").send(graph);
    } catch (error) {
      this.logger.error(`Failed to read the database schema: ${safeDatabaseMessage(error)}`);
      response.status(503).type("application/json").send({ error: "schema_unavailable" });
    }
  }

  @Get()
  async show(@Query("table") table: string | undefined, @Res() response: Response): Promise<void> {
    response.setHeader("Cache-Control", "no-store");
    try {
      const graph = await this.schemas.read();
      response.status(200).type("html").send(renderSchemaPage({ graph, selected: parseTableQuery(table) }));
    } catch (error) {
      this.logger.error(`Failed to read the database schema: ${safeDatabaseMessage(error)}`);
      response.status(503).type("html").send(
        renderSchemaPage({
          graph: EMPTY_SCHEMA_GRAPH,
          error: "Nie udało się odczytać schematu bazy.",
        }),
      );
    }
  }
}
