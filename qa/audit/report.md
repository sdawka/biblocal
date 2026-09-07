# Biblocal journey and UI/UX audit

Audit date: 2026-09-07. Application baseline: `80c4bd1`. Scope: web application, English/French/Spanish, local synthetic QA data. Product code was not changed. This report and focused regression tests are the deliverables; known failures are intentionally retained.

## 1. Decisions needed

These are recommendations awaiting a product decision, not decisions already made. None prevents completing the audit. The current application is the authority where older documentation conflicts.

| Decision | Why it matters / reasonable options | Recommendation | Audit dependency |
|---|---|---|---|
| D1. What does “Hidden (no contact)” prohibit? | The UI suppresses requesting contact, but the API accepts a request. Options: prohibit incoming requests; or hide details while still allowing requests. | Enforce no incoming requests server-side. If requests remain allowed, change the label and provide a separate permission. | A03's final rejection contract depends on this. The UI/API discrepancy is verified. |
| D2. What does Local mean without coordinates? | A city and radius can be set while worldwide readers are presented as Nearby. Options: city fallback, explicitly global browsing, or require location before local results. | Use city fallback with a clear approximate scope; offer explicitly labeled worldwide results separately. Do not require precise geolocation to use the app. | A05's final filtering/label acceptance criteria depend on this. Mislabeling is verified. |
| D3. Where does an accepted connection lead? | Accepted requests disappear from the inbox; the discovery card cannot reveal authorized contact. Options: contact action in the person card, a person page, or a connection history page. | Start with an actionable “View contact” in the existing person card and accepted history in Profile. Keep handoff outside the app unless loan tracking is separately scoped. | Does not block verification of A01. A new messaging/loan system is unnecessary to resolve it. |
| D4. Is the bookstore directory Montreal-only? | The form offers Montreal neighborhoods, Spanish copy suggests a Madrid address, and the API defaults city to Montreal. Options: explicit Montreal pilot or supported multi-city contributions. | Make scope explicit; collect and validate city if multi-city. Do not infer city from an unrestricted address. | A09's final form design depends on geography scope. |
| D5. What survives dismissing an unfinished edit? | Escape dismisses the whole book sheet and loses an inline title draft. Options: preserve draft, cancel the inline edit first, or confirm discarding dirty edits. | Preserve drafts within the session; use a discard guard only when necessary. Keep Escape dismissal immediate for clean sheets. | A10 is a usability decision, not proof of persisted-book data loss. |
| D6. Which design/product contract is canonical? | `docs/UX.md` retains legacy routes/statuses and visual direction; newer Biblio/Local implementation uses visibility + ownership + intents. Marketing promises five matching facets while the current model has four. | Update existing UX/domain documentation and public claims to the current model; define save feedback, overlay, empty/error, and scope-label conventions in the existing design guidance. | Nonblocking. Review used current routes, tokens, components and domain enforcement. |

Documented value: readers make physical books available for lending, gifting and discussion, find books and people locally through shared taste, and contribute neighborhood bookstores. Intended users are readers, seekers, willing lenders/discussants, and community store contributors. There is no separate administrator screen or complete loan/return ledger in this web application. Inference: successful contact exchange is the minimum completion point for its central lending promise.

## 2. Main journeys, prioritized before screen review

