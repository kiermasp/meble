import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CuttingOrdersModule } from "./cutting-orders/cutting-orders.module";
import { MaterialsModule } from "./materials/materials.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        url: config.getOrThrow<string>("DATABASE_URL"),
        autoLoadEntities: true,
        synchronize: config.get<string>("TYPEORM_SYNCHRONIZE") !== "false",
      }),
    }),
    MaterialsModule,
    CuttingOrdersModule,
  ],
})
export class AppModule {}
