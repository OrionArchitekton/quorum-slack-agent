import { describe, it, expect } from "vitest";
import { formatCitations } from "./cite.js";

it("formats numbered citations with permalinks and dedupes", () => {
  const out = formatCitations([
    { title: "Use Postgres", permalink: "https://x/p1" },
    { title: "Use Postgres", permalink: "https://x/p1" }, // dupe
    { title: "Auth via OIDC", permalink: "https://x/p2" },
  ]);
  expect(out).toContain("[1]");
  expect(out).toContain("<https://x/p1|Use Postgres>");
  expect(out).toContain("[2]");
  expect((out.match(/\[\d+\]/g) || []).length).toBe(2); // deduped to 2
});
it("returns empty string for no sources", () => {
  expect(formatCitations([])).toBe("");
});
