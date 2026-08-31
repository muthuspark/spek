// Progress grouping for active changes. "Active" only means the change is not archived, which says
// nothing about whether the work has begun — a parked proposal with an untouched tasks.md looked
// exactly as live as one 8 tasks into 12. `tasks.md` checkboxes are the one place OpenSpec records
// progress, so they are the whole predicate: no mtime, no git state.

import type { ChangeInfo } from "@spekjs/core";

interface ProgressSource {
  taskStats: { total: number; completed: number } | null;
}

/** A change is started once at least one task is checked. No tasks.md / no checkboxes → not started. */
export function isStarted(c: ProgressSource): boolean {
  return !!c.taskStats && c.taskStats.completed > 0;
}

/** Split active changes into the two progress groups, preserving the incoming sort order. */
export function splitByProgress<T extends ProgressSource>(
  changes: readonly T[],
): { inProgress: T[]; notStarted: T[] } {
  const inProgress: T[] = [];
  const notStarted: T[] = [];
  for (const c of changes) {
    (isStarted(c) ? inProgress : notStarted).push(c);
  }
  return { inProgress, notStarted };
}

export type ChangeProgressGroups = ReturnType<typeof splitByProgress<ChangeInfo>>;
