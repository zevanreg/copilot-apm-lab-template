# Northstar delivery contract

Endpoint: `POST /webhooks/orders`

Request:

```json
{
  "eventId": "evt-100",
  "orderId": "order-500",
  "quantity": 2
}
```

The only accepted keys are `eventId`, `orderId`, and `quantity`. Identifiers are
trimmed, nonempty strings of at most 100 characters. Quantity is an integer from
1 through 100. Unknown keys are rejected. Object property order and surrounding
identifier whitespace are not business differences.

| Condition | Status | Body |
|---|---|---|
| First valid event | 201 | `{ "dispatch": { "id": "dispatch-1", "eventId": "evt-100", "orderId": "order-500", "quantity": 2 }, "replayed": false }` |
| Same normalized event again | 200 | The original dispatch, with `replayed: true` |
| Same event identifier, different order or quantity | 409 | `{ "error": "event_conflict" }` |
| Invalid JSON or invalid payload | 400 | `{ "error": "invalid_payload" }` |
| Body larger than 16 KiB | 413 | `{ "error": "payload_too_large" }` |
| Non-JSON content type on the webhook endpoint | 415 | `{ "error": "unsupported_media_type" }` |

`GET /health` returns `{ "status": "ok" }`. `GET /dispatches` returns
`{ "dispatches": [...] }` and is a lab observation endpoint, not a production API.

Validate before creating a dispatch or reserving an event identifier. Conflicts
must not overwrite the original event. A later replay must still return the
original dispatch. Two concurrent identical deliveries in one process must not
produce two dispatches.

Everything is in memory and resets when the process restarts. Multi-process
coordination, persistence, authentication, and webhook signature verification
are explicitly outside this workshop's application scope.
