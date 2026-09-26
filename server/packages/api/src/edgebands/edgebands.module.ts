import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LookupsModule } from "../lookups/lookups.module";
import { EdgebandRow } from "./edgeband.row";
import { EdgebandStore } from "./edgeband.store";
import { EdgebandsController } from "./edgebands.controller";

@Module({
  imports: [TypeOrmModule.forFeature([EdgebandRow]), LookupsModule],
  controllers: [EdgebandsController],
  providers: [EdgebandStore],
  exports: [EdgebandStore],
})
export class EdgebandsModule {}
