import assert from "node:assert/strict";
import test from "node:test";
import { DispatchStore } from "../src/store.ts";
import { validateEvent } from "../src/validation.ts";
import { dispatch, event, postEvent, startTestApp } from "./support.ts";

test("health and initial dispatch list retain their response envelopes", async (t) => {
  const base = await startTestApp(t);
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.match(health.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await health.json(), { status: "ok" });
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), {
    dispatches: [],
  });
});

test("a first valid delivery returns 201 and creates one dispatch", async (t) => {
  const base = await startTestApp(t);
  const response = await postEvent(base, event);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { dispatch, replayed: false });
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), {
    dispatches: [dispatch],
  });
});

test("identifiers are normalized before dispatch creation", async (t) => {
  const base = await startTestApp(t);
  const response = await postEvent(base, {
    eventId: " evt-100 ",
    orderId: " order-500 ",
    quantity: 2,
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { dispatch, replayed: false });
});

test("unknown paths and unsupported methods are explicit", async (t) => {
  const base = await startTestApp(t);
  const missing = await fetch(`${base}/missing`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "not_found" });
  const method = await fetch(`${base}/webhooks/orders`);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "POST");
  assert.deepEqual(await method.json(), { error: "method_not_allowed" });
});

test("non-JSON media types are rejected without mutation", async (t) => {
  const base = await startTestApp(t);
  const response = await fetch(`${base}/webhooks/orders`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify(event),
  });
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "unsupported_media_type" });
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [] });
});

test("malformed JSON is rejected without mutation", async (t) => {
  const base = await startTestApp(t);
  const response = await fetch(`${base}/webhooks/orders`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_payload" });
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [] });
});

test("bodies exceeding 16 KiB receive 413 without mutation", async (t) => {
  const base = await startTestApp(t);
  const response = await postEvent(base, { ...event, extra: "x".repeat(17 * 1024) });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "payload_too_large" });
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [] });
});

test("invalid payload shapes and values receive 400 without mutation", async (t) => {
  const base = await startTestApp(t);
  const invalid = [
    null,
    [],
    {},
    { ...event, extra: true },
    { ...event, quantity: 0 },
    { ...event, quantity: 101 },
    { ...event, quantity: 1.5 },
    { ...event, quantity: "2" },
    { ...event, eventId: " " },
    { ...event, eventId: "e".repeat(101) },
    { ...event, orderId: 10 },
    { ...event, orderId: "o".repeat(101) },
  ];
  for (const payload of invalid) {
    const response = await postEvent(base, payload);
    assert.equal(response.status, 400, JSON.stringify(payload));
    assert.deepEqual(await response.json(), { error: "invalid_payload" });
  }
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [] });
});

test("validation returns a normalized independent business value", () => {
  assert.deepEqual(
    validateEvent({ eventId: " e ", orderId: " o ", quantity: 100 }),
    { eventId: "e", orderId: "o", quantity: 100 },
  );
  assert.equal(validateEvent({ eventId: "e", orderId: "o" }), undefined);
});

test("the store does not expose mutable references to its records", () => {
  const store = new DispatchStore();
  store.create(event).quantity = 99;
  const found = store.findByEventId(event.eventId);
  assert.ok(found);
  found.quantity = 98;
  const listed = store.list();
  assert.ok(listed[0]);
  listed[0].quantity = 97;
  listed.push({ ...dispatch, id: "fake" });
  assert.deepEqual(store.list(), [dispatch]);
});
