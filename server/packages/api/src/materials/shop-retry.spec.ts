import { shopRetryDelayMs } from "./shop-retry";

describe("shopRetryDelayMs", () => {
  it("waits on the shop Retry-After header for 429", () => {
    expect(shopRetryDelayMs(429, "8", 0)).toBe(8_000);
  });

  it("backs off when the shop omits Retry-After", () => {
    expect(shopRetryDelayMs(503, null, 0)).toBe(2_000);
    expect(shopRetryDelayMs(429, null, 2)).toBe(8_000);
    expect(shopRetryDelayMs(429, null, 8)).toBe(30_000);
  });

  it("does not treat a normal response as a retry", () => {
    expect(shopRetryDelayMs(200, null, 0)).toBeNull();
    expect(shopRetryDelayMs(404, "5", 0)).toBeNull();
  });
});