| Journey | Role, goal, entry and prerequisites | Steps / screens | Success and durable state | Alternate paths, permissions and recovery |
|---|---|---|---|---|
| **J1 Primary — build and maintain a shelf** | Signed-in reader; `/biblio`, including add-book entry. | Add → ISBN lookup/manual entry/scanner → preview → visibility, ownership and intents → save → card/detail sheet; search, sort, filters, inline edit, notes, cover, delete. Goodreads import is the bulk branch. | An owned book persists across reload; repeated ISBN intake returns the original book; notes retain their own visibility; deletion removes dependent data atomically. | Unknown ISBN, duplicate, seeking rather than owning, empty shelf, long title, failed save, stale load, session change, invalid import, denied camera, canceled edit/delete. Only the owner may mutate a book or its notes. |
| **J2 Primary — find a local book or person** | Reader/seeker; `/local`; profile city/radius helpful. A matching book is not required for discovery. | Books → search/filter/expand owner → People → expanded person; List/Map toggle, map navigation and Bookstores tab. | Relevant public books/people are discoverable with honest geography and a clear next action. Read-only until connecting. | Empty/no-coordinate profiles, unlocated readers, worldwide results, no results, failed discovery load/retry, hidden/private records, narrow screens. No self/private-book leakage. |
| **J3 Primary — connect and arrange a handoff** | Sender with contact details and recipient allowing requests; Local person card and Profile inbox. | Request → pending → recipient accepts/declines → authorized contact → arrange externally. | One relationship per unordered user pair; accepted users can retrieve permitted contact; rejected/expired attempts follow cooldown; at most five new requests per day. | Hidden contact, missing sender contact, duplicate/reverse requests, already accepted state, rate cap, decline/retry, concurrent requests, revoked visibility. Acceptance currently does not complete the UI journey (A01). |
| **J4 Primary — establish identity, interests and privacy** | Signed-in reader; `/profile`. | View → Edit → name/city/radius/location, curated/freeform interests, reading personality and contact settings → blur/change saves → return to view. | Valid profile changes persist; visibility matches server behavior; success is announced only after acknowledgment. | First-use blank profile, long/invalid values, offline/server rejection, changed session, geolocation denied, unsaved text, public/on-request/hidden contact. |
| **J5 Secondary — find/contribute a bookstore** | Reader or store contributor; Local Bookstores or `/stores`. | Directory → store detail; Add store → name/address/neighborhood/details → success → find created store → add book. | Store and its books persist with correct geography and contributor ownership. | Missing store, required field errors, duplicate submission, non-creator mutations, long content, failed create/add, correction/removal. Success currently lacks a direct route to the new store. |
| **J6 Secondary — understand and join** | Visitor; `/`, About, How it works, Blog and localized equivalents. | Understand promise → CTA → embedded Clerk sign-in/sign-up → protected app; navigation, theme/language switch, sign-out return. | Visitor knows why to participate; real auth yields the correct user session and localized destination. | Existing account, auth errors, redirect loops, session expiry, keyboard-only entry, localized wrapping, absent Spanish blog (English fallback). Real login completion was not tested. |
| **J7 Recovery — resume without losing work** | Any signed-in reader after failure, empty result or interruption. | Retry load/save, clear search/filter, cancel or resume edit, reload, reauthenticate. | Accurate feedback, preserved drafts where promised, no cross-user state or silent overwrites; meaningful empty/error next step. | Existing store race/session tests cover several invariants; browser evidence exposes false Saved, lost inline draft, and unsuitable map advice in a list search. |

Journey assessment: J1 manual creation, reload and core browsing work in local QA. J3 fails at its successful contact-exchange endpoint. J2's geographic labeling undermines relevance. J4's save acknowledgment is unreliable. These outweigh visual polish.

## 3. Screen and state coverage

Browser review used the running Astro/Cloudflare local app with an isolated D1 directory, synthetic readers and synthetic contact addresses. Representative sizes: 1440×900 desktop and 390×844 mobile; targeted 320×740 and 768×1024 checks. Light and dark themes were sampled. This is not every state at every size or a formal WCAG certification.

