import { describe, it, expect, vi } from "vitest";
import { searchContext } from "./rts.js";

it("calls assistant.search.context and maps results to citations", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, results: { messages: [
      { content: "we will use postgres", permalink: "https://x/p1", channel_name: "eng" },
    ] } }),
  });
  const out = await searchContext(
    { token: "xoxb-1", query: "database decision", limit: 5 },
    { fetchImpl: fetchMock as any },
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "https://slack.com/api/assistant.search.context",
    expect.objectContaining({ method: "POST" }),
  );
  expect(out.messages[0]?.permalink).toBe("https://x/p1");
});

it("throws on ok:false", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok:false, error:"not_allowed" }) });
  await expect(searchContext({ token:"t", query:"q" }, { fetchImpl: fetchMock as any }))
    .rejects.toThrow("not_allowed");
});
