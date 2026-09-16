# Cara Scheduling UI — Build Spec

Adopted 2026-09-15 from Samantha's Phoebe screenshot review.
**Revised 2026-09-15 (second revision): the information architecture below
supersedes the original four-tab layout, on Samantha's explicit approval.**
This is the build prompt for the Cara-facing UI in cc-hub-live/index.html
(Scheduling group).

The engine already exists: coverage-watch / coverage-run / coverage-reply /
coverage-assign / coverage-shifts in the Staffing-Coordinator-Hub project,
plus timekeeper-watch and shift-confirm. **This build is almost entirely
display: expose state the engine already records.** Where an engine change is
required it is marked ENGINE, and none of them are built yet.

## Design law (do not negotiate these away)

1. **AI proposes, a person disposes.** Cara never claims "Successfully
   Filled" until a coordinator clicks Confirm & Assign and coverage-assign's
   read-back verification succeeds (`c.axiscare_assignment.status === 'assigned'`).
   Before that the state is "Coverage found, ready to confirm".
2. **Only substantiated data on screen.** Every "why they match" comes from
   AxisCare or hub data: worked-with-this-client (tier 1), worked in the last
   14 days (tier 2), busy check, care level, scheduled hours. **No distance in
   miles** (nothing is geocoded; show the caregiver's city instead). No AI
   generated traits, no match percentages.
3. **Waves are a feature, show them proudly.** Controlled waves of
   `COVERAGE_WAVE_SIZE` (5) with a `coverage_wave_fuse_min` (10) fuse. Never
   a blast to the whole roster.
4. **Keep the caregiver-first case opener.** Pick who is calling off, see
   their real AxisCare shifts (coverage-shifts), click the exact visit. Never
   a retype-the-shift form.
5. **AxisCare is the system of record.** For shifts, assignments, and for
   attendance: the clock-in appearing in AxisCare is the ground truth, not a
   caregiver's text reply.
6. No em dashes in any user-facing copy. Never the phrase "plain language".

## Information architecture (revised)

The Scheduling group is three tabs:

- **Cara** — the coverage command centre. **Absorbs the former Coverage Help
  tab**: its board, its case workspace and its case opener all live here now.
  Coverage Help was not removed, it was moved.
- **Schedule Watch** — **the former Hours Watch, expanded**. Live Shift Watch
  (missed clock-ins) sits on top; the existing hours and intake-matcher
  functionality is preserved beneath it. Hours Watch was not removed, it grew.
- **EVV** — unchanged. The correction and documentation workflow stays in the
  Staffing hub at sc.mo-care.com/#evv and is framed here, because two
  correction logs of the same visit is how a visit gets fixed twice and billed
  once.

Internally the tab keys stay `coverage`, `hourswatch` and `evv` so that every
existing call site, saved link and Morning Brief email keeps working. The
labels, the routes and the content are what changed.

### Which tab owns which problem

- No clock-in at the expected shift start: **Schedule Watch**.
- The caregiver cannot work, so the shift needs somebody else: **Cara**.
- The visit happened but the record needs correcting: **EVV**.

A problem moves between tabs. It never becomes active work in two of them.

## Routes

| Route | Opens |
|---|---|
| `#cara` | Cara command centre |
| `#cara/case/<caseId>` | That coverage case, expanded, in its workspace |
| `#cara/history` | Cara with the resolved filter applied |
| `#schedwatch` | Schedule Watch |
| `#schedwatch/shift/<ladderId>` | That shift watch case, expanded |
| `#evv` | EVV |

`#coverage` and `#hourswatch` remain as aliases and must keep working.
Case and ladder ids are the real record ids (`coverage_cases[].id`,
`timekeeper_cases[].id`), so a future GHL workflow alert can link a
coordinator straight to the decision Cara needs. Routes address a record
only; no scheduling state is ever encoded in the URL.

## The Cara tab

### Command centre (top of the tab)

Four counters, all derived from `coverage_cases`, never stored:

| Card | Derivation |
|---|---|
| Open Coverage | cases with `status === 'open'` |
| Cara Working | open cases with no human action outstanding |
| Needs You | open cases with a human action outstanding |
| Filled Today | `resolved_how === 'covered'` and `resolved_at` is today in Chicago |

**One case, one section.** A case appears in exactly one of the three
sections below, by the highest-priority state it is actually in:

- **Needs Your Attention** — `pending_fill` set (a caregiver accepted and a
  coordinator must confirm), or `callout_escalated_at` set (outreach
  exhausted), or an `asked[]` entry in state `inquiry` (a caregiver asked a
  question). These are the only three supported reasons. Do not invent more.
- **Cara is Working On** — every other open case.
- **Filled Today** — covered and resolved today.

Needs Your Attention is the only section that carries the gold and amber
emphasis. Everything else stays in the ordinary card treatment.

### Coverage Case workspace

Unchanged from Phase 1 and **not to be rebuilt**. Clicking a case anywhere in
Cara expands the shipped workspace: the clickable lifecycle rail, the outreach
waves, the results table, Ready to Confirm and the closing-the-loop checklist.

Lifecycle rail stages and their derivations:

| Stage | Derivation |
|---|---|
| Call-Off | `opened_at` present |
| Matching | a wave exists in `asked[]` |
| Outreach | `asked[]` auto entries; current while more remain and no yes |
| Responses | any `asked[].state` other than `waiting` |
| Confirm | `pending_fill` means needs-you; after confirm, done |
| Close Loop | `axiscare_assignment` + `closure_notified` + `family_notified` |

### Verbatim caregiver replies

**The reply text lives on the ask: `asked[].reply`, capped at 500
characters, with `asked[].replied_at` for the time.** There is no
`coverage_replies` table. An earlier revision of this spec said there was;
that was wrong and nothing should be built against it.

`asked[].state` is one of `waiting`, `yes`, `no`, `inquiry`,
`closed_notified`. `noanswer` is additionally written by the office through
covAskState.

### Scheduled hours at the confirm decision

Showing the hours consequence before a coordinator confirms is approved, from
`coverage-shifts {hours_watch:true}`.

**Next 7 Days (product definition, final 2026-09-16): a rolling
seven-calendar-date window beginning with the current date in the agency's
operating timezone (America/Chicago) and ending six calendar dates later,
both boundaries inclusive, exactly seven dates total. Example: September 15
through September 21. It is not a payroll week.** The backend derives both
boundaries from that same local calendar (`coverage-shifts` hours_watch,
fixed 2026-09-16); the UI displays the backend's returned window dates and
never computes a seven-day range of its own.

Label it "Next 7 days" with the returned dates as context ("Sep 15–Sep 21").
Do not write "weekly hours", do not write "overtime", do not compare against a
40-hour threshold, and do not imply a Monday to Sunday payroll period. No
overtime rule is implemented anywhere in the system, so the UI states the
arithmetic and stops:

```
NEXT 7 DAYS
Robin is currently scheduled 38 hrs · this shift +6 hrs · projected 44 hrs
Sep 15–Sep 21 · Not a payroll week
```

If a payroll-week calculation is wanted later, it gets built deliberately.
Calendar consistency (closed 2026-09-16): MATCH mode and the caregiver
shift-picker now derive both boundaries from the Chicago calendar too. MATCH
uses exactly the Next 7 Days window hours_watch reports (production verified:
`scheduled_next_week` equals `scheduled_hours` for every common caregiver
id), so the matcher chip reads "Xh scheduled · next 7 days". The picker's
`days` parameter means the TOTAL number of local calendar dates returned,
including today (default 14).

Picker 404 semantics (closed 2026-09-16): AxisCare's visits endpoint
returns the identical 404 "No visits found" for BOTH a valid caregiver
with zero matching visits AND a nonexistent caregiver id (probed), so the
visits response can never distinguish the two and body-message matching
must never be used. The picker therefore confirms caregiver existence
independently (GET /api/caregivers/{id}: 200 + results for a valid
caregiver, explicit 404 for a nonexistent one) before treating an initial
visits 404 as an empty result. Confirmed valid + empty returns
`shifts: []` (the Hub's ordinary "No upcoming shifts..." state); a
confirmed-missing caregiver stays an error; any unverifiable state (auth,
5xx, network, malformed) fails closed into an error. Uncertainty is never
an empty list.

## The Schedule Watch tab

### Live Shift Watch

Renders `timekeeper_cases`, the ladder record timekeeper-watch maintains. One
record per visit, never reopened once resolved.

Fields: `id`, `visit_id`, `caregiver`, `caregiver_axiscare_id`,
`client_first`, `client_axiscare_id`, `shift_date`, `shift_time`, `opened_at`,
`texted_at`, `ghl_contact_id`, `office_alerted_at`, `resolved_at`,
`resolved_how`, `minutes_late`, `notes[]`, `no_phone`, `kind`.

`resolved_how` is `clocked_in`, `visit_gone`, `visit_changed` or
`clocked_out`. Rows with `kind === 'clock_out'` are the separate clock-out
reminders: one text, no office ladder.

**The real escalation ladder, and the only one the UI may depict:**

1. `timekeeper_grace_min` (default 3) past the scheduled start with no
   AxisCare clock-in: Cara texts the caregiver, if `timekeeper_text_live`
   permits and the number passes the outbound gate.
2. `timekeeper_grace_min + timekeeper_office_after_min` (default 3 + 7) still
   with no clock-in: an URGENT Operations Inbox item plus SMS to
   `timekeeper_alert_phones`.
3. **A person from the office makes the phone call.** Cara's automated ladder
   ends at "Office alerted". The human step is "Office follow-up needed".

**`timekeeper_call_live` is reserved and unimplemented. Cara does not place
voice calls.** Never render "Cara calling", "Cara initiated call", or any
wording that suggests automated voice contact.

The clock-out path is separate: one reminder at
`timekeeper_clockout_grace_min` (default 10) past the scheduled end, no office
ladder, because the client was served and only payroll and EVV are at stake.

**Render only recorded events.** The timeline is built from stored timestamps:
scheduled start, `opened_at`, `texted_at`, `office_alerted_at`, `resolved_at`,
plus `notes[]`. Do not insert narrative steps between them that correspond to
no stored event.

**Do not recompute minutes late in the browser.** AxisCare returns zone-naive
local timestamps; timekeeper-watch compares them naive to naive on purpose, and
a browser-side Date comparison reintroduces a five to six hour skew. Use the
stored `minutes_late` and the stored timestamps.

Respect `no_phone`, `cara_skip` (scopes `clock`, `confirm`, `all`),
`timekeeper_watch_live` and `timekeeper_text_live`. When the watch is in dry
run, say so on the screen rather than implying texts are going out.

### Healthy and starting-soon visits

Not built. `timekeeper_cases` only holds problem visits, and
`coverage-shifts {today_board:true}` returns counts only. The screen is laid
out so a healthy feed can drop in later without restructuring. **Do not
fabricate a monitored-visit list.**

### Upcoming schedule and hours

The existing Hours Watch functionality is preserved beneath Live Shift Watch:
the self-reported target hours against AxisCare scheduled hours, the
biggest-gap-first ordering, the new-hire flag, the availability invite, and the
intake matcher ("who could staff Mon/Wed/Fri mornings"). Same "Next 7 days"
labelling rule applies to its hours.

## The EVV tab

Unchanged. The Staffing hub's correction log, framed, with an out-link
fallback for browsers that refuse the embed. The correction form, its reason
codes and the client signature requirement all live in that implementation and
are its business, not this one's.

Do not port the Staffing hub EVV code into cc-hub-live. Do not invent a second
approver or a sign-off step that the implementation does not have.

## Explicitly out of scope

- Distance in miles. Nothing is geocoded.
- Client authorized hours. No source exists for them in either repository.
- Overtime thresholds, overtime labels, or a payroll-week hours figure.
- AI match scores, personality or soft-skill claims.
- Per-caregiver communication channel preference. Cara does not learn or
  display which channel somebody prefers.
- Automated voice calls.
- Contact-everyone outreach mode.
- Any new notification or chat system.

## ENGINE work, identified and deliberately not built

1. **Candidate preview.** `coverage-run` returns `this_wave` and
   `next_in_line` with tier reasons in its HTTP response only, never
   persisted. A read-only `?preview=1&case=<id>` mode, JWT gated, would let
   the UI render the ranked-caregivers table.
2. **Pause Outreach.** A `c.paused` flag that coverage-run honours at the top
   of its per-case loop.
3. **A healthy-visit read mode** for Live Shift Watch.
4. **Timekeeper to Coverage handoff.** Nothing creates a coverage case from a
   `timekeeper_cases` row. For now the Shift Watch detail deep-links into the
   existing manual case opener, which is the same workflow a coordinator would
   use anyway.

None of these change existing behaviour and none of them are in this build.

## Gates: never flip these as a side effect of UI work

`coverage_send_live`, `coverage_watch_live`, `timekeeper_watch_live`,
`timekeeper_text_live`, `confirm_live`. Everything is dry run until a person
turns it on deliberately.

## Deploy

cc-hub-live is edit, commit, push (GitHub Pages, cc.mo-care.com). Engine bits
are Staffing-Coordinator-Hub functions via the usual supabase deploy .command.
