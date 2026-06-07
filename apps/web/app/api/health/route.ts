export const dynamic = "force-dynamic";

export async function GET() {
  // Safe runtime env diagnostic: presence + length only, never values.
  const present = (k: string) => {
    const v = process.env[k];
    return { set: !!v, len: (v ?? "").length };
  };
  return Response.json({
    ok: true,
    service: "quorum",
    ts: new Date().toISOString(),
    env: {
      SLACK_BOT_TOKEN: present("SLACK_BOT_TOKEN"),
      SLACK_USER_TOKEN: present("SLACK_USER_TOKEN"),
      SLACK_SIGNING_SECRET: present("SLACK_SIGNING_SECRET"),
      AI_GATEWAY_API_KEY: present("AI_GATEWAY_API_KEY"),
      DECISION_LOG_CHANNEL_ID: present("DECISION_LOG_CHANNEL_ID"),
      DECISION_LOG_CANVAS_ID: present("DECISION_LOG_CANVAS_ID"),
      QUORUM_NUDGE_CHANNELS: present("QUORUM_NUDGE_CHANNELS"),
    },
  });
}