| Route/surface inventory | Journey | Visually/interactively inspected | Limits |
|---|---|---|---|
| `/`, `/fr`, `/es` | J6 | Desktop/mobile hero, CTA, navigation, footer/sign-in area, theme/language; FR/ES clipping measured. | No completed real login/signup, account recovery or third-party auth error flow. |
| `/about`, `/how-it-works`, FR/ES equivalents | J6 | All language pages; desktop/mobile and targeted 320px About. | Not every animation state, theme and width combination. |
| `/blog`, `/fr/blog`; `/blog/[...slug]`, `/fr/blog/[...slug]` | J6 | Both indexes and all 14 current article entries (seven per language), first viewport and DOM content; representative article desktop/mobile. | Every article's below-fold content/table layout was not visually exhaustively checked at each width. Spanish has no blog route; navigation fallback is English. |
| `/biblio`, `/fr/biblio`, `/es/biblio` | J1/J7 | Covers/details, search, sort/filter surface, zero results, empty shelf, populated 50-book shelf, mobile and tablet. | Full stress/performance profiling and every filter combination not performed. |
| Add-book region, manual/ISBN/preview, scanner dialog, Goodreads import | J1 | Manual creation and persisted reload; long-title preview, import entry and keyboard reachability; source/tests for scanner/import behavior. | File transfer blocked by browser extension file-URL permission. Camera capture and real permission denial were not exercised. ISBN provider outage was not forced in-browser. |
| Book detail sheet, title edit, note privacy, delete confirmation | J1/J7 | Long content, inline editing, Escape dismissal, private note surface, delete confirmation; focused focus-restore test. | No full keyboard/screen-reader matrix; cover-file upload unavailable; every destructive confirmation variant not exercised. |
| `/local`, `/fr/local`, `/es/local` | J2/J3/J5/J7 | Books/People/Bookstores, List/Map, expanded rows, cross-view owner action, markers/tiles, unlocated results, search empty, mobile/desktop. | Precise geolocation and offline tile recovery not induced; viewport-bounds behavior not comprehensively exercised at all zoom levels. |
| `/profile`, FR/ES equivalents | J3/J4/J7 | View/edit, interests/constellation, contact privacy, incoming request acceptance, false save on invalid long name, blank profile. | No real account switch/authenticated production session; complete accepted/declined/revoked two-browser lifecycle remains a gap. |
| `/stores`, FR/ES equivalents | J5 | Directory, localized routes, navigation to store. | No large-directory paging/performance simulation. |
| `/stores/new`, FR/ES equivalents | J5 | Required-field validation, synthetic store creation, success state, localized form. | No browser network-failure/duplicate-click create scenario. |
| `/store/[id]`, FR/ES equivalents | J5/J7 | Existing/created store, owner add-book form, desktop/mobile, missing ID error. | Creator correction/deletion UI is absent; backend ownership tests are not equivalent to a complete stewardship journey. |
| `/signed-out` | J6/J7 | Localized landing return observed in QA. | QA bypass does not verify Clerk logout, session revocation or production middleware. |
| `/shelf`→`/biblio`, `/matches`→`/local`, plus FR/ES aliases | J1/J2 | Source-config inventory and existing route tests. | Each alias was not separately browser-exercised. |
| Shared mobile menu, theme/language controls, filter overlay, sync feedback | All | Representative opening/navigation/dismissal and responsive states. | Focus trapping, status announcements and contrast have partial rather than exhaustive coverage. |

Orphans/missing steps: `OnboardingIsland.svelte` is not a reachable route-composed onboarding screen; first-use is the empty Biblio/Profile experience. There is no `/users/[id]` page despite a user-detail API. No accepted-connection destination, direct post-create store link, or creator store-management screen completes those journeys. APIs are not counted as screens. No separate role-specific admin navigation was found.

Selected durable screenshots are in [evidence](evidence/). The full transient capture set remains in `/tmp/biblocal-audit-evidence` for this workstation session. Screenshots reflect local synthetic data, not production users.

## 4. Findings ranked by user impact

P1 = core goal blocked, misleading persistence, or important permission/invariant failure. P2 = substantial friction, wrong scope/content or recovery failure with a workaround. P3 = lower-frequency clarity/presentation. Effort is a rough implementation estimate excluding release validation: S ≤1 day, M 2–4 days, L ≥1 week. No P0 was established.

### A01 · P1 · Acceptance never delivers usable contact

**Verified defect; J3, Local person card/Profile inbox, requester and recipient; high confidence; M.** In the contact fixture, accept Esme's incoming request in Profile, then open Esme in Local. The inbox item disappears; Local can still offer “Request to Connect,” which yields “Failed to send request.” A hydrated accepted card offers disabled “Connected,” with no contact action. The database/API show an accepted relationship and `/api/users/user-esme` returns authorized contact, so the server outcome exists but the user cannot complete the handoff.

Evidence: [accepted-request dead end](evidence/29-accepted-request-error.jpg); two failing component regressions. Relevant code: `src/components/MatchCardIsland.svelte`, `MatchMapIsland.svelte` mount initialization, `ConnectionRequestsIsland.svelte`, `src/stores/connections.ts`, `src/pages/api/users/[id].ts`. Local loads discovery without initializing relationships; the inbox displays only pending requests.

