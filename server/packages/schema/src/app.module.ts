import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SchemaModule } from "./schema.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SchemaModule],
})
export class AppModule {}
