import { describe, it, expect } from "vitest";
import { escapeHtml, fmtKc, fmtNum } from "../format";

describe("escapeHtml", () => {
  it("escapuje &, <, >, uvozovky", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });
  it("escapuje img onerror injection", () => {
    const payload = '<img src=x onerror="fetch(1)">';
    const out = escapeHtml(payload);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });
  it("normální text projde beze změny", () => {
    expect(escapeHtml("Jan Novák")).toBe("Jan Novák");
  });
  it("null/undefined nespadne", () => {
    expect(escapeHtml(undefined as unknown as string)).toBe("");
    expect(escapeHtml(null as unknown as string)).toBe("");
  });
});

describe("fmtKc / fmtNum (regresní)", () => {
  it("fmtKc formátuje v Kč", () => {
    expect(fmtKc(12345)).toContain("12");
    expect(fmtKc(12345)).toContain("Kč");
  });
  it("fmtNum formátuje bez měny", () => {
    expect(fmtNum(12345)).not.toContain("Kč");
  });
});
