import { describe, it, expect } from "vitest";
import { recordToCanvasMarkdown, recordToChannelText } from "./canvas.js";
import type { DecisionRecord } from "./record.js";
const rec: DecisionRecord = { id:"DR-2026-0001", title:"Use Postgres", decision:"We will use Postgres",
  rationale:"Familiarity", participants:["U1","U2"], decidedAt:"2026-06-06T00:00:00.000Z",
  sourcePermalink:"https://x.slack.com/archives/C/p1", status:"accepted", tags:["db","infra"] };

it("canvas markdown contains id, decision, tags and a source link", () => {
  const md = recordToCanvasMarkdown(rec);
  expect(md).toContain("DR-2026-0001");
  expect(md).toContain("We will use Postgres");
  expect(md).toContain("#db");
  expect(md).toContain(rec.sourcePermalink);
});
it("channel text is searchable: includes title, decision, id", () => {
  const t = recordToChannelText(rec);
  expect(t).toContain("Use Postgres");
  expect(t).toContain("DR-2026-0001");
});
