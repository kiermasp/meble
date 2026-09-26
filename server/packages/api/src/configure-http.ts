import { BadRequestException, ValidationPipe, type INestApplication } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { json } from "express";
import { JsonExceptionFilter, jsonBodyError, jsonOnly } from "./json-only";

function validationMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    for (const message of Object.values(error.constraints ?? {})) {
      messages.push(message.replace(/^property (\S+) should not exist$/, "Pole $1 nie jest dozwolone."));
    }
    if (error.children?.length) messages.push(...validationMessages(error.children));
  }
  return messages;
}

export function configureHttp(app: INestApplication): void {
  app.enableCors();
  app.use(jsonOnly);
  app.use(json({ type: "application/json" }));
  app.use(jsonBodyError);
  app.useGlobalFilters(new JsonExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => new BadRequestException(validationMessages(errors)),
    }),
  );
}
