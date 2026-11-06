export interface OrderEvent {
  eventId: string;
  orderId: string;
  quantity: number;
}

export interface Dispatch extends OrderEvent {
  id: string;
}

export type DeliveryResult =
  | {
      status: 200 | 201;
      body: { dispatch: Dispatch; replayed: boolean };
    }
  | {
      status: 409;
      body: { error: "event_conflict" };
    };
