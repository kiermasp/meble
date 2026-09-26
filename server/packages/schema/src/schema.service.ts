import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import type { SchemaGraph } from "./schema.graph";
import { readSchemaGraph } from "./schema.reader";

export const LOCAL_DATABASE_URL = "postgres://meble:meble@127.0.0.1:5432/meble";

export function databaseUrlFrom(configured: string | undefined): string {
  const value = configured?.trim();
  return value ? value : LOCAL_DATABASE_URL;
}

export function safeDatabaseMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown error";
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://***");
}

@Injectable()
export class SchemaService implements OnModuleDestroy {
  private readonly logger = new Logger(SchemaService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: databaseUrlFrom(config.get<string>("DATABASE_URL")),
      max: 4,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      application_name: "meble_schema",
      options: "-c default_transaction_read_only=on",
    });
    this.pool.on("error", (error: Error) => {
      this.logger.error(`Postgres connection error: ${safeDatabaseMessage(error)}`);
    });
  }

  read(): Promise<SchemaGraph> {
    return readSchemaGraph(this.pool);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
