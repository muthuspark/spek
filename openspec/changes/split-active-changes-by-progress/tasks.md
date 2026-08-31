## 1. Progress-split utility

- [x] 1.1 Add `packages/web/src/utils/changeProgress.ts` exporting `isStarted(c)` (`taskStats.completed > 0`; null / zero-total → false) and `splitByProgress(list)` → `{ inProgress, notStarted }` preserving input order
- [x] 1.2 Add `changeProgress.test.ts` covering: completed > 0 started; `completed: 0` not started; `taskStats: null` not started; `total: 0` not started; all tasks complete still started; order preserved; empty input

## 2. Changes page

- [x] 2.1 `ChangeList.tsx`: split `active` via `splitByProgress`; render an "In Progress (n)" section and a "Not Started (n)" section in that order, each omitted when empty
- [x] 2.2 `ChangeRow`: separate the left accent border from the progress bar so Not Started rows show the bar without the accent
- [x] 2.3 Verify the "No changes found" empty state (no active and no archived) is unchanged

## 3. Dashboard

- [x] 3.1 `Dashboard.tsx`: split the active changes list into "In Progress (n)" and "Not Started (n)" sub-sections, each omitted when empty; keep the "No active changes" empty state when both are empty
- [x] 3.2 Add a "Not started" stat card showing the not-started count, rendering `—` while `changes.data` has not arrived; leave the "Active Changes" card on its existing overview-backed value

## 4. Specs + verification

- [x] 4.1 Write the `change-browsing` and `dashboard-view` delta specs
- [x] 4.2 `npm test` and `npm run type-check` pass
