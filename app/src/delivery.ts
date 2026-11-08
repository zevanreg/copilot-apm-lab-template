import type { DeliveryResult, OrderEvent } from "./model.ts";
import type { DispatchStore } from "./store.ts";

export function deliver(event: OrderEvent, store: DispatchStore): DeliveryResult {
  // Keep lookup and creation synchronous for process-local concurrency safety.
  const existing = store.findByEventId(event.eventId);
  if (existing !== undefined) {
    if (
      existing.orderId !== event.orderId ||
      existing.quantity !== event.quantity
    ) {
      return { status: 409, body: { error: "event_conflict" } };
    }
    return {
      status: 200,
      body: { dispatch: existing, replayed: true },
    };
  }
  return {
    status: 201,
    body: { dispatch: store.create(event), replayed: false },
  };
}
