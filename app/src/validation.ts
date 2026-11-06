import type { OrderEvent } from "./model.ts";

export function validateEvent(input: unknown): OrderEvent | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }
  if (
    Object.keys(input).some(
      (key) => key !== "eventId" && key !== "orderId" && key !== "quantity",
    ) ||
    !("eventId" in input) ||
    !("orderId" in input) ||
    !("quantity" in input)
  ) {
    return undefined;
  }
  const { eventId, orderId, quantity } = input;
  if (
    typeof eventId !== "string" ||
    typeof orderId !== "string" ||
    typeof quantity !== "number" ||
    !Number.isInteger(quantity)
  ) {
    return undefined;
  }
  const normalizedEventId = eventId.trim();
  const normalizedOrderId = orderId.trim();
  if (
    normalizedEventId.length === 0 ||
    normalizedEventId.length > 100 ||
    normalizedOrderId.length === 0 ||
    normalizedOrderId.length > 100 ||
    quantity < 1 ||
    quantity > 100
  ) {
    return undefined;
  }
  return {
    eventId: normalizedEventId,
    orderId: normalizedOrderId,
    quantity,
  };
}
