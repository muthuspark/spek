import { Link } from "react-router-dom";
import type { ChangeInfo } from "@spekjs/core";
import { useChanges } from "../hooks/useOpenSpec";
import { TaskProgress } from "../components/TaskProgress";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { formatLifecycleListRow, todayIso } from "../utils/lifecycle";
import { WorktreeBadge } from "../components/WorktreeBadge";
import { SchemaBadge } from "../components/SchemaBadge";
import { changeKey, changeTo } from "../utils/changeLink";
import { splitByProgress } from "../utils/changeProgress";

function changeMetaDisplay(c: ChangeInfo, today: string): { text: string; tooltip: string } | null {
  const lifecycle = formatLifecycleListRow(c, today);
  const tooltipParts: string[] = [];
  if (c.createdDate) tooltipParts.push(`Created: ${c.createdDate}`);
  if (c.archivedDate) tooltipParts.push(`Archived: ${c.archivedDate}`);
  if (c.timestamp) tooltipParts.push(`First commit: ${c.timestamp}`);
  if (lifecycle) {
    return { text: lifecycle, tooltip: tooltipParts.join("\n") };
  }
  if (c.timestamp) {
    return { text: formatRelativeTime(c.timestamp), tooltip: tooltipParts.join("\n") || c.timestamp };
  }
  if (c.date) {
    return { text: c.date, tooltip: c.date };
  }
  return null;
}

// `accent` = the 4px left border marking live work (In Progress only). `showProgress` = render the
// task bar; Not Started rows get the bar without the accent, archived rows get neither.
function ChangeRow({ c, today, accent, showProgress, showSource }: {
  c: ChangeInfo;
  today: string;
  accent: boolean;
  showProgress: boolean;
  showSource: boolean;
}) {
  const meta = changeMetaDisplay(c, today);
  return (
    <Link
      to={changeTo(c)}
      className={`card block p-4 hover:shadow-[0_0_0_1px_var(--color-border-strong)] transition-shadow${
        accent ? " border-l-4 border-l-accent" : ""
      }`}
    >
      <div className={`flex items-center justify-between gap-4${showProgress ? " mb-3" : ""}`}>
        <span className="flex items-center gap-2 min-w-0">
          <span className={`truncate ${showProgress ? "text-text-primary font-medium" : "text-text-secondary"}`}>
            {c.description}
          </span>
          {showSource && c.source && <WorktreeBadge source={c.source} />}
          {c.isCurrent && (
            <span
              className="shrink-0 font-mono text-[11px] text-white bg-accent rounded-full px-2 py-0.5"
              title="目前 jj working copy (@) 正在編輯這個 change"
            >
              editing
            </span>
          )}
          {c.conflictsWith && (
            <span
              className="shrink-0 font-mono text-[11px] text-warning bg-warning/[0.08] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-warning)_30%,transparent)] rounded-full px-2 py-0.5"
              title={`此 jj workspace 的版本與 ${c.conflictsWith} 的內容分歧`}
            >
              conflicts with {c.conflictsWith}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <SchemaBadge schema={c.schema} defaultSchema={c.defaultSchema} />
          {meta && (
            <span
              className="font-mono text-text-faint text-xs whitespace-nowrap"
              title={meta.tooltip}
            >
              {meta.text}
            </span>
          )}
        </span>
      </div>
      {showProgress && c.taskStats && (
        <TaskProgress completed={c.taskStats.completed} total={c.taskStats.total} />
      )}
    </Link>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="eyebrow text-text-muted mb-3">
      {title} <span className="text-text-faint">· {count}</span>
    </h2>
  );
}

export function ChangeList() {
  // Aggregation scope comes from the global header control via AggregationScopeContext (consumed by
  // useChanges); this page renders no aggregation control of its own.
  const { data, loading, error } = useChanges();

  if (loading) return <p className="text-text-muted">Loading...</p>;
  if (error) return <p className="text-danger">Error: {error}</p>;

  const active = data?.active ?? [];
  const archived = data?.archived ?? [];
  const worktrees = data?.worktrees ?? [];
  const showSource = !!data?.aggregated && worktrees.length > 1;
  const defaultSchema = data?.defaultSchema;
  const today = todayIso();
  const { inProgress, notStarted } = splitByProgress(active);

  const header = (
    <header>
      <p className="eyebrow text-text-muted mb-3">
        Changes
        {defaultSchema && (
          <span className="text-text-faint" title="Repo default OpenSpec schema">
            {" "}· Default schema: <span className="text-text-muted">{defaultSchema}</span>
          </span>
        )}
      </p>
      <h1 className="heading">Changes</h1>
    </header>
  );

  if (active.length === 0 && archived.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <p className="text-text-muted">No changes found</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {header}

      {inProgress.length > 0 && (
        <section>
          <SectionTitle title="In Progress" count={inProgress.length} />
          <div className="space-y-2">
            {inProgress.map((c) => (
              <ChangeRow key={changeKey(c)} c={c} today={today} accent showProgress showSource={showSource} />
            ))}
          </div>
        </section>
      )}

      {notStarted.length > 0 && (
        <section>
          <SectionTitle title="Not Started" count={notStarted.length} />
          <div className="space-y-2">
            {notStarted.map((c) => (
              <ChangeRow
                key={changeKey(c)}
                c={c}
                today={today}
                accent={false}
                showProgress
                showSource={showSource}
              />
            ))}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <section>
          <SectionTitle title="Archived" count={archived.length} />
          <div className="space-y-2">
            {archived.map((c) => (
              <ChangeRow
                key={changeKey(c)}
                c={c}
                today={today}
                accent={false}
                showProgress={false}
                showSource={showSource}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
