import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LOOKUP_ENTITIES } from "./lookup.rows";
import { LookupsController } from "./lookups.controller";
import { ShopLookupStore } from "./shop-lookup.store";

@Module({
  imports: [TypeOrmModule.forFeature(LOOKUP_ENTITIES)],
  controllers: [LookupsController],
  providers: [ShopLookupStore],
  exports: [ShopLookupStore],
})
export class LookupsModule {}
