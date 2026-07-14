# Notification & Event Engine: Documentation & Technical Debt

## DST Edge Cases
**No implementation required at this stage.**
`quietHoursStart` and `quietHoursEnd` are stored as SQL `TIME` alongside a `timezone` string. Evaluating whether the *current server time* falls into the user's quiet hours requires robust timezone math. Specifically, Daylight Saving Time (DST) transitions mean the offset from UTC changes twice a year for many users. Application-layer logic must resolve the user's local wall-clock time dynamically before determining if a notification should be queued or instantly delivered.

## Technical Debt Entries

### 1. GDPR Crypto Shredding (Payload Scrubbing)
**Status:** Deferred
**Description:** The `events` table acts as an immutable append-only Event Store. Event payloads (`JSONB`) may inadvertently capture Personally Identifiable Information (PII) embedded in the event data by upstream business modules. Because we cannot execute SQL `DELETE` or `UPDATE` on the `events` table (to preserve cryptographic/ledger immutability), we cannot natively comply with GDPR "Right to be Forgotten" requests.
**Proposed Future Fix:** Implement Crypto Shredding (encrypting the PII payload with a per-user key and deleting the key upon GDPR request) or a payload scrubbing sidecar process.

### 2. External Queue Migration
**Status:** Deferred
**Description:** The current `notification_queue` uses a PostgreSQL table-based queue with polling. Under high load (thousands of events per second), this will cause significant database contention and degraded read/write performance across the entire OS.
**Proposed Future Fix:** Migrate to the abstracted `INotificationQueue` using Amazon SQS, Apache Kafka, Redis, or Upstash Kafka. The `DatabaseNotificationQueue` should be deprecated once traffic scales beyond early production.
