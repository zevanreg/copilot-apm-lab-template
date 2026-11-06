import type { Dispatch, OrderEvent } from "./model.ts";

export class DispatchStore {
  readonly #dispatches: Dispatch[] = [];

  create(event: OrderEvent): Dispatch {
    const dispatch: Dispatch = {
      id: `dispatch-${this.#dispatches.length + 1}`,
      ...event,
    };
    this.#dispatches.push(dispatch);
    return { ...dispatch };
  }

  findByEventId(eventId: string): Dispatch | undefined {
    const dispatch = this.#dispatches.find((item) => item.eventId === eventId);
    return dispatch === undefined ? undefined : { ...dispatch };
  }

  list(): Dispatch[] {
    return this.#dispatches.map((dispatch) => ({ ...dispatch }));
  }
}
