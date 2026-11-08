# Northstar order webhook API

A loopback-only, process-local HTTP API used to evaluate a Copilot package's
guidance against observable behavior.

## Run from the repository root

```powershell
npm start
```

Default address: `http://127.0.0.1:3000`.
`PORT` may be an integer from 1 through 65535; invalid values fail explicitly.
Stop your own foreground process with Ctrl+C.

```powershell
npm run typecheck
npm run build
npm run test:baseline
npm run test:acceptance
```

The baseline and acceptance suites pass with the delivery fix from
[Lab 2](../labs/02-consume.md).

## Endpoints

| Endpoint | Behavior |
|---|---|
| `GET /health` | 200 with `{ "status": "ok" }`. |
| `GET /dispatches` | 200 with `{ "dispatches": [...] }`. |
| `POST /webhooks/orders` | Validates and processes an order event. |

Accepted event:

```json
{ "eventId": "evt-100", "orderId": "order-500", "quantity": 2 }
```

Identifiers are trimmed, nonempty strings with a maximum length of 100.
Quantity is an integer from 1 through 100. Unknown keys are rejected.
The JSON body limit is 16 KiB. Non-JSON media types receive 415; malformed JSON
or invalid payloads receive 400. Oversized bodies receive 413.

The complete required first/replay/conflict contract is in the package's
[delivery reference](../packages/webhook-playbook/.apm/skills/webhook-change/references/delivery-contract.md).

## Deliberate task and limits

The [delivery function](src/delivery.ts) creates one dispatch for a first valid
event (201), returns the original dispatch for an identical normalized replay
(200), and rejects a reused event identifier with a different order or quantity
(409) without mutation. Validation runs before delivery, so invalid input does
not reserve an identifier. Lookup and creation are synchronous, preventing
concurrent identical requests in one process from creating duplicate dispatches.

There is no persistence, authentication, signature verification, cross-process
coordination, or production logging stack. Restarting clears all dispatches.
The observation endpoint is for workshop assertions only.
