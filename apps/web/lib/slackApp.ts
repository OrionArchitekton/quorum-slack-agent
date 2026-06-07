import { App } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";
import { registerListeners } from "./listeners.js";

let _receiver: VercelReceiver | undefined;
let _app: App | undefined;

/**
 * Read an env var via a dynamic key so the bundler cannot statically inline it
 * at build time. `process.env.STATIC_LITERAL` can be replaced with a build-time
 * value (undefined if the build snapshot lacked it); `process.env[variable]` is
 * always a runtime lookup. This is why the token must be read indirectly.
 */
const readEnv = (key: string): string | undefined => process.env[key];

/**
 * Lazily construct the Bolt app + Vercel receiver.
 *
 * Instantiation is deferred (rather than done at module load) because
 * `new VercelReceiver()` throws when `SLACK_SIGNING_SECRET` is absent, which
 * would break `next build`'s page-data collection step. At request time the env
 * var is present. Listeners are registered exactly once on first construction.
 */
export function getSlackApp(): { app: App; receiver: VercelReceiver } {
  if (!_app || !_receiver) {
    // TEMP diagnostic (lengths only, no values): confirm what THIS function sees.
    console.log(
      "[quorum-init] signLen=",
      (readEnv("SLACK_SIGNING_SECRET") ?? "").length,
      "botLen=",
      (readEnv("SLACK_BOT_TOKEN") ?? "").length,
      "keys=",
      Object.keys(process.env).filter((k) => k.startsWith("SLACK_")).join(","),
    );
    _receiver = new VercelReceiver({
      signingSecret: readEnv("SLACK_SIGNING_SECRET")!,
    });
    _app = new App({
      token: readEnv("SLACK_BOT_TOKEN"),
      receiver: _receiver,
    });
    registerListeners(_app);
  }
  return { app: _app, receiver: _receiver };
}
