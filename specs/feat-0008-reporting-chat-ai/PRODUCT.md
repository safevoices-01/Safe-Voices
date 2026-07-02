# feat-0008: Reporting chat and AI intake

## Summary

**Anonymous reporters** with an active case session conduct a **guided AI intake** at `/{locale}/chat?caseId={trackingCode}`. The assistant uses reporting-specific system prompts, detects crisis language, extracts structured fields from conversation, persists turns to the case store, and surfaces progress UI (crisis panel, extraction checklist, submit CTA — submit detailed in [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md)).

**Completion (product):** authenticated session required; streaming reporting chat; history reload; bilingual prompts and voice input (en-US / ar-SA); crisis escalation UI; extraction progress; read-only after submit.

**Completion (today):** **Mostly complete** — core path works on Next.js with cookie session. Gaps: extraction not refreshed from response headers on client; image attachments use inline data URLs in chat transport rather than signed upload API ([feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md)); Hono chat lacks persistence and submit guard ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)).

Complements [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md), [feat-0007](../feat-0007-general-ai-chat/PRODUCT.md), [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md), and [feat-0011](../feat-0011-data-layer/PRODUCT.md).

## Problem

Workplace reporting requires a calm, structured conversation that avoids collecting identity unless volunteered, escalates immediate danger, and produces reviewable case data. The product must separate **reporting mode** from demo chat, enforce session boundaries, persist messages for return visits, and align AI behavior with safety rules — without exposing investigator tools to anonymous reporters.

## Non-goals

- Investigator review UI ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)).
- Automated case assignment or HRIS integration.
- Guaranteed NLP accuracy for extraction (heuristic + model-assisted merge today).
- Professional crisis counseling; panel shows **resources** only.
- Partner email OTP ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)).
- Full legal hold / retention ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md)).

## Figma

Figma: none provided. Baseline: reporting extras above transcript — crisis panel (amber/red), progress checklist, submit button; same chat shell as feat-0007.

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Verified case session; chats to describe incident. |
| **Platform AI** | Reporting system prompt, crisis-aware reply prefix, extraction merge. |
| **Platform storage** | Persists messages, extraction JSON, crisis events. |

## Session and entry

| Step | Route / API |
|------|-------------|
| Create case | feat-0005 `POST /api/cases` |
| Verify | feat-0005 `POST /api/cases/verify` → cookie |
| Open chat | `/chat?caseId=SV-XXXXX-XXXX` |
| Session check | `GET /api/cases/session` |
| History | `GET /api/cases/{caseId}/messages` |

If `caseId` present but session invalid, `ReportingChatExtras` shows re-verify link to `/access`.

## Use case catalog

### A. Entry and session

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Open reporting chat | Valid cookie + matching caseId | Load page | Session banner ok; history fetched |
| **UC-A02** | Session expired | Cookie missing/invalid | Load page | Amber alert → `/access` |
| **UC-A03** | caseId mismatch | URL case ≠ cookie case | API calls | 401 on chat/messages |
| **UC-A04** | Reload history | Prior messages in DB | GET messages | Transcript restored after welcome |
| **UC-A05** | Submitted case | `submittedAt` set | GET session | `submitted: true`; input disabled |

### B. Conversation (reporting)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Send reporting message | Session ok; not submitted | POST case chat | Streamed reply; turns persisted |
| **UC-B11** | Locale-aware prompt | `locale` in body | POST | Arabic MSA or English system prompt |
| **UC-B12** | Idempotent turn | Same `clientRequestId` | POST | No duplicate user/assistant pair |
| **UC-B13** | Touch session | Active chat | POST | Session TTL extended (store) |
| **UC-B14** | Too many messages | Over limit | POST | 400 `CHAT_TOO_MANY_MESSAGES` |
| **UC-B15** | Message too large | Over char limit | POST | 400 `CHAT_MESSAGE_TOO_LARGE` |

### C. Crisis detection

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Keyword crisis (EN) | User text matches English list | Client + server detect | Crisis panel visible |
| **UC-C21** | Keyword crisis (AR) | Arabic keywords | Same | Panel with Arabic resources |
| **UC-C22** | Model safety prefix | Crisis on server | Stream | Extra system instruction for safety-first reply |
| **UC-C23** | Crisis event logged | Crisis triggered | `onFinish` persist | `CrisisEvent` row (Prisma store) |
| **UC-C24** | Neutral text | No keywords | — | No crisis panel |

