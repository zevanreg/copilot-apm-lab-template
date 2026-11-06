---
description: "Use when implementing or testing Northstar webhook deliveries, duplicate events, or event identifier conflicts."
applyTo: "app/**/*.ts"
---
# Webhook delivery rules

- Validate the request before changing any in-memory state.
- An event identifier identifies one normalized business payload.
- A new event creates exactly one dispatch and returns HTTP 201.
- An identical repeat returns HTTP 200 and the original dispatch.
- Reusing an identifier with a different order or quantity returns HTTP 409.
- Invalid payloads return HTTP 400 without creating a dispatch or claiming the identifier.
- Preserve the health endpoint and the existing JSON response envelope.
- State is intentionally process-local. Do not claim durability or distributed exactly-once delivery.
- Run `npm run test:baseline` and `npm run test:acceptance` before claiming the task is complete.
