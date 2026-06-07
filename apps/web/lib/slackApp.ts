import { App } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";
import { registerListeners } from "./listeners.js";

let _receiver: VercelReceiver | undefined;
let _app: App | undefined;

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
    _receiver = new VercelReceiver({
      signingSecret: process.env["SLACK_SIGNING_SECRET"]!,
    });
    _app = new App({
      token: process.env["SLACK_BOT_TOKEN"],
      receiver: _receiver,
    });
    registerListeners(_app);
  }
  return { app: _app, receiver: _receiver };
}