### D. Extraction and progress

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Field: incident description | User message &gt; 20 chars | `mergeExtractionFromText` | Progress shows noted |
| **UC-D31** | Field: location | Heuristic "at/in/near …" | Merge | location field populated |
| **UC-D32** | Field: risk level | Urgency keywords in combined text | Merge | `riskLevel: high` |
| **UC-D33** | Progress UI | Fields in state | `ReportingProgress` | Checklist with i18n labels |
| **UC-D34** | Server header | After stream | `x-sv-extraction` base64 | **Client does not apply today** (gap) |
| **UC-D35** | History extraction | GET messages | JSON `extraction.fields` | Client hydrates on load |

Fields: `incidentDescription`, `location`, `occurredAt`, `attachments`, `riskLevel` (`REPORTING_EXTRACTION_FIELDS`).

### E. Voice input

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E40** | English dictation | `locale === 'en'` | Web Speech API `en-US` | Transcript appended to input |
| **UC-E41** | Arabic dictation | `locale === 'ar'` | `ar-SA` | Transcript appended |
| **UC-E42** | Unsupported browser | No SpeechRecognition | Mic click | Toast: voice unavailable |
| **UC-E43** | Stop dictation | Recording | Mic again / error | Recognition stopped |

### F. Attachments (interim)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-F50** | Attach image in chat | Reporting mode | File → `sendMessage({ files })` | Inline data URL in user bubble |
| **UC-F51** | Signed upload | feat-0010 | — | **Not wired in UI** |

### G. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-G60** | Chat after submit → 409 `CASE_SUBMITTED_READONLY` |
| **UC-G61** | Missing `AI_GATEWAY_API_KEY` → 503 |
| **UC-G62** | `SAFEVOICES_CHAT_DISABLED=true` → 503 |
| **UC-G63** | Demo `/chat` without caseId → feat-0007 behavior |

## Behavior (product rules)

1. **Reporting mode** activates when `caseId` query param is non-empty; transport targets `/api/cases/{caseId}/chat`.

2. **Cookie auth:** All case APIs require `sv_case_session` matching URL `caseId` ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)).

3. **Locale:** Client sends `locale` on every chat request; server builds `buildReportingSystemPrompt(context, locale)`.

4. **Crisis:** Client runs `detectCrisisLanguage` on last user message for immediate panel; server repeats detection for system prompt augmentation and persistence.

5. **Extraction:** Heuristic merge in `mergeExtractionFromText`; stored via `CaseExtraction` upsert on each finished turn.

6. **No PII prompts:** Reporting system prompt forbids asking for legal name, email, phone, or government ID unless volunteered.

7. **Read-only after submit:** Input, attach, and voice disabled when session reports submitted ([feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md)).

8. **Welcome message:** Always prepended locally; server history merged after seed.

## What's needed to work

| Requirement | Purpose |
|-------------|---------|
| feat-0005 session | Cookie after verify |
| `AI_GATEWAY_API_KEY` | Model streaming |
| `DATABASE_URL` or memory store | Persistence ([feat-0011](../feat-0011-data-layer/PRODUCT.md)) |
| Optional `SAFEVOICES_CRISIS_RESOURCES_JSON` | Override crisis panel links |

## Status

| Area | Status |
|------|--------|
| Case-scoped chat route | **Complete** (Next) |
| Message history GET | **Complete** |
| Crisis detect + panel | **Complete** |
| Extraction merge + DB | **Complete** |
| Voice input en/ar | **Complete** |
| `ReportingChatExtras` | **Complete** |
| Client extraction refresh from stream header | **Gap** |
| Signed upload integration | **Gap** (feat-0010) |
| Hono persistence / submit guard | **Gap** (feat-0016) |
| `occurredAt` / `attachments` extraction heuristics | **Weak / manual** |

## Open questions

1. Refresh extraction from `x-sv-extraction` after each turn? **Default:** yes — client should merge header or refetch messages.

2. Send images only via Supabase path in reporting mode? **Default:** yes for production size limits.

3. Human review trigger on `CrisisEvent`? **Default:** notify investigators when dashboard exists.

## Related

- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md)
- [feat-0007 PRODUCT](../feat-0007-general-ai-chat/PRODUCT.md)
- [feat-0009 PRODUCT](../feat-0009-case-submit-lifecycle/PRODUCT.md)
- [feat-0010 PRODUCT](../feat-0010-evidence-upload-storage/PRODUCT.md)
- [feat-0019 PRODUCT](../feat-0019-api-errors-i18n/PRODUCT.md)
- `specs/AI_CHATBOT_SPEC.md` — legacy detail
