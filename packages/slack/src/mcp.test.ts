import { describe, it, expect, vi } from "vitest";
import { fileDecisionViaMcp } from "./mcp.js";

it("appends to canvas and posts to the log channel via injected tools", async () => {
  const calls: any[] = [];
  const fakeTools = {
    canvasEdit: vi.fn(async (a: any) => { calls.push(["canvas", a]); return { ok: true }; }),
    chatPost:   vi.fn(async (a: any) => { calls.push(["post", a]); return { ok: true, permalink: "https://x/log1" }; }),
  };
  const out = await fileDecisionViaMcp(
    { canvasId: "F1", channelId: "C1", canvasMarkdown: "## hi", channelText: "Decision DR-1" },
    { tools: fakeTools as any },
  );
  expect(fakeTools.canvasEdit).toHaveBeenCalled();
  expect(fakeTools.chatPost).toHaveBeenCalled();
  expect(out.logPermalink).toBe("https://x/log1");
});