**Improve:** load session-scoped connection state with retry, expose authorized contact from the existing detail API after acceptance, and retain an accepted history entry. **Acceptance:** direct Local entry after reload shows the accepted state; each party can activate the appropriate contact link; unauthorized callers still receive no on-request contact; revocation and user switching remove access. Add a two-user E2E acceptance→reload→contact test, including rejected and revoked states. This is highest priority because it prevents the central promise from completing.

### A02 · P1 · Concurrent requests bypass relationship and daily-limit invariants

**Verified handler/SQLite defect; J3, API, all requesting readers; high confidence for reproduced interleaving, medium for deployed timing; M.** Start A→B and B→A concurrently: both return 201 and create two pending rows. Start six requests from one sender to distinct eligible recipients concurrently: all six return 201 despite the five-per-day rule.

Evidence: `tests/integration/audit-domain.test.ts` invokes actual handlers against migrated SQLite; two failing tests. Relevant code: `src/pages/api/connections.ts` preflight checks/count before insert; ordered pair uniqueness in `src/db/schema.ts` and connection migration. The shim reproduces an async check-then-write interleaving, not independent deployed Worker/D1 connections.

**Improve:** enforce unordered-pair uniqueness and quota atomically at the persistence/coordination boundary, with a defined duplicate response. **Acceptance:** reciprocal race produces one durable relationship; six concurrent attempts produce at most five new rows; declined reactivation, retries and same-direction duplicates preserve limits. Keep handler tests and add a real isolated D1 concurrency release test. Ranking reflects repeated request/spam and contradictory relationship state rather than a demonstrated contact-data leak.

### A03 · P1 conditional on D1 · Hidden contact can still receive direct API requests

**Verified UI/API discrepancy; J3/J4, hidden recipients; high confidence; S–M.** Set recipient to “Hidden (no contact),” then POST their ID to `/api/connections` as another eligible reader. The card omits the action, but the API returns 201 and persists pending contact. No hidden contact value was shown to leak.

Evidence: failing hidden-recipient test in `audit-domain.test.ts`; recipient lookup in `src/pages/api/connections.ts` checks existence without contact visibility; UI in `ProfileIsland.svelte` and `MatchCardIsland.svelte`. **Improve:** apply the chosen permission on the server. **Acceptance under recommended D1:** reject with a defined 4xx response and no new/reactivated row; cover missing recipient, hidden recipient, visibility changes, duplicates and both directions. Current test chooses 403; final code may use another explicitly agreed client-error contract. If “hidden” only hides details, downgrade this to a P2 misleading-label defect and replace the acceptance policy accordingly.

### A04 · P1 · Profile reports Saved after persistence fails

**Verified defect; J4/J7, profile edit and contact settings, readers; high confidence; M.** Enter a 500-character name and blur. The UI reports Saved; reload restores the old name. A focused component test independently rejects the save request and observes rollback while Saved is still present. The database does not accept that invalid name.

Evidence: [reverted profile](evidence/16-profile-rejected-save.jpg); `AuditUiState.test.ts`. Relevant code: `ProfileIsland.svelte` `handleSave`, `handleContactSave`, `showSaved`; `src/stores/profile.ts` asynchronous persistence/rollback; profile API validation.

**Improve:** propagate the persistence result, show Saving then Saved only after acknowledgment, associate field errors, and preserve rejected drafts for correction/retry. Align client limits with server validation. **Acceptance:** rejection never announces Saved; the draft and actionable error remain; successful save survives reload; stale responses cannot overwrite a newer field edit. Extend existing field-aware rollback tests with user-visible outcome assertions. False confirmation risks unnoticed loss of the user's intended changes.

### A06 · P1 accessibility · CSV selection is absent from keyboard navigation

**Verified defect; J1 bulk import, keyboard users; high confidence; S.** Open Goodreads import, then Tab through the controls. “Choose CSV File” is visible text, but the file input has `display:none` and the surrounding label/span supplies no keyboard control. The strengthened browser check performs Tab navigation and fails to reach an upload control.

Evidence: [browser results](evidence/browser-results.json), `src/components/ImportIsland.svelte` input/label markup and CSS. This is distinct from the extension permission that blocked actual file transfer during the audit.

