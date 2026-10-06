import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { HistoryEntry } from "@spekjs/core";
import { extractHeadings } from "@spekjs/core/headings";
import { useSpec, useSpecAtChange } from "../hooks/useOpenSpec";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { SpecDiffViewer } from "../components/SpecDiffViewer";
import { SpecToc } from "../components/SpecToc";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { scrollToAnchorId } from "../utils/scrollOffset";

const TOC_MIN_HEADINGS = 3;

function DiffView({ topic, entry, currentContent, onClose }: {
  topic: string;
  entry: HistoryEntry;
  currentContent: string;
  onClose: () => void;
}) {
  const { data, loading, error } = useSpecAtChange(topic, entry.slug);

  if (loading) return <p className="text-text-muted">Loading diff...</p>;
  if (error) return <p className="text-danger">Error: {error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-medium tracking-[-0.3px]"><span className="eyebrow text-text-muted mr-2">Diff</span>{entry.description}</h2>
        <button
          onClick={onClose}
          className="btn-ghost"
        >
          Close diff
        </button>
      </div>
      <SpecDiffViewer
        oldContent={data.content}
        newContent={currentContent}
        oldLabel={entry.slug}
        newLabel="current"
      />
    </div>
  );
}

export function SpecDetail() {
  const { topic } = useParams<{ topic: string }>();
  const location = useLocation();
  const { data, loading, error } = useSpec(topic ?? "");
  const [compareEntry, setCompareEntry] = useState<HistoryEntry | null>(null);

  const headings = useMemo(
    () => (data ? extractHeadings(data.content) : []),
    [data],
  );

  // Hash 錨點：在內容就緒 + hash 變更時，捲動到對應 heading
  useEffect(() => {
    if (!data || compareEntry) return;
    const hash = location.hash.replace(/^#/, "");
    if (!hash) return;

    let attempts = 0;
    let rafId: number | null = null;

    const tryScroll = () => {
      if (scrollToAnchorId(hash)) return;
      // Markdown 尚未 commit 時 retry 幾次（最多 ~300ms）
      if (attempts++ < 10) {
        rafId = requestAnimationFrame(tryScroll);
      }
    };

    rafId = requestAnimationFrame(tryScroll);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [data, location.hash, compareEntry]);

  if (loading) return <p className="text-text-muted">Loading...</p>;
  if (error) return <p className="text-danger">Error: {error}</p>;
  if (!data) return <p className="text-text-muted">Spec not found</p>;

  const showToc = !compareEntry && headings.length >= TOC_MIN_HEADINGS;

  return (
    <div className="space-y-10">
      <div>
        <Link to="/specs" className="text-text-muted text-base font-medium hover:text-text-primary transition-colors">
          &larr; Back to Specs
        </Link>
        <p className="eyebrow text-text-muted mt-8 mb-3">Spec</p>
        <h1 className="heading font-mono !tracking-[-1px]">{data.topic}</h1>
      </div>

      <div className={showToc ? "xl:grid xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-8" : ""}>
        <div className="min-w-0 space-y-16">
          {compareEntry ? (
            <DiffView
              topic={data.topic}
              entry={compareEntry}
              currentContent={data.content}
              onClose={() => setCompareEntry(null)}
            />
          ) : (
            <MarkdownRenderer content={data.content} />
          )}

          <section>
            <h2 className="eyebrow text-text-muted mb-4">History</h2>
            {data.history.length === 0 ? (
              <p className="text-text-muted text-sm">No changes have affected this spec</p>
            ) : (
              <div className="relative pl-6">
                {/* 垂直時間線 */}
                <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                <div className="space-y-4">
                  {data.history.map((entry) => (
                    <div
                      key={entry.slug}
                      className="relative hover:bg-bg-secondary hover:shadow-[0_0_0_1px_var(--color-border)] rounded p-2 transition-colors"
                      title={entry.developer ? `Developer: ${entry.developer}` : undefined}
                    >
                      {/* 時間線圓點 */}
                      <div className="absolute -left-4 top-3.5 w-2 h-2 rounded-full bg-text-primary ring-4 ring-bg-primary" />
                      <div className="flex items-center gap-2 mb-0.5">
                        {(entry.timestamp || entry.date) && (
                          <span className="text-text-faint text-xs font-mono" title={entry.timestamp || undefined}>
                            {entry.timestamp
                              ? formatRelativeTime(entry.timestamp)
                              : entry.date}
                          </span>
                        )}
                        <span className={`eyebrow !text-[10px] px-1.5 rounded-full ${
                          entry.status === "active"
                            ? "bg-success/[0.08] text-success"
                            : "bg-black/[0.05] text-text-muted"
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/changes/${entry.slug}`}
                          className="text-sm text-text-primary underline decoration-border-strong underline-offset-[3px] hover:decoration-text-primary"
                        >
                          {entry.description}
                        </Link>
                        <button
                          onClick={() => setCompareEntry(compareEntry?.slug === entry.slug ? null : entry)}
                          className={`font-mono text-[11px] h-6 px-2 rounded transition-colors cursor-pointer ${
                            compareEntry?.slug === entry.slug
                              ? "bg-accent text-white"
                              : "text-text-muted shadow-[0_0_0_1px_var(--color-border)] hover:text-text-primary hover:shadow-[0_0_0_1px_var(--color-border-strong)]"
                          }`}
                        >
                          {compareEntry?.slug === entry.slug ? "Comparing" : "Compare"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {showToc && (
          <aside className="hidden xl:block">
            <SpecToc headings={headings} />
          </aside>
        )}
      </div>
    </div>
  );
}
