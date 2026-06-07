export type SlackMcpTools = {
  canvasEdit: (a: { canvas_id: string; markdown: string }) => Promise<any>;
  chatPost: (a: { channel: string; text: string }) => Promise<{ permalink?: string }>;
};

/**
 * Pure orchestration — tools injected so it is unit-testable without network.
 * Carries no `@ai-sdk/mcp` dependency, so it is safe to import from the static
 * module graph that the WDK workflows bundler walks. The actual MCP client
 * (which pulls @ai-sdk/mcp -> pkce-challenge, incompatible with the workflow
 * bundler's resolve conditions) lives in ./mcp-client.ts and is imported
 * dynamically ONLY from inside a "use step" body, where workflow-mode dead-code
 * elimination removes it from the workflows bundle.
 */
export async function fileDecisionViaMcp(
  p: { canvasId: string; channelId: string; canvasMarkdown: string; channelText: string },
  deps: { tools: SlackMcpTools },
): Promise<{ logPermalink?: string }> {
  await deps.tools.canvasEdit({ canvas_id: p.canvasId, markdown: p.canvasMarkdown });
  const posted = await deps.tools.chatPost({ channel: p.channelId, text: p.channelText });
  return { logPermalink: posted.permalink };
}
