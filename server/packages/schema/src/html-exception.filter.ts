import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class HtmlExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (request.path === "/schema") {
      response.status(status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : status).type("application/json").send({
        error: status === HttpStatus.BAD_REQUEST ? "bad_request" : "schema_unavailable",
      });
      return;
    }
    const message = status >= 500 ? "Nie udało się odczytać schematu bazy." : "Nieprawidłowe żądanie.";
    response
      .status(status)
      .type("html")
      .send(
        `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><title>Schemat bazy</title></head><body><p>${message}</p></body></html>`,
      );
  }
}
