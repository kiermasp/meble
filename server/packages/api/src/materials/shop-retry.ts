/** Delay before repeating a shop GET that was rate-limited. Other statuses are not retried here. */
export function shopRetryDelayMs(status: number, retryAfter: string | null, attempt: number): number | null {
  if (status !== 429 && status !== 503) return null;
  const seconds = retryAfter == null ? Number.NaN : Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 120) return Math.max(1_000, seconds * 1_000);
  return Math.min(30_000, 2_000 * 2 ** attempt);
}
