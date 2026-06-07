import { describe, it, expect, vi } from "vitest";
import { fileRecordCore } from "./file.js";
import type { DecisionRecord } from "@quorum/shared";

const rec: DecisionRecord = { id:"DR-2026-0001", title:"Use Postgres", decision:"We will use Postgres",
  rationale:"x", participants:["U1"], decidedAt:"2026-06-06T00:00:00.000Z",
  sourcePermalink:"https://x/p1", status:"accepted", tags:["db"] };

it("files via MCP adapter and returns the log permalink", async () => {
  const tools = { canvasEdit: vi.fn(async()=>({ok:true})), chatPost: vi.fn(async()=>({permalink:"https://x/log"})) };
  const out = await fileRecordCore(rec, { canvasId:"F1", channelId:"C1", tools });
  expect(tools.canvasEdit).toHaveBeenCalled();
  expect(out.logPermalink).toBe("https://x/log");
});
