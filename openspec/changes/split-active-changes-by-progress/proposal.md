## Why

"Active" currently means one thing only: the change directory lives under `openspec/changes/` rather
than `openspec/changes/archive/`. It says nothing about whether anyone has begun the work. So a
change whose `tasks.md` is entirely unchecked — a proposal drafted and then parked — sits in the same
"Active" section, with the same left accent border, as a change that is 8 tasks into 12. Reading the
Changes page or the Dashboard, a user cannot tell which changes are actually moving without scanning
every progress bar.

The signal to make that distinction already exists in the data: `ChangeInfo.taskStats.completed`.
It is already fetched, already rendered as a progress bar, and simply not used for grouping.

## What Changes

- Split the Changes page "Active" section into **In Progress** (at least one completed task) and
  **Not Started** (no completed tasks, or no `tasks.md` at all). Each heading carries its count.
- Reserve the left accent border (the "this is live work" marker) for **In Progress** rows. Not Started
  rows keep the same row layout and progress bar, without the accent.
- Apply the same split to the Dashboard's "Active Changes" section, and add a **Not started** stat
  card next to the existing lifecycle cards.
- Keep the underlying `active` / `archived` API shape, the sort order, the row contents, and the
  archived section exactly as they are. This is a grouping and emphasis change in the Web frontend only.

## Capabilities

### Modified Capabilities

- `change-browsing`: The change list's active section splits into In Progress and Not Started by task
  progress; the left accent border narrows to In Progress rows. Archived grouping, sort order, row
  contents, lifecycle display, worktree indicators and links are unaffected.
- `dashboard-view`: The Dashboard's active changes list splits the same way, and a "Not started"
  stat card is added. The existing overview stat cards keep their current values and sources.

## Impact

- **Web frontend only** (`packages/web/src`): a new pure utility `utils/changeProgress.ts`
  (`isStarted` / `splitByProgress`) with unit tests, consumed by `pages/ChangeList.tsx` and
  `pages/Dashboard.tsx`.
- **No `@spekjs/core` change, no API change, no server change.** No new field crosses the adapter
  boundary — the split is derived from `taskStats`, which every adapter already returns.
- VS Code and IntelliJ render the same React pages, so both inherit the split with no host-side work.
  The Demo (`StaticAdapter`) likewise inherits it.
