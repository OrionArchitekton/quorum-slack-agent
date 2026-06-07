import { searchContext, type RtsMessage } from "@quorum/slack";
import type { Citation } from "@quorum/shared";
import { cfg } from "../env.js";

function toCitations(msgs: RtsMessage[]): Citation[] {
  return msgs.map((m) => ({ title: m.content.slice(0, 80), permalink: m.permalink }));
}

export async function searchRecordsStep(query: string): Promise<{ text: string; sources: Citation[] }> {
  "use step";
  const r = await searchContext({ token: cfg.botToken(),
    query: `in:<#${cfg.logChannel()}> ${query}`, limit: 8 });
  return { text: r.messages.map((m) => m.content).join("\n---\n"), sources: toCitations(r.messages) };
}

export async function searchWorkspaceStep(query: string): Promise<{ text: string; sources: Citation[] }> {
  "use step";
  const r = await searchContext({ token: cfg.userToken(), query, limit: 8 });
  return { text: r.messages.map((m) => m.content).join("\n---\n"), sources: toCitations(r.messages) };
}
