import { describe, it, expect, vi } from "vitest";
vi.mock("@quorum/slack/rts", async (orig) => {
  const real = await orig<any>();
  return { ...real, searchContext: vi.fn(async (p: any) => ({
    messages: [{ content: "we will use postgres", permalink: "https://x/p1", channel_name: "eng" }],
  })) };
});
import { searchRecordsStep } from "./search.js";

it("searchRecordsStep scopes query to the decision-log channel and returns citations", async () => {
  process.env["DECISION_LOG_CHANNEL_ID"] = "C-LOG";
  process.env["SLACK_USER_TOKEN"] = "xoxp-t";
  const out = await searchRecordsStep("database");
  expect(out.sources[0]?.permalink).toBe("https://x/p1");
});
