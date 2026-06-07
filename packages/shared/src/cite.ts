export type Citation = { title: string; permalink: string };

export function formatCitations(sources: Citation[]): string {
  const seen = new Map<string, Citation>();
  for (const s of sources) if (!seen.has(s.permalink)) seen.set(s.permalink, s);
  const uniq = [...seen.values()];
  if (uniq.length === 0) return "";
  const lines = uniq.map((s, i) => `[${i + 1}] <${s.permalink}|${s.title}>`);
  return `\n\n*Sources:*\n${lines.join("\n")}`;
}
