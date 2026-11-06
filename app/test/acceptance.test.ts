import assert from "node:assert/strict";
import test from "node:test";
import { dispatch, event, postEvent, startTestApp } from "./support.ts";

test("identical replay returns 200 with the original dispatch and no new mutation", async (t) => {
  const base = await startTestApp(t);
  assert.equal((await postEvent(base, event)).status, 201);
  const repeated = await postEvent(base, event);
  assert.equal(repeated.status, 200);
  assert.deepEqual(await repeated.json(), { dispatch, replayed: true });
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [dispatch] });
});

for (const changed of [{ orderId: "other-order" }, { quantity: 3 }]) {
  test(`conflicting ${Object.keys(changed)[0]} returns 409 and preserves the original event`, async (t) => {
    const base = await startTestApp(t);
    assert.equal((await postEvent(base, event)).status, 201);
    const conflict = await postEvent(base, { ...event, ...changed });
    assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), { error: "event_conflict" });
    const replay = await postEvent(base, event);
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), { dispatch, replayed: true });
    assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [dispatch] });
  });
}

test("property order and identifier whitespace do not change event identity", async (t) => {
  const base = await startTestApp(t);
  await postEvent(base, event);
  const replay = await postEvent(base, {
    quantity: 2,
    orderId: " order-500 ",
    eventId: " evt-100 ",
  });
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { dispatch, replayed: true });
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [dispatch] });
});

test("invalid input does not reserve the event identifier", async (t) => {
  const base = await startTestApp(t);
  assert.equal((await postEvent(base, { ...event, quantity: 0 })).status, 400);
  assert.equal((await postEvent(base, event)).status, 201);
  const replay = await postEvent(base, event);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { dispatch, replayed: true });
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [dispatch] });
});

test("concurrent identical requests create exactly one dispatch in one process", async (t) => {
  const base = await startTestApp(t);
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => postEvent(base, event)),
  );
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 200, 200, 200, 200, 200, 200, 201],
  );
  for (const response of responses) {
    assert.deepEqual(await response.json(), {
      dispatch,
      replayed: response.status === 200,
    });
  }
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), { dispatches: [dispatch] });
});

test("different event identifiers create separate dispatches for the same order", async (t) => {
  const base = await startTestApp(t);
  assert.equal((await postEvent(base, event)).status, 201);
  const next = { ...event, eventId: "evt-101" };
  assert.equal((await postEvent(base, next)).status, 201);
  assert.deepEqual(await (await fetch(`${base}/dispatches`)).json(), {
    dispatches: [dispatch, { id: "dispatch-2", ...next }],
  });
});
