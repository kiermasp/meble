import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EdgebandRow } from "./edgeband.row";
import { EdgebandStore } from "./edgeband.store";
import { EdgebandsController } from "./edgebands.controller";

@Module({
  imports: [TypeOrmModule.forFeature([EdgebandRow])],
  controllers: [EdgebandsController],
  providers: [EdgebandStore],
  exports: [EdgebandStore],
})
export class EdgebandsModule {}
