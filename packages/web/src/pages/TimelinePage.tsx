import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChanges, useGraphData } from "../hooks/useOpenSpec";
import type { ChangeInfo } from "@spekjs/core";
// Gantt 時間軸本身住在 @spekjs/ui（下游的 Electron 工作台用同一份）。
// 這一頁只做宿主的事：取數、filter、導航、以及 web 專屬的 worktree badge。
import { buildLanes, ChangeTimeline, type Lane } from "@spekjs/ui";
import { WorktreeBadge } from "../components/WorktreeBadge";
import { changeKey, changeTo } from "../utils/changeLink";
import { isStarted } from "../utils/changeProgress";

// Muted, print-like hues: identity needs distinct colors, but they sit quietly on white paper.
const DEVELOPER_COLORS = [
  "#2f5d9a",
  "#297a3a",
  "#9a3b3b",
  "#7a5c1f",
  "#5e4596",
  "#2f6f73",
  "#8c3a6b",
  "#4d4d4d",
];

function filterChanges(
  list: ChangeInfo[],
  hideActive: boolean,
  hideArchived: boolean,
): ChangeInfo[] {
  return list.filter((c) => {
    if (hideActive && c.status === "active") return false;
    if (hideArchived && c.status === "archived") return false;
    return true;
  });
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 h-7 font-mono text-[11px] rounded-full transition-colors cursor-pointer ${
        active
          ? "bg-accent text-white"
          : "bg-bg-secondary text-text-secondary shadow-[0_0_0_1px_var(--color-border)] hover:text-text-primary hover:shadow-[0_0_0_1px_var(--color-border-strong)]"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function TimelinePage() {
  const { data, loading, error } = useChanges();
  const navigate = useNavigate();
  const [groupByTopic, setGroupByTopic] = useState(false);
  const [hideActive, setHideActive] = useState(false);
  const [hideArchived, setHideArchived] = useState(false);

  // 只在 group toggle 開啟時才 fetch graph
  const graphState = useGraphData();
  const graph = groupByTopic ? graphState.data : null;

  const allChanges = useMemo<ChangeInfo[]>(() => {
    if (!data) return [];
    return [...data.active, ...data.archived];
  }, [data]);

  // Unstarted active changes have not been picked up yet, so keep them out of the timeline.
  // Archived changes remain visible regardless of their task progress.
  const pickedChanges = useMemo(
    () => allChanges.filter((c) => c.status !== "active" || isStarted(c)),
    [allChanges],
  );

  const filtered = useMemo(
    () => filterChanges(pickedChanges, hideActive, hideArchived),
    [pickedChanges, hideActive, hideArchived],
  );

  const { lanes, unknownCreated } = useMemo(
    () => buildLanes(filtered, graph, groupByTopic),
    [filtered, graph, groupByTopic],
  );

  const developerColors = useMemo(() => {
    const developers = [...new Set(
      pickedChanges.map((c) => c.developer).filter((developer): developer is string => !!developer),
    )].sort((a, b) => a.localeCompare(b));
    return new Map(developers.map((developer, index) => [
      developer,
      DEVELOPER_COLORS[index % DEVELOPER_COLORS.length],
    ]));
  }, [pickedChanges]);

  const hasUnknownDeveloper = pickedChanges.some((c) => !c.developer);

  const handleSelectChange = useCallback(
    (c: ChangeInfo) => navigate(changeTo(c)),
    [navigate],
  );

  // worktree badge 只有聚合掃描才有來源可標 —— 它是 web 專屬的，因此由宿主注入而非內建於套件。
  const renderBadge = useCallback(
    (c: ChangeInfo) => (c.source ? <WorktreeBadge source={c.source} /> : null),
    [],
  );

  if (loading) return <p className="text-text-muted">Loading...</p>;
  if (error) return <p className="text-danger">Error: {error}</p>;

  const totalChanges = pickedChanges.length;
  const totalLaneItems = lanes.reduce<number>((acc: number, lane: Lane) => acc + lane.items.length, 0);
  const noTimelineData = totalLaneItems === 0;
  const everyChangeMissingDate =
    totalChanges > 0 && pickedChanges.every((c) => !c.createdDate);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow text-text-muted mb-3">Timeline</p>
        <h1 className="heading">Change lifecycle</h1>
        <p className="text-text-secondary text-sm mt-3">
          Lifecycle of every change as a horizontal Gantt-style timeline.
        </p>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterChip
          label={groupByTopic ? "Grouped by topic" : "Group by topic"}
          active={groupByTopic}
          onClick={() => setGroupByTopic((v) => !v)}
        />
        <div className="h-4 w-px bg-border" />
        <FilterChip
          label="Hide active"
          active={hideActive}
          onClick={() => setHideActive((v) => !v)}
        />
        <FilterChip
          label="Hide archived"
          active={hideArchived}
          onClick={() => setHideArchived((v) => !v)}
        />
      </div>

      {(developerColors.size > 0 || hasUnknownDeveloper) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary" aria-label="Developer legend">
          <span className="eyebrow text-text-muted">Developer</span>
          {[...developerColors.entries()].map(([developer, color]) => (
            <span key={developer} className="inline-flex items-center gap-1.5" title={developer}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
              <span className="max-w-48 truncate">{developer}</span>
            </span>
          ))}
          {hasUnknownDeveloper && (
            <span className="inline-flex items-center gap-1.5" title="No task commit author found">
              <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
              Unknown developer
            </span>
          )}
        </div>
      )}

      {/* Empty states */}
      {totalChanges === 0 && (
        <div className="card p-6 font-mono text-xs text-text-muted">
          No changes found in this repo.
        </div>
      )}

      {totalChanges > 0 && everyChangeMissingDate && (
        <div className="card p-6 font-mono text-xs text-text-muted">
          No created dates are available for these changes, so there&apos;s nothing to place on the timeline.
        </div>
      )}

      {totalChanges > 0 && !everyChangeMissingDate && noTimelineData && (
        <div className="card p-6 font-mono text-xs text-text-muted">
          No changes match the current filters.
        </div>
      )}

      {/* Chart */}
      {totalLaneItems > 0 && (
        <ChangeTimeline
          lanes={lanes}
          groupByTopic={groupByTopic}
          onSelectChange={handleSelectChange}
          renderBadge={renderBadge}
          getChangeColor={(change) => change.developer ? developerColors.get(change.developer) : undefined}
        />
      )}

      {/* Unknown created */}
      {unknownCreated.length > 0 && (
        <section>
          <h2 className="eyebrow text-text-muted mb-3">
            Unknown created ({unknownCreated.length})
          </h2>
          <ul className="space-y-1">
            {unknownCreated.map((c) => (
              <li key={changeKey(c)}>
                <Link
                  to={changeTo(c)}
                  className="text-xs text-text-muted hover:text-text-primary underline decoration-border underline-offset-[3px] font-mono"
                  title={c.description}
                >
                  {c.slug}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
