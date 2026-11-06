import type { TestContext } from "node:test";
import { once } from "node:events";
import { createApp } from "../src/server.ts";

export async function startTestApp(context: TestContext): Promise<string> {
  const app = createApp();
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  context.after(
    () =>
      new Promise<void>((resolve, reject) => {
        app.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  const address = app.address();
  if (address === null || typeof address === "string") {
    throw new Error("The test API did not receive a TCP address.");
  }
  return `http://127.0.0.1:${address.port}`;
}

export function postEvent(base: string, value: unknown): Promise<Response> {
  return fetch(`${base}/webhooks/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}

export const event = { eventId: "evt-100", orderId: "order-500", quantity: 2 };
export const dispatch = { id: "dispatch-1", ...event };