**Improve:** use a focusable native file input with appropriate visually hidden styling or a real labeled button that opens it, with visible focus. **Acceptance:** Tab reaches the chooser; Enter/Space opens file selection; chosen filename, validation error, preview and retry are accessible; focus remains predictable after cancellation. Add keyboard file-choice E2E when upload tooling is enabled. Bulk intake is unavailable to affected users, hence P1 despite the manual-entry workaround.

### A05 · P2 · Worldwide results are labeled Nearby; owner navigation hides its target

**Verified scope mismatch plus usability recommendation; J2/J3, mobile Local; high confidence; M.** With seeded Montreal/8km profile lacking coordinates, People shows Tokyo, Paris, London and New York under Nearby; Montreal readers with no coordinates instead appear in an unlocated group. `src/stores/matches.ts` does not pass the available location-filter argument to discovery. Desktop map bounds and mobile list scope differ. From a mobile book owner action, “See … nearby” switches to Map, hiding the expanded person until the user returns to List/People.

Evidence: [desktop world map](evidence/12-local-desktop-map.jpg), `AuditDiscovery.test.ts`; `MatchMapIsland.svelte` scope/count rendering and `focusFromRow`, `src/lib/matching.ts`, `src/stores/matches.ts`.

**Improve:** adopt D2 consistently and keep the destination person visible when navigating from a book. **Acceptance:** a 5km Montreal scope never silently labels Tokyo nearby; no-location scope is explicit; city fallback and worldwide opt-in are tested; book→owner reveals an actionable person card on mobile and desktop. Current added assertion detects the misleading label with remote results; it is not a complete future geography contract. The workaround is manual city interpretation, which weakens the app's local value.

### A07 · P2 · Basemap displays API KEY REQUIRED across the map

**Verified visual defect; J2/J5, Map on desktop/mobile; high confidence; S–M.** Open Local Map and wait for tiles: the basemap is covered by repeated provider “API KEY REQUIRED” markings. This is not merely an unfinished loading screenshot.

Evidence: [loaded map](evidence/12-local-desktop-map.jpg). Relevant code: `MatchMapIsland.svelte` CARTO `light_all` / `dark_all` tile URLs. **Improve:** configure a supported tile source and its required access, with a useful list fallback/error state. **Acceptance:** fresh light/dark map loads at representative zoom levels contain readable, unmarked tiles; denied/failed tile responses retain useful discovery navigation and feedback. A provider configuration check alone is insufficient: retain a rendered screenshot smoke. Lists provide a workaround, limiting priority to P2.

### A08 · P2 · French and Spanish landing text clips at phone widths

**Verified visual defect; J6, FR/ES visitors at 390px; high confidence; S.** Open `/fr` or `/es` at 390px. The main text column extends beyond the right edge: measured right bounds 435.92px and 437.03px. English passes the same check. Root `overflow:hidden` masks rather than resolves child overflow.

Evidence: [French](evidence/48-fr-hero-mobile.jpg), [Spanish](evidence/47-es-hero-clipping.jpg), three locale browser checks. Relevant code: `LandingHero.svelte` responsive single-column grid, child sizing and metadata row. **Improve:** permit grid children to shrink (`min-width:0` / zero-minimum tracks where appropriate), wrap the localized metadata row and validate actual text/control bounds. **Acceptance:** headings, prose and CTAs remain fully visible at 320/390/768px in all languages, with enlarged text; no clipping hidden behind root overflow. This damages the first explanation of the product for two languages.

### A09 · P2 · Store contribution loses geography and ends without a next step

**Verified current behavior; J5, contributors; high confidence; M.** Add a synthetic store with a Toronto address and Other neighborhood. The form offers no city field, and the API defaults city to Montreal. Success offers Add another, requiring a manual directory visit to find the created store. Spanish address guidance suggests Madrid while neighborhood choices are Montreal-specific.

Evidence: [creation success](evidence/20-store-created-mobile.jpg); `AddStoreIsland.svelte`, `src/pages/api/stores.ts` city default, `StoresNewPage.astro`, store detail components. **Improve:** resolve D4, validate geography, and link success directly to the created store. Provide a scoped creator correction/removal path if ongoing stewardship is intended. **Acceptance:** submitted city/address agree; reload finds the correct store; success opens its ID; another user cannot edit/delete it; invalid/duplicate submissions retain the draft and do not create extra rows. Existing backend ownership tests do not cover the missing UI workflow.

