interface TaskProgressProps {
  completed: number;
  total: number;
}

export function TaskProgress({ completed, total }: TaskProgressProps) {
  if (total === 0) {
    return <span className="eyebrow text-text-faint">No tasks</span>;
  }

  const percent = Math.round((completed / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${completed === total ? "bg-success" : "bg-accent"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-mono text-xs text-text-muted whitespace-nowrap tabular-nums">
        {completed} / {total}
      </span>
    </div>
  );
}
