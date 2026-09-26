import { Module } from "@nestjs/common";
import { CatalogClient } from "./catalog.client";
import { WarehouseController } from "./warehouse.controller";

@Module({
  controllers: [WarehouseController],
  providers: [CatalogClient],
})
export class WarehouseModule {}
