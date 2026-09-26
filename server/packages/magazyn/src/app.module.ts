import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WarehouseModule } from "./warehouse.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), WarehouseModule],
})
export class AppModule {}
