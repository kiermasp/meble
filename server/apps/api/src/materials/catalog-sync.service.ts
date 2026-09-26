import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MaterialStore } from "./material-store";
import { MebleCatalogClient } from "./meble-catalog.client";
import { parseBoardDialog } from "./parse-board-dialog";

const DEFAULT_INTERVAL_MS = 3 * 60 * 60 * 1000;

@Injectable()
export class CatalogSyncService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CatalogSyncService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly client: MebleCatalogClient,
    private readonly store: MaterialStore,
    private readonly config: ConfigService,
  ) {}

  /**
   * Fetch once as the API process starts, then every three hours on an interval.
   * The clock starts with this process. It is not a wall-clock cron.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.sync();
    const intervalMs = this.intervalMs();
    this.timer = setInterval(() => {
      void this.sync().catch((error: unknown) => this.logFailure(error));
    }, intervalMs);
    this.logger.log(`Next board sync in ${intervalMs} ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sync(): Promise<number> {
    const html = await this.client.fetchBoardDialog();
    const fetchedAt = new Date();
    const materials = parseBoardDialog(html, fetchedAt);
    if (materials.length === 0) {
      throw new Error("Board dialog parsed to zero materials");
    }
    await this.store.upsertAll(materials);
    this.logger.log(`Upserted ${materials.length} board materials`);
    return materials.length;
  }

  private intervalMs(): number {
    const raw = this.config.get<string>("SYNC_INTERVAL_MS") ?? String(DEFAULT_INTERVAL_MS);
    const intervalMs = Number(raw);
    if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
      throw new Error("SYNC_INTERVAL_MS must be a number of milliseconds >= 1000");
    }
    return intervalMs;
  }

  private logFailure(error: unknown): void {
    this.logger.error(error instanceof Error ? error.stack : String(error));
  }
}
