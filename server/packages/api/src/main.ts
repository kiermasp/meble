import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureHttp } from "./configure-http";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureHttp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
