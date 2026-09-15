# Cara Coverage UI — Build Spec

Adopted 2026-09-15 from Samantha's Phoebe screenshot review. This is the build
prompt for the Cara-facing UI in cc-hub-live/index.html (Scheduling group).
The engine already exists — coverage-watch / coverage-run / coverage-reply /
coverage-assign / coverage-shifts plus timekeeper-watch and shift-confirm.
**This build is almost entirely display: expose state the engine already
records. Where an engine change is required it is marked ENGINE below, and
there are only two.**

## Design law (do not negotiate these away)

1. **AI proposes, a person disposes.** Cara never claims "Successfully
   Filled" until a coordinator clicks Confirm & Assign and coverage-assign's
   read-back verification succeeds (`c.axiscare_assignment`). Before that the
   state is "Coverage Found — Ready to Confirm".
2. **Only substantiated data on screen.** Every "why they match" comes from
   AxisCare/hub data: worked-with-this-client (tier 1 + count from visit
   history), worked in last 14 days (tier 2), availability windows, busy
   check, care level, weekly hours. **No distance in miles** (nothing is
   geocoded — show the caregiver's city instead). No AI-generated traits.
3. **Waves are a feature, show them proudly.** "Wave 1: 5 best matches
   contacted. If no one accepts, Cara contacts the next 5 in 10 minutes."
   Never copy Phoebe's contact-everyone mode.
4. **Keep the caregiver-first case opener.** Pick who's calling off → their
   real AxisCare shifts (coverage-shifts) → click the exact visit. Never a
   retype-the-shift form.
5. No em dashes in any user-facing copy. Never the phrase "plain language".

## Information architecture

Scheduling group (already exists in the fbar) becomes:

- **Cara** — new tab, the command center (Phase 2)
- **Coverage Help** — existing case board, gets the new filters + workspace
- **Hours Watch**, **EVV Corrections** — unchanged

Clicking a case opens the **Coverage Workspace** (expanded case view — can be
the existing expanded card, rebuilt).

## The Coverage Workspace (Phase 1 — build first, cases already exist)

### Progress rail at the top of every case

`1 Call-Off → 2 Matching → 3 Outreach → 4 Responses → 5 Confirm → 6 Close Loop`

States: ✓ complete · ● happening now · ○ waiting · ! needs you.
All derived from existing fields, no new writes:

| Stage | Derivation |
|---|---|
| Call-Off | `opened_at` present → ✓ |
| Matching | `callout_started_at` or any `asked[].auto` → ✓; open case with engine on and neither → ● |
| Outreach | `asked[]` auto entries exist; ● while more `next_in_line` remains and no yes |
| Responses | any `asked[].state` yes/no or coverage_replies row; ● while waiting entries remain |
| Confirm | `pending_fill` → **! Needs You** with the Confirm & Assign button; after confirm → ✓ |
| Close Loop | `axiscare_assignment` + `closure_notified` + `family_notified` → ✓ |

### Shift details block
Client (first name + initial), date, time, original caregiver
(`calling_off`), reason, note. Source: case fields, live-corrected by
coverage-watch (it already updates shift_time on reschedule).

### Ranked caregivers ("Best Caregiver Matches")
"Cara checked N active caregivers. K are eligible for this shift."
Columns: **Caregiver | Client History | Area | Weekly Hrs | Availability |
Why They Match**.
- Client History: "Worked together Nx" (tier 1) / "New to client".
- Area: caregiver city from roster. NOT miles (see design law 2).
- Weekly Hrs: current → projected (+shift hours), from Hours Watch data.
- Why They Match: `tier_why` + busy-check + care-level + no-OT if derivable.
Source: coverage-run already returns `this_wave` and `next_in_line` with
tier/why in its response. **ENGINE (small): add a read-only mode to
coverage-run (`?preview=1&case=<id>`) that returns candidates without
writing or sending, JWT-gated to authenticated, so the UI can render this
table on demand.**

### Live outreach (the strongest borrow)
One card per `asked[]` entry: name, channel icon, sent time, status
(Delivered / YES / NO / Awaiting / Question), and for questions the verbatim
`coverage_replies.raw_reply` with a Respond → link (opens GHL conversation or
the ops item). Below: "Next wave in MM:SS · N caregivers" from
`coverage_wave_fuse_min` + newest ask time + `next_in_line`.
**Pause Outreach button — ENGINE (small): a `c.paused` flag; coverage-run
skips paused cases at the top of its per-case loop; the button toggles it.**
Manual asks (covAsk) render in the same list — asked[] is already the one
record for both.

### Coverage results (audit trail)
Same asked[] data as a compact table once responses exist: name — answer —
time — verbatim reason line. This is the audit trail; keep it on resolved
cases forever.

### Ready to Confirm
When `pending_fill`: side-by-side ORIGINAL (caller, reason) vs REPLACEMENT
(who said yes, accepted time, client history count, city, projected weekly
hours, busy-check result). One button: **Confirm & Assign in AxisCare**
(existing flow → coverage-assign). On verified write-back: "✓ Shift
Successfully Filled — AxisCare assignment verified." On refusal: show
coverage-assign's exact reason ("assign by hand: why") — silence is not a
state.

### Closing the Loop checklist
All flags already exist; render them:
- ✓ Replacement caregiver confirmed (`covered_by`)
- ✓ AxisCare visit updated and verified (`axiscare_assignment`)
- ✓ Other contacted caregivers thanked (`closure_notified` — the courtesy
  texts are ALREADY SENT by coverage-run's closure pass; wording lives in
  settings)
- ✓ Family circle notified (`family_notified` — already sent, existing text)
- ✓ Case resolved (`resolved_at`, `resolved_how`)

## Cara command center tab (Phase 2)

Four cards: **Open Coverage | Cara Working | Ready to Confirm | Filled
Today** (counts derived from coverage_cases; "Cara Working" = open cases
with auto asks and no yes). Below: Active Coverage list — one card per open
case in the spec's format (client, when, detected time, "Wave 2 of 3",
contacted/declined/awaiting/questions counts, View Live Coverage →). Then
Recently Filled. Top line in words: "Cara is working 3 coverage cases. 2 are
waiting on caregivers. 1 has a caregiver ready for your approval. Nothing
else needs your attention."
Also surface timekeeper + shift-confirm activity here later (ladders opened,
morning confirms sent) — same automation_log/timekeeper_cases sources.

