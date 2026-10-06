import { useState } from "react";
import { Link } from "react-router-dom";
import { useSpecs } from "../hooks/useOpenSpec";

export function SpecList() {
  const { data, loading, error } = useSpecs();
  const [filter, setFilter] = useState("");

  if (loading) return <p className="text-text-muted">Loading...</p>;
  if (error) return <p className="text-danger">Error: {error}</p>;

  const specs = data ?? [];
  const filtered = filter
    ? specs.filter((s) => s.topic.toLowerCase().includes(filter.toLowerCase()))
    : specs;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-text-muted mb-3">
          Specs <span className="text-text-faint">· {specs.length} topics</span>
        </p>
        <h1 className="heading">Specs</h1>
      </header>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter specs..."
        className="field w-full h-9 px-3"
      />

      <div>
        {filtered.length === 0 ? (
          <p className="text-text-muted text-sm">No specs found</p>
        ) : (
          <div className="card overflow-hidden divide-y divide-border">
            {filtered.map((spec) => (
              <Link
                key={spec.topic}
                to={`/specs/${spec.topic}`}
                className="group flex items-center justify-between gap-4 px-4 py-3 hover:bg-bg-tertiary transition-colors"
              >
                <span className="font-mono text-[13px] text-text-primary">{spec.topic}</span>
                <span className="flex items-center gap-3">
                  {spec.historyCount > 0 && (
                    <span className="font-mono text-text-faint text-xs">
                      {spec.historyCount} {spec.historyCount === 1 ? "change" : "changes"}
                    </span>
                  )}
                  <span className="text-text-faint group-hover:text-text-primary transition-colors" aria-hidden="true">&rarr;</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
