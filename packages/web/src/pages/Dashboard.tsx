import { Link } from "react-router-dom";
import type { ChangeInfo } from "@spekjs/core";
import { useOverview, useChanges } from "../hooks/useOpenSpec";
import { TaskProgress } from "../components/TaskProgress";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { daysBetween, todayIso } from "../utils/lifecycle";
import { WorktreeBadge } from "../components/WorktreeBadge";
import { SchemaBadge } from "../components/SchemaBadge";
import { changeKey, changeTo } from "../utils/changeLink";
import { splitByProgress } from "../utils/changeProgress";

const STALE_THRESHOLD_DAYS = 30;

export function Dashboard() {
  const overview = useOverview();
  const changes = useChanges();

  if (overview.loading) {
    return <p className="text-text-muted">Loading...</p>;
  }
  if (overview.error) {
    return <p className="text-danger">Error: {overview.error}</p>;
  }

  const data = overview.data!;
  const taskPercent =
    data.taskStats.total > 0
      ? Math.round((data.taskStats.completed / data.taskStats.total) * 100)
      : 0;

  const activeChanges = changes.data?.active ?? [];
  const archivedChanges = (changes.data?.archived ?? []).slice(0, 10);
  const showSource = !!changes.data?.aggregated && (changes.data?.worktrees?.length ?? 0) > 1;

  const today = todayIso();
  const archivedSpans = (changes.data?.archived ?? [])
    .filter((c) => c.createdDate && c.archivedDate)
    .map((c) => daysBetween(c.createdDate!, c.archivedDate!));
  let avgLifecycle: string;
  if (archivedSpans.length === 0) {
    avgLifecycle = "—";
  } else {
    const avg = archivedSpans.reduce((sum, n) => sum + n, 0) / archivedSpans.length;
    avgLifecycle = avg < 1 ? "<1d" : `${Math.round(avg)}d`;
  }
  // Same predicate as the Changes page: started = at least one checked task.
  const { inProgress, notStarted } = splitByProgress(activeChanges);
  // The count comes from useChanges, which resolves independently of useOverview (the only thing
  // gating this render), so a bare 0 here would be indistinguishable from a real zero.
  const notStartedValue = changes.data ? notStarted.length : "—";
  const staleActiveCount = activeChanges.filter(
    (c) => c.createdDate && daysBetween(c.createdDate, today) > STALE_THRESHOLD_DAYS,
  ).length;

  return (
    <div className="space-y-16">
      <header>
        <p className="eyebrow text-text-muted mb-3">Overview</p>
        <h1 className="heading">Project status</h1>
      </header>

      {/* Stat grid: one card, cells split by hairlines */}
      <div className="card overflow-hidden grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        <StatCard label="Specs" value={data.specsCount} delay={0} />
        <StatCard label="Active changes" value={data.changesCount.active} delay={40} />
        <StatCard label="Archived changes" value={data.changesCount.archived} delay={80} />
        <StatCard label="Task completion" value={`${taskPercent}%`} delay={120} />
        <StatCard label="Avg lifecycle (archived)" value={avgLifecycle} delay={160} />
        <StatCard label="Stale active (>30d)" value={staleActiveCount} delay={200} />
        <StatCard label="Not started" value={notStartedValue} delay={240} className="col-span-2" />
      </div>

      {/* Active changes, split by whether the work has actually begun */}
      <section>
        <SectionHeader title="Active changes" />
        {activeChanges.length === 0 ? (
          <p className="text-text-muted text-sm">No active changes</p>
        ) : (
          <div className="space-y-8">
            {inProgress.length > 0 && (
              <div>
                <h3 className="eyebrow text-text-muted mb-3">
                  In progress <span className="text-text-faint">· {inProgress.length}</span>
                </h3>
                <div className="space-y-2">
                  {inProgress.map((c) => (
                    <ActiveChangeRow key={changeKey(c)} c={c} showSource={showSource} />
                  ))}
                </div>
              </div>
            )}
            {notStarted.length > 0 && (
              <div>
                <h3 className="eyebrow text-text-muted mb-3">
                  Not started <span className="text-text-faint">· {notStarted.length}</span>
                </h3>
                <div className="space-y-2">
                  {notStarted.map((c) => (
                    <ActiveChangeRow key={changeKey(c)} c={c} showSource={showSource} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 最近封存 */}
      <section>
        <SectionHeader title="Recently archived" />
        {archivedChanges.length === 0 ? (
          <p className="text-text-muted text-sm">No archived changes</p>
        ) : (
          <div className="card overflow-hidden divide-y divide-border">
            {archivedChanges.map((c) => (
              <Link
                key={changeKey(c)}
                to={changeTo(c)}
                className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-bg-tertiary transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-text-secondary text-sm truncate">{c.description}</span>
                  {showSource && c.source && <WorktreeBadge source={c.source} />}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <SchemaBadge schema={c.schema} defaultSchema={c.defaultSchema} />
                  {(c.timestamp || c.date) && (
                    <span className="font-mono text-text-faint text-xs whitespace-nowrap" title={c.timestamp || undefined}>
                      {c.timestamp ? formatRelativeTime(c.timestamp) : c.date}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 導覽卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NavCard to="/specs" eyebrow="Specs" title="Browse spec topics" body="The source of truth for current behavior." />
        <NavCard to="/changes" eyebrow="Changes" title="View every change" body="Proposals, designs and tasks in flight." inverted />
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-[22px] leading-tight font-medium tracking-[-0.6px] mb-5">{title}</h2>;
}

function NavCard({ to, eyebrow, title, body, inverted = false }: {
  to: string;
  eyebrow: string;
  title: string;
  body: string;
  inverted?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group block rounded p-6 transition-colors ${
        inverted
          ? "bg-bg-inverted text-white hover:bg-accent-hover"
          : "card hover:shadow-[0_0_0_1px_var(--color-border-strong)]"
      }`}
    >
      <p className={`eyebrow mb-6 ${inverted ? "text-text-faint" : "text-text-muted"}`}>{eyebrow}</p>
      <h3 className="text-[22px] leading-tight font-medium tracking-[-0.6px] flex items-center gap-2">
        {title}
        <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">&rarr;</span>
      </h3>
      <p className={`mt-1 text-sm ${inverted ? "text-border-strong" : "text-text-secondary"}`}>{body}</p>
    </Link>
  );
}

function ActiveChangeRow({ c, showSource }: { c: ChangeInfo; showSource: boolean }) {
  return (
    <Link
      to={changeTo(c)}
      className="card block p-4 hover:shadow-[0_0_0_1px_var(--color-border-strong)] transition-shadow"
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-text-primary font-medium truncate">{c.description}</span>
          {showSource && c.source && <WorktreeBadge source={c.source} />}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <SchemaBadge schema={c.schema} defaultSchema={c.defaultSchema} />
          {(c.timestamp || c.date) && (
            <span className="font-mono text-text-faint text-xs whitespace-nowrap" title={c.timestamp || undefined}>
              {c.timestamp ? formatRelativeTime(c.timestamp) : c.date}
            </span>
          )}
        </span>
      </div>
      {c.taskStats && <TaskProgress completed={c.taskStats.completed} total={c.taskStats.total} />}
    </Link>
  );
}

function StatCard({ label, value, delay = 0, className = "" }: {
  label: string;
  value: string | number;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`bg-bg-secondary p-5 animate-fade-in-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="eyebrow text-text-muted">{label}</div>
      <div className="mt-4 text-[40px] leading-none font-[450] tracking-[-2px] text-text-primary tabular-nums">
        {value}
      </div>
    </div>
  );
}
