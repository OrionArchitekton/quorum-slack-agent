import { App } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";
import { registerListeners } from "./listeners.js";

let _receiver: VercelReceiver | undefined;
let _app: App | undefined;

/**
 * Read an env var via a dynamic key so the bundler cannot statically inline it.
 */
const readEnv = (key: string): string | undefined => process.env[key];

/**
 * Lazily construct the Bolt app + Vercel receiver.
 *
 * Deferred (not at module load) because `new VercelReceiver()` throws without
 * `SLACK_SIGNING_SECRET`, which would break `next build`'s page-data collection.
 *
 * `deferInitialization: true` is REQUIRED: `@vercel/slack-bolt` calls `app.init()`
 * itself. Without defer mode, Bolt's constructor initializes authorize immediately
 * but never stores `argToken`; the receiver's later `app.init()` then re-runs auth
 * with `argToken === undefined` and throws "you have not provided a token or
 * authorize" — even though a token was passed. Defer mode stores `argToken` so the
 * receiver-driven init succeeds.
 */
export function getSlackApp(): { app: App; receiver: VercelReceiver } {
  if (!_app || !_receiver) {
    _receiver = new VercelReceiver({
      signingSecret: readEnv("SLACK_SIGNING_SECRET")!,
    });
    _app = new App({
      token: readEnv("SLACK_BOT_TOKEN"),
      receiver: _receiver,
      deferInitialization: true,
    });
    registerListeners(_app);
  }
  return { app: _app, receiver: _receiver };
}
