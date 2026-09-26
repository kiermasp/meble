import { databaseUrlFrom, safeDatabaseMessage } from "./schema.service";

describe("databaseUrlFrom", () => {
  it("uses the local compose database when DATABASE_URL is empty", () => {
    expect(databaseUrlFrom(undefined)).toBe("postgres://meble:meble@127.0.0.1:5432/meble");
    expect(databaseUrlFrom("  ")).toBe("postgres://meble:meble@127.0.0.1:5432/meble");
    expect(databaseUrlFrom("postgres://meble:meble@postgres:5432/meble")).toBe(
      "postgres://meble:meble@postgres:5432/meble",
    );
  });
});

describe("safeDatabaseMessage", () => {
  it("hides a connection string", () => {
    expect(safeDatabaseMessage(new Error("connect postgres://meble:secret@127.0.0.1:5432/meble failed"))).toBe(
      "connect postgres://*** failed",
    );
  });
});
