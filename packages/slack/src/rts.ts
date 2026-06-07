export type RtsMessage = {
  content: string; permalink: string; channel_name?: string;
  author_name?: string; message_ts?: string;
};
export type RtsResult = { messages: RtsMessage[] };

export async function searchContext(
  p: { token: string; query: string; limit?: number; actionToken?: string;
       contentTypes?: string[]; },
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<RtsResult> {
  const f = opts.fetchImpl ?? fetch;
  const body = new URLSearchParams();
  body.set("query", p.query);
  if (p.limit) body.set("limit", String(p.limit));
  if (p.actionToken) body.set("action_token", p.actionToken);
  if (p.contentTypes) body.set("content_types", p.contentTypes.join(","));
  const res = await f("https://slack.com/api/assistant.search.context", {
    method: "POST",
    headers: {
      authorization: `Bearer ${p.token}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as any;
  if (!json.ok) throw new Error(json.error || "rts_failed");
  return { messages: (json.results?.messages ?? []) as RtsMessage[] };
}