### A10 · P2 · Escape discards an unfinished book-title edit

**Verified interaction; usability recommendation under D5; J1/J7, detail sheet; high confidence; S–M.** Open book details → Edit title/author → type a new title → Escape → reopen. The old title returns and the unfinished text is gone. This is loss of a draft, not loss of the previously persisted book.

Evidence: detail-sheet browser interaction, [sheet layout](evidence/04-book-sheet-mobile.jpg); `BookDetail.svelte` local draft and `BookDetailSheet.svelte` dismissal. **Improve:** preserve/cancel the inline draft deliberately before dismissing the enclosing sheet, following D5. **Acceptance:** clean Escape still closes and restores focus (new passing test); dirty Escape/backdrop/close have consistent draft semantics; long sheets scroll without trapping actions; delete confirmation cannot be accidentally bypassed. Add dirty-state focus/dismissal tests rather than recommending a modal for every edit.

### A11 · P2 · Empty/error recovery advice does not match the state

**Verified copy/state defect; J2/J5/J7, search and missing store; high confidence; S.** In mobile list mode, search for a nonexistent person/book. The message tells the user to pan or zoom a map that is hidden, instead of clearing the query. A missing store ID displays generic “Failed to load store,” with no distinction from a retryable failure; navigation still refers to matches rather than Local.

Evidence: [empty search](evidence/73-local-empty-search.jpg), [missing store](evidence/46-missing-store-settled.jpg); `MatchMapIsland.svelte`, `StoreDetailIsland.svelte`, locale copy. **Improve:** choose messages/actions from cause: query, filter, empty region, unavailable location, not found, or network error. **Acceptance:** query emptiness offers clear search/reset; map advice only appears in map-context emptiness; 404 offers directory return and network failure offers retry; headings and announcements identify the error. Shared state treatment is preferable to per-screen ad hoc copy.

### A12 · P2 · Malformed note JSON is reported as a server failure

**Verified API contract defect; J1/J7, notes clients; high confidence; S.** POST malformed JSON to an owned book's note endpoint. It returns 500, although the caller sent an invalid payload; no note is created.

Evidence: failing real-handler test in `audit-domain.test.ts`; `src/pages/api/books/[id]/notes/index.ts` request parsing/catch. **Improve:** distinguish JSON parse/validation errors from persistence failures. **Acceptance:** malformed JSON returns a defined 400 response with no durable change; valid notes still persist and unauthorized requests remain rejected. Lower than the core journey failures because ordinary form submission does not generate malformed JSON, but it confuses retry and monitoring behavior.

### A13 · P3 · Interest visualization is difficult to read as profile information

**Usability recommendation; J4, profile view with many interests; medium confidence; S–M.** Mobile interest names form a small crowded graph; desktop leaves them small inside a much larger card. There is no equivalent simple readable list in the main view. The SVG's 100-unit viewBox and small label typography amplify density.

Evidence: [desktop](evidence/13-profile-desktop.jpg), [French mobile](evidence/58-fr-profile.jpg); `InterestConstellation.svelte`, `ProfileIsland.svelte`. **Improve:** present the selected interests as readable wrapping text/chips, retaining the visualization as a secondary optional view. **Acceptance:** long and numerous interests remain readable at 390px and enlarged text, keyboard/screen-reader users obtain equivalent information, and editing is discoverable. This is an information presentation recommendation, not an assertion that a different aesthetic is inherently better.

### A14 · P3 · Public promises and current mechanics diverge

**Source-backed content recommendation; J6→J2, visitors; high confidence on mismatch, medium on user impact; S.** The homepage presents five matching facets including Syllabus Survivor/Neighbor, while the current `Match` model implements four different facets. The landing map preview uses static sample markers with a Live/within-5km presentation. Older UX docs retain obsolete concepts.

Evidence: `LandingHero.svelte` and landing sections, `LocalMapPreview.svelte`, locale content, `src/lib/types.ts`, `src/lib/matching.ts`, `docs/UX.md`. **Improve:** label the preview as an example and align public explanations with implemented matching and location behavior. **Acceptance:** every claimed facet maps to current logic or is clearly marked planned; simulated distance/activity is labeled; existing docs point to canonical dimensions. No external factual claims (such as organizational history) were independently fact-checked in this audit.

