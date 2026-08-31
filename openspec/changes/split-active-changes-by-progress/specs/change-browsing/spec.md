## MODIFIED Requirements

### Requirement: Change list with active/archived separation

The system SHALL display changes grouped into active and archived sections. Active changes SHALL be
further grouped by task progress into an **In Progress** group (changes with at least one completed
task) and a **Not Started** group (changes with no completed tasks, including changes with no
`tasks.md` and changes whose `tasks.md` contains no checkboxes), rendered in that order, each heading
showing its count and each group omitted entirely when empty. A change is "started" when
`taskStats.completed > 0`; `taskStats: null` and `taskStats.total === 0` SHALL both count as not
started. **Only In Progress** changes SHALL carry the left accent color border (4px); Not Started
changes SHALL use the same row layout and task progress bar without the accent border. Archived
changes SHALL remain a single group without an accent border. Changes SHALL be sorted by git timestamp
descending (most recent first) within each group, falling back to slug date when timestamp is
unavailable. Each change row SHALL display a compact lifecycle indicator based on `createdDate` and
`archivedDate` (label words like "Created" / "Archived" are intentionally omitted to reduce visual
noise; the meaning is conveyed by date format and the `→` separator):

- Active changes with `createdDate` SHALL display `<short-date> · <N>d`, where `<short-date>` is the locale-independent month-day form (e.g., `Apr 20`) and `<N>` is the integer day count between `createdDate` and today.
- Archived changes with both `createdDate` and `archivedDate` SHALL display `<short-date> → <short-date> · <N>d`, where `<N>` is the day count between the two dates.
- When `createdDate` is null, the system SHALL fall back to displaying the relative git timestamp (e.g., `2 days ago`) when a git timestamp is available, or the slug date in `YYYY-MM-DD` format otherwise.

The full ISO `createdDate`, `archivedDate`, and git timestamp (when available) SHALL be exposed as tooltip content on hover (the tooltip retains the full labels for clarity).

#### Scenario: Display active changes with progress
- **WHEN** user navigates to the ChangeList page and an active change has `taskStats: { total: 12, completed: 8 }`
- **THEN** the change is listed in an "In Progress" section with a left accent color border, name, and task progress

#### Scenario: Display active changes without progress
- **WHEN** an active change has `taskStats: { total: 9, completed: 0 }`
- **THEN** the change is listed in a "Not Started" section, below the In Progress section
- **AND** the row shows its name and its `0/9` task progress bar, without the left accent border

#### Scenario: Active change with no tasks.md
- **WHEN** an active change has `taskStats: null`
- **THEN** the change is listed in the "Not Started" section

#### Scenario: Active change with all tasks complete
- **WHEN** an active change has `taskStats: { total: 9, completed: 9 }`
- **THEN** the change is listed in the "In Progress" section (a fully-checked change stays there until it is archived)

#### Scenario: Progress group counts
- **WHEN** there are 2 started and 3 not-started active changes
- **THEN** the headings read "In Progress (2)" and "Not Started (3)"

#### Scenario: Every active change is started
- **WHEN** all active changes have at least one completed task
- **THEN** only the "In Progress" section is rendered; no empty "Not Started" heading appears

#### Scenario: No active change is started
- **WHEN** no active change has a completed task
- **THEN** only the "Not Started" section is rendered; no empty "In Progress" heading appears

#### Scenario: Display archived changes
- **WHEN** user navigates to the ChangeList page
- **THEN** archived changes are listed in an "Archived" section sorted by timestamp descending, without accent border, and without progress grouping

#### Scenario: Active change row shows lifecycle
- **WHEN** an active change has `createdDate: "2026-04-20"` and today is `2026-04-25`
- **THEN** the row displays `Apr 20 · 5d`
- **AND** hovering reveals the full ISO `createdDate` and git timestamp (when available) as tooltip content (with `Created:` / `First commit:` labels)

#### Scenario: Archived change row shows lifecycle span
- **WHEN** an archived change has `createdDate: "2026-02-14"` and `archivedDate: "2026-02-22"`
- **THEN** the row displays `Feb 14 → Feb 22 · 8d`
- **AND** hovering reveals full ISO `createdDate` and `archivedDate` as tooltip content (with `Created:` / `Archived:` labels)

#### Scenario: Change without createdDate falls back to timestamp
- **WHEN** a change has `createdDate: null` but a git timestamp is available
- **THEN** the row falls back to the relative git timestamp display (e.g., `2 days ago`)
- **AND** hovering reveals the full ISO timestamp as tooltip content

#### Scenario: Change without createdDate or timestamp
- **WHEN** a change has both `createdDate: null` and no git timestamp
- **THEN** the row falls back to displaying the slug date in `YYYY-MM-DD` format

#### Scenario: No changes
- **WHEN** there are no changes in the repo
- **THEN** system displays an empty state message
