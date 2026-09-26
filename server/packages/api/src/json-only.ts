import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const JSON_MEDIA_TYPE = /^application\/json$/i;

export function isJsonContentType(header: string | undefined): boolean {
  if (header == null || header.trim() === "") return false;
  const mediaType = header.split(",")[0]?.split(";")[0]?.trim() ?? "";
  return JSON_MEDIA_TYPE.test(mediaType);
}

export function jsonOnly(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["content-type"];
  const contentType = Array.isArray(header) ? header[0] : header;
  const length = Number(req.headers["content-length"] ?? 0);
  const hasBody = Number.isFinite(length) && length > 0;

  if ((contentType != null && contentType !== "") || hasBody) {
    if (!isJsonContentType(contentType)) {
      res.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).type("application/json").json({
        statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        error: "Unsupported Media Type",
        message: "Content-Type must be application/json",
      });
      return;
    }
  }

  res.type("application/json");
  next();
}

export function jsonBodyError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(HttpStatus.BAD_REQUEST).type("application/json").json({
      statusCode: HttpStatus.BAD_REQUEST,
      error: "Bad Request",
      message: "Request body must be valid JSON",
    });
    return;
  }
  next(error);
}

@Catch()
export class JsonExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined;
    const body =
      raw != null && typeof raw === "object"
        ? raw
        : {
            statusCode: status,
            message:
              typeof raw === "string"
                ? raw
                : exception instanceof Error
                  ? exception.message
                  : "Internal server error",
          };
    response.status(status).type("application/json").json(body);
  }
}
