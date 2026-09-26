import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "./app.module";
import { JsonExceptionFilter, jsonBodyError, jsonOnly } from "./json-only";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(jsonOnly);
  app.use(json({ type: "application/json" }));
  app.use(jsonBodyError);
  app.useGlobalFilters(new JsonExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
