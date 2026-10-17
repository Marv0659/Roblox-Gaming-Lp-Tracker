import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatNumber, formatShortDate } from "@/lib/utils";

describe("pinned formatters", () => {
  it("formats numbers the same everywhere", () => {
    expect(formatNumber(18876)).toBe("18,876");
  });

  it("formats dates in the app time zone", () => {
    // 23:30 UTC on 29 Sep is already 30 Sep in Stockholm (UTC+2).
    const d = new Date("2026-09-29T23:30:00Z");
    expect(formatDate(d)).toBe("30-09-2026");
    expect(formatDateTime(d)).toBe("30-09-2026, 01:30");
    expect(formatShortDate(d)).toBe("30 Sep");
  });
});
