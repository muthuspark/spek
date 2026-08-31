## MODIFIED Requirements

### Requirement: Active changes list

The system SHALL display a list of active changes with their names and task progress indicators,
grouped by task progress into an **In Progress** group (changes with at least one completed task) and
a **Not Started** group (changes with no completed tasks, including changes with no `tasks.md`),
rendered in that order, each heading showing its count and each group omitted when empty. The
"started" predicate SHALL be the same one the change list uses (`taskStats.completed > 0`; `null` and
`total === 0` count as not started).

#### Scenario: Show active changes with progress
- **WHEN** there are active changes in the repo
- **THEN** each active change is displayed with its name and a TaskProgress bar showing completed/total tasks

#### Scenario: Active changes grouped by progress
- **WHEN** there are 2 started and 3 not-started active changes
- **THEN** the Dashboard renders an "In Progress (2)" group and, below it, a "Not Started (3)" group

#### Scenario: One progress group empty
- **WHEN** every active change is started (or every one is not started)
- **THEN** only the non-empty group's heading and rows are rendered

#### Scenario: No active changes
- **WHEN** there are no active changes
- **THEN** system displays an empty state message

## ADDED Requirements

### Requirement: Not-started stat card

The system SHALL display a "Not started" stat card showing the number of active changes with no
completed tasks. Because this count comes from the changes request rather than the overview request,
and the two resolve independently, the card SHALL display a `—` placeholder while the changes data
has not yet arrived, rather than `0`. The existing "Active Changes" card SHALL keep its
overview-backed value (all active changes, started or not). The card SHALL participate in the
staggered entry animation like the other stat cards.

#### Scenario: Not-started count displayed
- **WHEN** the changes data has loaded and 3 active changes have no completed tasks
- **THEN** the "Not started" card displays `3`
- **AND** the "Active Changes" card still displays the total active count from the overview API

#### Scenario: Changes data not yet loaded
- **WHEN** the overview data has loaded but the changes data has not
- **THEN** the "Not started" card displays `—`

#### Scenario: No not-started changes
- **WHEN** the changes data has loaded and every active change has at least one completed task
- **THEN** the "Not started" card displays `0`
