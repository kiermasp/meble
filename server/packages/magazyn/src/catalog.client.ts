import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type CatalogBoard, isCatalogBoard } from "./catalog-board";

export class CatalogUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogUnavailableError";
  }
}

@Injectable()
export class CatalogClient {
  constructor(private readonly config: ConfigService) {}

  async list(): Promise<CatalogBoard[]> {
    const base = (this.config.get<string>("API_BASE_URL") ?? "http://localhost:3010").replace(/\/$/, "");
    let response: Response;
    try {
      response = await fetch(`${base}/materials`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "request failed";
      throw new CatalogUnavailableError(reason);
    }
    if (!response.ok) {
      throw new CatalogUnavailableError(`API returned HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new CatalogUnavailableError("API did not return JSON");
    }
    const body: unknown = await response.json();
    if (!Array.isArray(body) || !body.every(isCatalogBoard)) {
      throw new CatalogUnavailableError("API JSON is not a board list");
    }
    return body;
  }
}