## 5. Test coverage, additions and execution

### Journey coverage matrix

Existing test names below identify exercised domains, not a claim that all meaningful combinations are covered.

| Journey → screens/states | Domain rules | Existing executed coverage | Added / result | Remaining gap |
|---|---|---|---|---|
| J1 intake → preview → persisted shelf | Ownership, ISBN idempotency, valid dimensions, duplicate imports | `add-book-flow`, `books-api`, `books-validation`, `import-api`, `goodreads-import`, `AddBookIsland`, `ImportIsland` | Actual browser manual save/reload **pass**; changed-field ISBN retry **pass** | Real CSV preview/import via chooser; provider outage; simultaneous browser submission |
| J1 details/notes/delete | Public/private projection, note validation, atomic deletion | `notes-delete-api`, `books-delete`, `visibility-security`, `BookDetail`, `BookDetailSheet` | Visible/private note projection **pass**; invalid visibility unchanged **pass**; corrupt dependent-row delete rollback **pass**; malformed JSON **fail** | Real D1 transaction fault injection; cover-file transfer; dirty edit recovery |
| J2 Local list/map/owner | Public discovery, self exclusion, location, matching facets | `matching`, `discoveryBooks`, `localHub`, `live-locality-simulation`, `LocalDiscovery`, `MatchMapIsland` | Remote results labeled Nearby **fail**; visual map/owner navigation findings | Explicit accepted geography contract; real tile outage; keyboard map alternatives |
| J3 pending→accepted→contact | Pair uniqueness, quota, visibility, authorized details | `connections-api`, `connections-uniqueness`, `connections`, `users-id-api`, `connection-ui` | Local relationship initialization **fail**; actionable accepted contact **fail**; hidden recipient **fail**; reciprocal race **fail**; six-request cap **fail** | Two real sessions through accept/decline/revoke; independent Worker/D1 concurrency |
| J4 profile edit/save/privacy | Validation, field rollback, session isolation | `profile-patch-api`, `profile`, `field-aware-rollback`, `user-switch-leak` | False Saved **fail**; browser invalid name reverts after reload | Accessible error announcement and draft retry; real geolocation denied/success |
| J5 stores/create/details/add book | Contributor authorization, safe projections, persistence | `stores-auth`, `stores-crud`, `stores-projection`, `store-books-api` | Browser synthetic create/add-book surface and missing-ID inspection | Complete creator update/delete UI, duplicate-click failure, city contract |
| J6 public/locales/auth | Route mapping, content schemas, middleware/session boundary | `routes`, `i18n`, `blog-schema`, `middleware`, `logout` | Browser EN hero **pass**, FR and ES **fail** | Real Clerk auth/signup/logout/expired session, all article below-fold responsive states |
| J7 overlays/empty/error/resume | Focus return, stale response isolation, durable recovery | `load-race`, `load-failure-error`, `local-recovery`, `shelf-mutation-lanes`, `SyncErrorToast` | Clean detail Escape/focus return **pass**; empty/large fixture visual pass | Full keyboard focus traps, screen reader, offline retry and interrupted unsaved workflows |

### Added files and test counts

- `tests/integration/audit-domain.test.ts`: eight real-handler, migrated SQLite tests; **4 pass, 4 fail**. No mocked replacement of the domain logic under test. The deliberately corrupt foreign-owned dependent note is a transaction robustness fixture, not an API-creatable state.
- `tests/components/AuditConnections.test.ts`: two component/state integration tests; **2 fail**. Transport is mocked; relationship presentation is real.
- `tests/components/AuditDiscovery.test.ts`: one component/store scope test; **1 fail**. It detects the current false label, not full geographic correctness.
- `tests/components/AuditUiState.test.ts`: two interaction tests; **1 pass, 1 fail**. Failed persistence is injected at transport; actual store rollback and component feedback run.
- `qa/audit/browser-journeys.mjs`: five checks against the running app in the connected Browser-skill tab; **2 pass, 3 fail**. The function throws with `.results` on failure. It is a guided browser runner, not wired into CI or an independently launched Playwright process. File-choice activation/upload remains unexecuted because keyboard reachability fails first and extension upload permission is unavailable.

