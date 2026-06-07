// env setup MUST precede all workspace imports so the fake-LLM path is active
// from the moment modules initialise (ESM hoists imports above plain statements,
// but cfg reads process.env at call time — and steps read it at call time too).
process.env["QUORUM_FAKE_LLM"] = "1";

import { describe, it, expect } from "vitest";
import { start, resumeHook, getRun } from "workflow/api";
import { waitForHook, waitForSleep } from "@workflow/vitest";
import { captureWorkflow } from "./capture.js";

describe("captureWorkflow pause/resume integration", () => {
  it("captures, suspends at the hook, and files on approve", async () => {
    const run = await start(captureWorkflow, [
      { channel: "C1", threadTs: "999.9", seq: 1, year: 2026 },
    ]);
    // Proves the durable-HITL claim: the run actually suspended waiting for the hook.
    await waitForHook(run, { token: "approve:C1:999.9" });
    await resumeHook("approve:C1:999.9", { action: "approve", userId: "U1" });
    const out = await run.returnValue;
    expect(out.status).toBe("filed");
    expect(out.id).toBe("DR-2026-0001");
    expect(out.logPermalink).toContain("DR-2026-0001");
  });

  it("expires the approval after the 7-day timeout (sleep branch wins the race)", async () => {
    const run = await start(captureWorkflow, [
      { channel: "C2", threadTs: "888.8", seq: 2, year: 2026 },
    ]);
    await waitForHook(run, { token: "approve:C2:888.8" });
    // Skip the 7d sleep instead of resuming the hook → expiry branch.
    const sleepId = await waitForSleep(run);
    await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });
    const out = await run.returnValue;
    expect(out.status).toBe("expire");
  });
});
