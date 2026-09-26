import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EdgebandsModule } from "../edgebands/edgebands.module";
import { CuttingOrdersController } from "./cutting-orders.controller";
import { CUTTING_ORDER_ENTITIES } from "./cutting-order.rows";
import { CuttingOrderStore } from "./cutting-order.store";

@Module({
  imports: [EdgebandsModule, TypeOrmModule.forFeature([...CUTTING_ORDER_ENTITIES])],
  controllers: [CuttingOrdersController],
  providers: [CuttingOrderStore],
})
export class CuttingOrdersModule {}