## Filters (replace Open / Resolved / All)

`All Open | Finding Coverage | Awaiting Responses | Needs You | Filled | Closed`
**Derived, never new status fields** (do not fork the data model):
- Finding Coverage: open, no unanswered auto asks outstanding yet (or engine
  still ramping)
- Awaiting Responses: open, waiting asks exist, no yes
- Needs You: `pending_fill` (confirm needed) OR `callout_escalated_at`
  (exhausted) OR an unanswered question ops item on the case
- Filled: resolved_how covered/`covered_by` set
- Closed: other resolved

## Explicitly out of scope

- Distance in miles (no geocoding exists)
- Any personality/soft-skill match claims
- Contact-everyone outreach mode
- Automating NEW family/client communication beyond the existing circle text
- Voice calls (Vapi later, staged flags when it comes)

## Build order

1. **Phase 1:** Coverage Workspace on the existing Coverage Help tab
   (progress rail, outreach cards, results table, Ready to Confirm,
   close-loop checklist). Zero engine changes needed.
2. **Phase 2:** Cara tab (command center) + new filters.
3. **Phase 3:** the two ENGINE bits (candidate preview mode, pause flag) +
   ranked-caregivers table wired to preview.

Deploy: cc-hub-live is edit → commit → push (GitHub Pages). Engine bits are
Staffing-Coordinator-Hub functions via the usual supabase deploy .command.
