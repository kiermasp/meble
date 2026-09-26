import { HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import { jsonBodyError, jsonOnly } from "./json-only";

function response(): Response & { statusCode: number; body: unknown; contentType?: string } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    contentType: undefined as string | undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    type(contentType: string) {
      this.contentType = contentType;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: unknown; contentType?: string };
}

describe("jsonOnly", () => {
  it("lets a JSON request through and marks the response as JSON", () => {
    const res = response();
    const next = jest.fn();
    jsonOnly(
      { headers: { "content-type": "application/json; charset=utf-8", "content-length": "2" } } as Request,
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
    expect(res.contentType).toBe("application/json");
  });

  it("rejects a non-JSON content type with a JSON error", () => {
    const res = response();
    const next = jest.fn();
    jsonOnly(
      { headers: { "content-type": "text/plain", "content-length": "2" } } as Request,
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    expect(res.contentType).toBe("application/json");
    expect(res.body).toMatchObject({ statusCode: 415, message: "Content-Type must be application/json" });
  });

  it("rejects a body that is not labeled as JSON", () => {
    const res = response();
    jsonOnly({ headers: { "content-length": "4" } } as Request, res, jest.fn());
    expect(res.statusCode).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
  });

  it("allows GET requests that send no body", () => {
    const res = response();
    const next = jest.fn();
    jsonOnly({ headers: {} } as Request, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("turns invalid JSON into a JSON error", () => {
    const res = response();
    const next = jest.fn();
    const error = new SyntaxError("Unexpected token");
    Object.assign(error, { body: true });
    jsonBodyError(error, {} as Request, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body).toMatchObject({ message: "Request body must be valid JSON" });
  });
});
