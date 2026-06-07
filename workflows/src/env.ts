export const cfg = {
  fakeLlm: () => process.env["QUORUM_FAKE_LLM"] === "1",
  // Gateway model ids (AI SDK resolves via Vercel AI Gateway when AI_GATEWAY_API_KEY is set).
  // Used as strings BOTH by generateObject (steps) AND DurableAgent (qa-agent) — one consistent path.
  model: () => process.env["QUORUM_MODEL"] ?? "anthropic/claude-sonnet-4.5",
  classifierModel: () => process.env["QUORUM_CLASSIFIER_MODEL"] ?? "anthropic/claude-haiku-4.5",
  botToken: () => req("SLACK_BOT_TOKEN"),
  userToken: () => req("SLACK_USER_TOKEN"),
  logChannel: () => req("DECISION_LOG_CHANNEL_ID"),
  logCanvas: () => req("DECISION_LOG_CANVAS_ID"),
};
function req(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`missing env ${k}`);
  return v;
}
