import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class HtmlExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = status === HttpStatus.BAD_REQUEST ? "Nieprawidłowe filtry." : "Coś poszło nie tak.";
    response
      .status(status)
      .type("html")
      .send(
        `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><title>Magazyn</title></head><body><p>${message}</p></body></html>`,
      );
  }
}
