import type { DeliveryResult, OrderEvent } from "./model.ts";
import type { DispatchStore } from "./store.ts";

export function deliver(event: OrderEvent, store: DispatchStore): DeliveryResult {
  // Deliberate learner task: this starter creates another dispatch on every delivery.
  return {
    status: 201,
    body: { dispatch: store.create(event), replayed: false },
  };
}
