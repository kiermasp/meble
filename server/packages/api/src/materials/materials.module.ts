import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EdgebandsModule } from "../edgebands/edgebands.module";
import { LookupsModule } from "../lookups/lookups.module";
import { HealthController } from "../health.controller";
import { CatalogSyncService } from "./catalog-sync.service";
import { MaterialStore } from "./material-store";
import { MaterialCollectionStatusRow, MaterialRow } from "./material.row";
import { MaterialsController } from "./materials.controller";
import { MebleCatalogClient } from "./meble-catalog.client";

@Module({
  imports: [TypeOrmModule.forFeature([MaterialRow, MaterialCollectionStatusRow]), LookupsModule, EdgebandsModule],
  controllers: [MaterialsController, HealthController],
  providers: [MaterialStore, MebleCatalogClient, CatalogSyncService],
})
export class MaterialsModule {}
