## Context

`ChangeInfo` already carries `taskStats: TaskStats | null` (`{ total, completed }`), parsed from
`tasks.md` by `@spekjs/core`'s `parseTasks`. The Changes page and the Dashboard both already render it
through `TaskProgress`. Nothing new needs to be scanned, served, or plumbed through the adapter — the
only question is where the "started" predicate lives and how the two buckets are presented.

## Goals / Non-Goals

Goals:
- A change with zero progress is visually distinct from one with progress, on both surfaces.
- The predicate is one pure function with unit tests, shared by both pages.
- No behavior change for archived changes, sort order, or any host.

Non-Goals:
- No third state (e.g. "blocked", "done but unarchived"). A change with all tasks complete is still
  In Progress until it is archived; introducing a "Complete" bucket is a separate question.
- No persistence, no filter toggle, no hiding. Both buckets are always visible.
- No `@spekjs/core` change and no new API field. Deriving in the frontend keeps the published core
  API and the three adapters untouched.

## Decisions

### Started = `taskStats.completed > 0`

The predicate is deliberately narrow: a change is started when at least one task is checked.

- `taskStats === null` (no `tasks.md`) → **not started**. A change with no task list has no recorded
  progress, and treating "no evidence of work" as work-in-progress is exactly the conflation this
  change removes.
- `total === 0` (a `tasks.md` with no checkboxes) → **not started**, by the same rule; `completed`
  cannot exceed `total`.
- Deliberately *not* used: file mtimes, git state, or artifact count. Those signal editing activity,
  not task progress, and would make the grouping non-obvious and non-deterministic. `tasks.md`
  checkboxes are the one place OpenSpec records intent about progress.

### Two headings rather than a badge or a filter

Alternatives considered: a `not started` badge on the row (smallest diff, but the count and the
scanning problem remain — the user still reads every row); a default-on filter that hides not-started
changes (fewest rows, but silently hides real work, and a parked proposal is precisely what a user
needs reminding of). Two headed sections make both counts readable at a glance and hide nothing.

### The accent border narrows to In Progress

The 4px left accent border currently marks "active" (as opposed to archived). It becomes the marker
for live work, which is what a reader intuits from it. Not Started rows keep the row layout and the
progress bar (a `0/9` bar is informative — it shows the task list exists and how big it is), just
without the accent. This is the one existing visual contract this change alters, so it is called out
in the `change-browsing` delta.

### Empty buckets render nothing

If every active change is started, no "Not Started" heading appears (and vice versa). The existing
"No changes found" empty state, which covers active *and* archived being empty, is unchanged.

### Dashboard stat card sourced separately from the section

The Dashboard's existing "Active Changes" stat card reads `overview.changesCount.active` — a
different request from the one that fills the list (`useChanges`). The two load independently, and
the page only gates rendering on `overview.loading`. So the new "Not started" card must render a
placeholder (`—`) while `changes.data` is absent, rather than a `0` that would be indistinguishable
from a real zero. The "Active Changes" card keeps its existing overview-backed value, so no card
changes meaning.

## Risks / Trade-offs

- **A user who reads "Not Started" as "nothing here to do" may under-weight parked proposals.** The
  count in the heading and the always-visible section are the mitigation; nothing is collapsed or
  hidden by default.
- **A change tracked outside `tasks.md`** (work happening with no checkbox ever ticked) lands in Not
  Started while genuinely in flight. Accepted: `tasks.md` is the recorded source of progress in
  OpenSpec, and the fix is to tick the box.
- The split lives in the frontend, so a future non-React host would have to re-derive it. Acceptable
  — the predicate is three lines, and pushing a derived field into the published `@spekjs/core` API
  for it would be a heavier commitment than the behavior warrants.