The independent test review prompted stronger explicit contact-action assertions, narrower Saved feedback assertions, global-state cleanup, independent browser navigation, actual Tab traversal, broader hero text/control bounds, and failure propagation. A fully automated CI browser harness remains a gap rather than being implied by this runner's presence.

### Execution results

Baseline `npm run test:run`: initially **140 failed / 660 passed** because the installed `better-sqlite3` native binary used Node 22 ABI while the shell ran Node 24. Rebuilding the existing dependency resolved that environment failure; **800/800 original tests passed across 73 files** before adding regressions. No product fix or assertion weakening was used.

Final Vitest: **805 passed, 8 failed, 813 total; 73 passing files, 4 failing files**. All eight final failures are new audit regressions exposing existing application behavior; none of the original 800 tests fails. They must not be skipped or marked expected-failure just to obtain green CI. No merge is appropriate while these checks are red.

Browser checks: **2 passed / 3 failed**, exact output retained in [browser-results.json](evidence/browser-results.json). Failures: keyboard CSV chooser, FR hero bounds, ES hero bounds. Astro check: **0 errors, 0 warnings, 6 hints across 136 files**. Production build: **passed**. See [execution summary](evidence/execution.txt) for final command results.

The 17 existing `qa/journeys/*.sh` scripts were inventoried but **not executed**; their agent-browser surface was not the browser tool used for this audit. Manual/automated work described above must not be represented as a successful run of that suite. No coverage-percentage claim is made.

### Reproduction environment

Use disposable local state only. The configuration imports the real root Astro config and overrides just Cloudflare persistence. Do not use a production endpoint, `--remote`, or the repository's deployment/remote seeding scripts for these fixtures.

```sh
npx wrangler d1 migrations apply biblocal-qa-db --env qa --local --persist-to /tmp/biblocal-audit-state
npx wrangler d1 execute biblocal-qa-db --env qa --local --persist-to /tmp/biblocal-audit-state --file scripts/seed-qa.sql
npx wrangler d1 execute biblocal-qa-db --env qa --local --persist-to /tmp/biblocal-audit-state --file qa/audit/contact-fixture.sql
CLOUDFLARE_ENV=qa npm run dev:qa -- --config qa/audit/astro.config.mjs --host 127.0.0.1
npm run test:run
npx astro check
```

Use the actual port printed by Astro (4326 during this run; other ports belonged to unrelated apps). After establishing `tab` and `viewport` through the Browser skill, invoke the runner in its Node REPL:

```js
const { runAuditJourneys } = await import('/Users/sdawka/Code/biblocal/qa/audit/browser-journeys.mjs');
await runAuditJourneys({ tab, viewport, baseUrl: 'http://localhost:4326' });
// Throws on failure; error.results contains every completed check.
```

The contact fixture assumes a freshly seeded database and inserts one incoming request. For empty-reader inspection, apply `qa/audit/empty-reader-fixture.sql` to the same isolated database and use a fresh browser origin so existing local recovery state cannot repopulate it. For scale inspection, apply `scripts/scenarios/seed-power-user.sql` only to that isolated database; it replaces synthetic data and supplies 50 books. The audit stopped its own dev server and restored the browser viewport after inspection.

## 6. Recommended implementation sequence

1. Decide D1–D4, then repair the connection journey and its persistence boundary together: A01–A03. Preserve privacy projection tests, add two-party reload/contact smoke, and validate concurrency against isolated real D1 before release.
2. Fix shared async save feedback and draft recovery (A04/A10). Reuse field-aware rollback rather than introducing independent optimistic rules per form. Add error associations and retry once centrally.
3. Restore accessible intake and honest Local results (A06/A05), then repair map tiles (A07). These unblock adding a shelf and finding someone useful.
4. Take quick wins: localized hero containment (A08), state-specific recovery (A11), malformed JSON handling (A12), and post-create View store (part of A09).
5. Complete geographic/contributor store behavior (A09), readable interest presentation (A13), and existing-doc/public-copy alignment (A14).
6. Run the full green suite, the missing authenticated two-user journey, keyboard/import/camera/location paths, responsive article checks and a fresh production smoke before treating a subsequent implementation as release-ready. This audit branch itself intentionally documents failures and makes no deployment claim.
