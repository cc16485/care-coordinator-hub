# Care Coordinator Hub: notes for every session

Many Claude sessions build in this repo at the same time. Work in your own worktree from `origin/main`, and pull main right before you build.

## Team Work and the My Work layout: don't break them

Samantha approved these on 2026-10-18.
- **Team Work** is live and switched **on**.
- **My Work tiers** (the grouped Today layout) is live and switched **on** (she turned it on 2026-10-19).

The live switches are hers. Never change `ops_settings.team_work_live`, `ops_settings.my_work_tiers_live`, `ops_settings.ask_help_live` or `ops_settings.quiet_calls_live`.

**What they own:**
- `team-work.js` (`window.TW`)
- `my-work-tiers.js` (`window.MWT`)
- `ask-help.js` (`window.AH`, tracked Ask for help) and its hooks in `team-actions.js` (askSupport, helpWith, partDone, finish, cardTop, othersButtons)
- These hooks in `index.html`:
  - `myWorkBuckets`: `twIds` / `twMine`
  - `myWorkTabs`: the `team` tab
  - `myWorkTabBadge`: `team`
  - `myWorkRows`: team rows are empty
  - `myWorkLane`: `TW.shiftDue`
  - `opsTodayCounts`: `twCare`, reminders left out of the red number
  - `renderMyWork`: the `team` branch, the "TEAM WORK: CARE AT RISK" lane, and the `tiers` block with its `if(!tiers)` lanes
  - Settings sections `data-set="team-work"` and `data-set="my-work-tiers"`

**What feeds them:**
- Any change to how these cards are created or closed, or to the fields they carry, changes Team Work:
  - call follow-ups (`call_followup`, most of Team Work)
  - coverage and staffing cards
  - shift-note flags (`care_note`)
  - journey cards (`step_key`)
  - inquiry cards (`ops_lead_`)
- The fields that matter are `owner`, `claimed_by`, `urgency`, `due`, `escalation`, `client_ax`, `lead_id`, `opened_by` and `kind`.
- Time off is read from one place only: `coordinator_staff.out_until` / `out_from`.

**Before you merge a change that touches any of the above, run all eight:**

```bash
node tests/team-work-test.js
node tests/my-work-tiers-test.js
node tests/ask-help-test.js
python3 tests/browser/team_work_look.py
python3 tests/browser/my_work_tiers_look.py
python3 tests/browser/ask_help_look.py
node tests/quiet-calls-test.js
python3 tests/browser/quiet_calls_look.py
```

The last two (2026-10-29) cover the **quieter call reader** (`ops_settings.quiet_calls_live`, hers to switch): while it is on, a call follow-up stays in Team Work only as a promise not kept, a call nobody could read, or care at risk (`TW.callKept`, the same rule as `callKept` in the Staffing repo's `_shared/call-tasks.ts`). The rest stay with their owner as one "From calls" line in Hub reminders and the AI call reader's "Open from calls" list.

The browser tests serve the files from disk, so no server is needed. The **Team Work and My Work tests** check runs the same eight on every pull request; don't merge while it is red.

If a test fails because the change was intended, say so in the PR and message the "My Work tab organization" session, so the test and the rules are updated together. Don't just loosen the test.
