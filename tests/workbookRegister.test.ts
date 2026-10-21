import { describe, expect, it } from "vitest";

export function sanitizeExternalUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

describe("Document and Workbook Register", () => {
  it("allows safe http/https URLs and rejects unsafe schemes", () => {
    expect(sanitizeExternalUrl("https://docs.google.com/spreadsheets/d/123")).toBe("https://docs.google.com/spreadsheets/d/123");
    expect(sanitizeExternalUrl("http://onedrive.live.com/file")).toBe("http://onedrive.live.com/file");
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(sanitizeExternalUrl("ftp://example.com/file")).toBeNull();
    expect(sanitizeExternalUrl("")).toBeNull();
  });
});
