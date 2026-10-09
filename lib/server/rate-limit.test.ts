import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, isRateLimited } from "./rate-limit";

describe("isRateLimited", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("przepuszcza `limit` żądań i blokuje kolejne w tym samym oknie", () => {
    const key = "test:limit";
    const results = Array.from({ length: 4 }, () => isRateLimited(key, 3, 60_000));

    expect(results).toEqual([false, false, false, true]);
  });

  it("resetuje licznik po upływie okna", () => {
    vi.useFakeTimers();
    const key = "test:window";

    isRateLimited(key, 1, 1_000);
    expect(isRateLimited(key, 1, 1_000)).toBe(true);

    vi.advanceTimersByTime(1_001);
    expect(isRateLimited(key, 1, 1_000)).toBe(false);
  });

  it("liczy klucze niezależnie", () => {
    isRateLimited("test:a", 1, 60_000);

    expect(isRateLimited("test:a", 1, 60_000)).toBe(true);
    expect(isRateLimited("test:b", 1, 60_000)).toBe(false);
  });
});

describe("clientIp", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost", { headers });

  it("bierze pierwszy adres z x-forwarded-for", () => {
    expect(clientIp(request({ "x-forwarded-for": " 1.1.1.1 , 2.2.2.2" }))).toBe("1.1.1.1");
  });

  it("w razie braku używa x-real-ip, a potem 'unknown'", () => {
    expect(clientIp(request({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(clientIp(request({}))).toBe("unknown");
  });
});
