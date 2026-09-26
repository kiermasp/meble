import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HtmlExceptionFilter } from "./html-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.useGlobalFilters(new HtmlExceptionFilter());
  const port = Number(process.env.PORT || 3012);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
