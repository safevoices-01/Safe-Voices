# feat-0017: Retention and cleanup jobs

## Summary

Safe Voices must **expire stale case data** and **reclaim orphaned upload objects** to meet privacy commitments and control storage cost. This feature defines two **scheduled background jobs** implemented as stubs in `@safevoices/prisma`:

1. **Retention purge** (`runRetentionPurge`) — delete or anonymize cases past policy retention, **never** when `legalHold=true`.
2. **Orphan upload cleanup** (`cleanupOrphanUploads`) — remove storage files not referenced in `CaseMessage.attachments` after a grace period (documented as one hour).

Jobs are **not wired to cron** in-repo; operators schedule them in deployment (Kubernetes CronJob, GitHub Actions schedule, Supabase cron, etc.). Implementation is deferred until production Postgres, legal retention policy, and Supabase Storage are live.

Complements [feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md) (attachments), [feat-0011](../feat-0011-data-layer/PRODUCT.md) (`Case` model), and [feat-0020](../feat-0020-ci-deployment/PRODUCT.md) (no deploy workflow ships cron).

## Problem

Reporter data and uploaded evidence accumulate indefinitely without automated lifecycle rules. Orphaned blobs (failed uploads, abandoned presign flows) waste storage and may retain content outside case records. Product and compliance need explicit jobs, hold rules, and audit expectations before enabling purge in production.

## Non-goals

- Real-time deletion on reporter "delete my data" self-service (future feature).
- Investigator-initiated delete UI ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md) stub).
- Email notifications before purge.
- Implementing cron manifests in this repo (no `deploy.yml`, no Docker).
- Purging in-memory dev store (jobs target persistent DB + storage).

## Actors

| Actor | Description |
|-------|-------------|
| **Platform operator** | Schedules jobs, monitors counts (`purged`, `removed`), alerts on failures. |
| **Legal / compliance** | Sets retention windows and legal-hold process. |
| **Reporter** | Unaffected at runtime until retention policy applies to their case age/status. |
| **System** | Runs `runRetentionPurge` and `cleanupOrphanUploads` on a schedule. |

## Data rules (product)

### Retention purge

| Rule | Behavior |
|------|----------|
| Legal hold | Cases with `legalHold === true` are **skipped** entirely. |
| Eligible cases | **TBD** — typically `CLOSED` or `RESOLVED` older than N days; stub does not define N yet. |
| Scope | Case row and cascaded relations (`CaseSession`, `CaseMessage`, `CaseExtraction`, `CaseAttachment`, `CrisisEvent`) per Prisma `onDelete: Cascade`. |
| Storage | Attachment URLs in DB must be deleted from object storage in same job or companion step. |

### Orphan upload cleanup

| Rule | Behavior |
|------|----------|
| Grace period | **1 hour** after upload (per stub comment) before orphan classification. |
| Reference | Object must appear in some `CaseMessage.attachments` JSON or `CaseAttachment` row to be retained. |
| Storage backend | Supabase Storage when [feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md) is enabled. |

## Use case catalog

### A. Retention purge

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Scheduled purge run | Cron configured; DB reachable | Invoke `runRetentionPurge()` | Returns `{ purged: number }` |
| **UC-A02** | Skip legal hold | Case `legalHold=true` | Purge scan | Case unchanged |
| **UC-A03** | Purge eligible case | Past retention; no hold | Delete case graph | Case absent; storage cleaned |
| **UC-A04** | Zero eligible | No matching rows | Purge | `{ purged: 0 }` |

### B. Orphan upload cleanup

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Scheduled cleanup | Storage configured | `cleanupOrphanUploads()` | `{ removed: number }` |
| **UC-B11** | Referenced object | Linked in message/attachment | Cleanup scan | Object kept |
| **UC-B12** | Orphan past grace | Uploaded >1h; no reference | Delete object | Storage freed |

### C. Operations

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-C20** | Job failure | Log error; do not partial-delete without transaction |
| **UC-C21** | Dry-run mode | **Target:** count-only flag before production enable |
| **UC-C22** | Metrics | Export `purged` / `removed` for observability |

### D. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-D30** | Purge while case in `UNDER_REVIEW` | Excluded until policy says otherwise |
| **UC-D31** | Duplicate cron overlap | Idempotent or leader-elected runs |
| **UC-D32** | Storage delete succeeds, DB fails | Retry; reconcile orphans |

## Behavior (product rules)

1. **Legal hold is absolute** for automated purge until explicitly cleared by authorized staff (future admin API).

2. **Stubs return zero** today; production must not assume data is deleted until implementation ships and is enabled.

3. **Retention period** is a deployment configuration constant (env), not hard-coded in product copy.

4. **Orphan job** depends on upload pipeline writing traceable object keys; without Storage, job is no-op.

5. Jobs run **off the request path**; reporters never wait on purge latency.

## Acceptance criteria (target)

| # | Criterion |
|---|-----------|
| AC-1 | `runRetentionPurge` exported and callable from a one-line CLI/cron entry. |
| AC-2 | No purge when `legalHold` is true (test fixture). |
| AC-3 | `cleanupOrphanUploads` removes only unreferenced objects older than grace period. |
| AC-4 | Runbook documents schedule, env vars, and rollback (disable cron). |

## Open questions

1. Retention duration per `CaseStatus`? **Default:** 90 days after `CLOSED`; legal review required.

2. Anonymize vs hard delete? **Default:** hard delete for reporter PII; aggregate metrics may remain.

3. Export job for litigation before purge? **Default:** manual legal hold + export tooling later.

## Related

- [feat-0010 PRODUCT](../feat-0010-evidence-upload-storage/PRODUCT.md)
- [feat-0011 PRODUCT](../feat-0011-data-layer/PRODUCT.md) — `Case.legalHold`
- [feat-0009 PRODUCT](../feat-0009-case-submit-lifecycle/PRODUCT.md) — statuses affecting eligibility
- [feat-0020 PRODUCT](../feat-0020-ci-deployment/PRODUCT.md)
