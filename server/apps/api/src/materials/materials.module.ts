import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthController } from "../health.controller";
import { CatalogSyncService } from "./catalog-sync.service";
import { MaterialStore } from "./material-store";
import { MaterialRow } from "./material.row";
import { MaterialsController } from "./materials.controller";
import { MebleCatalogClient } from "./meble-catalog.client";

@Module({
  imports: [TypeOrmModule.forFeature([MaterialRow])],
  controllers: [MaterialsController, HealthController],
  providers: [MaterialStore, MebleCatalogClient, CatalogSyncService],
})
export class MaterialsModule {}
