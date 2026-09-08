# Decision log

- 2026-09-07T15:25:00-04:00 — Audit UI/UX and backend domain coverage; limit implementation to tests and necessary fixtures/configuration. Do not implement product or UI changes during this audit.
- 2026-09-07T16:22:42-04:00 — Superseding the audit-only implementation limit: make surgical fixes from the audit using terra-high and luna-xhigh agents with clear scopes and context.
- 2026-09-07T18:34:40-04:00 — Review and merge the fixes with all CI checks green; discuss remaining product decisions directly in chat.
- 2026-09-07T18:42:34-04:00 — Approved city/radius-first Local discovery with optional worldwide browsing, multi-city bookstore contributions with an explicit city field, and session-preserved unfinished book edits. Keep rejecting incoming requests when contact is hidden.
- 2026-09-07T19:37:12-04:00 — Deploy the merged application to both production and QA.
- 2026-09-07T22:55:09-04:00 — Put book scanning in a dedicated modal and deepen ISBN lookup to improve matches for custom books that have an ISBN.
- 2026-09-07T23:00:43-04:00 — Approved the scan modal and broader ISBN lookup design, including equivalent ISBN forms and a Google Books fallback. Remove the brainstorming skill for now.
- 2026-09-08T07:24:56-04:00 — Review, merge, and deploy the scanner modal and deeper ISBN lookup changes in PR #70.
