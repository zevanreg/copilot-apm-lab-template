import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { deliver } from "./delivery.ts";
import { DispatchStore } from "./store.ts";
import { validateEvent } from "./validation.ts";

const maximumBodyBytes = 16 * 1024;
type JsonBody =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: string };

async function readJson(request: IncomingMessage): Promise<JsonBody> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes <= maximumBodyBytes) {
      chunks.push(buffer);
    }
  }
  if (bytes > maximumBodyBytes) {
    return { ok: false, status: 413, error: "payload_too_large" };
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return { ok: true, value };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, status: 400, error: "invalid_payload" };
    }
    throw error;
  }
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  store: DispatchStore,
): Promise<void> {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (request.method === "GET" && pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }
  if (request.method === "GET" && pathname === "/dispatches") {
    sendJson(response, 200, { dispatches: store.list() });
    return;
  }
  if (pathname !== "/webhooks/orders") {
    sendJson(response, 404, { error: "not_found" });
    return;
  }
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }
  const mediaType = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    request.resume();
    sendJson(response, 415, { error: "unsupported_media_type" });
    return;
  }
  const parsed = await readJson(request);
  if (!parsed.ok) {
    sendJson(response, parsed.status, { error: parsed.error });
    return;
  }
  const event = validateEvent(parsed.value);
  if (event === undefined) {
    sendJson(response, 400, { error: "invalid_payload" });
    return;
  }
  const result = deliver(event, store);
  sendJson(response, result.status, result.body);
}

export function createApp(store = new DispatchStore()) {
  return createServer((request, response) => {
    void handleRequest(request, response, store).catch((error: unknown) => {
      console.error("Unhandled webhook request failure:", error);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "internal_error" });
      } else {
        response.destroy(error instanceof Error ? error : undefined);
      }
    });
  });
}
