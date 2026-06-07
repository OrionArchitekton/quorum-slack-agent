import type { DecisionRecord } from "./record.js";

export function recordToCanvasMarkdown(r: DecisionRecord): string {
  const tags = r.tags.map((t) => `#${t}`).join(" ");
  const people = r.participants.map((p) => `<@${p}>`).join(", ");
  return [
    `## ${r.title}  \`${r.id}\``,
    `**Decision:** ${r.decision}`,
    `**Why:** ${r.rationale || "_none_"}`,
    `**Who:** ${people || "_n/a_"}  ·  **When:** ${r.decidedAt}`,
    `**Status:** ${r.status}${r.supersedes ? `  ·  supersedes ${r.supersedes}` : ""}`,
    `**Tags:** ${tags || "_none_"}`,
    `[Source thread](${r.sourcePermalink})`,
    "",
  ].join("\n");
}

export function recordToChannelText(r: DecisionRecord): string {
  // Plain, RTS-friendly: keywords inline so assistant.search.context indexes it well.
  return [
    `📌 Decision ${r.id}: ${r.title}`,
    `Decision: ${r.decision}`,
    `Rationale: ${r.rationale}`,
    `Tags: ${r.tags.join(", ")}`,
    `Source: ${r.sourcePermalink}`,
  ].join("\n");
}
