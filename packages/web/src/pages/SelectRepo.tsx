import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRepo } from "../contexts/RepoContext";
import { useDetect } from "../hooks/useOpenSpec";

type PathStatus = "checking" | "valid" | "invalid";

function getProjectName(projectPath: string): string {
  const normalizedPath = projectPath.replace(/[\\/]+$/, "");
  return normalizedPath.split(/[\\/]/).pop() || projectPath;
}

export function SelectRepo() {
  const { setRepoPath, recentPaths, removePath } = useRepo();
  const navigate = useNavigate();

  const [inputPath, setInputPath] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pathStatuses, setPathStatuses] = useState<Record<string, PathStatus>>({});

  const detect = useDetect(inputPath);

  async function selectFolder() {
    setPickerLoading(true);
    setPickerError(null);
    try {
      const response = await fetch("/api/fs/select");
      if (response.status === 204) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to select a folder");
      setInputPath(data.path);
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : "Unable to select a folder");
    } finally {
      setPickerLoading(false);
    }
  }

  // 非同步驗證最近路徑
  useEffect(() => {
    if (recentPaths.length === 0) return;
    const initial: Record<string, PathStatus> = {};
    for (const p of recentPaths) initial[p] = "checking";
    setPathStatuses(initial);

    for (const p of recentPaths) {
      fetch(`/api/fs/detect?path=${encodeURIComponent(p)}`)
        .then((res) => res.json())
        .then((data) => {
          setPathStatuses((prev) => ({ ...prev, [p]: data.hasOpenSpec ? "valid" : "invalid" }));
        })
        .catch(() => {
          setPathStatuses((prev) => ({ ...prev, [p]: "invalid" }));
        });
    }
  }, [recentPaths]);

  function openRepo(repoPath: string) {
    setRepoPath(repoPath);
    navigate("/dashboard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (detect.data?.hasOpenSpec) {
      openRepo(inputPath);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-xl py-16">
        <div className="flex items-center gap-2 text-text-primary mb-16">
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M 20 8.5 C 20 8.5, 23 8.5, 23 11.5 C 23 14.5, 20 16, 16 16 C 12 16, 9 17.5, 9 20.5 C 9 23.5, 12 23.5, 12 23.5"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path d="M 12.8 8.5 L 14.3 7 L 15.8 8.5 L 14.3 10 Z" fill="currentColor" />
            <path d="M 16.2 23.5 L 17.7 22 L 19.2 23.5 L 17.7 25 Z" fill="currentColor" />
          </svg>
          <span className="font-display text-[25px] font-semibold tracking-[-0.02em]">spek</span>
        </div>

        <p className="eyebrow text-accent mb-3">OpenSpec viewer</p>
        <h1 className="display mb-4">Open a repo.</h1>
        <p className="text-text-secondary text-base mb-12">
          Point spek at any folder that contains an <code className="font-mono text-[0.9em] text-text-primary">openspec/</code> directory.
        </p>

        {/* 路徑輸入 */}
        <form onSubmit={handleSubmit} className="mb-12">
          <label htmlFor="repo-path" className="eyebrow block text-text-primary mb-3">Repo path</label>
          <div className="flex gap-2">
            <input
              id="repo-path"
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="/path/to/repo"
              className="field flex-1 h-10 px-3 font-mono text-[13px]"
            />
            <button
              type="button"
              onClick={() => {
                void selectFolder();
              }}
              disabled={pickerLoading}
              className="btn-ghost !h-10"
            >
              {pickerLoading ? "Opening..." : "Browse"}
            </button>
          </div>

          {/* 偵測結果 */}
          {inputPath && !detect.loading && detect.data && (
            <div className="mt-4 card px-4 py-3">
              {detect.data.hasOpenSpec ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs text-text-primary">
                    <span className="text-success mr-2">✓</span>
                    OpenSpec detected <span className="text-text-muted">({detect.data.schema})</span>
                  </span>
                  <button type="submit" className="btn-primary">
                    Open
                  </button>
                </div>
              ) : (
                <span className="font-mono text-xs text-warning">
                  <span className="mr-2">!</span>No openspec/ directory found
                </span>
              )}
            </div>
          )}
          {inputPath && detect.loading && (
            <p className="mt-4 font-mono text-xs text-text-muted">Detecting...</p>
          )}
          {detect.error && (
            <p className="mt-4 font-mono text-xs text-danger">{detect.error}</p>
          )}
          {pickerError && (
            <p className="mt-4 font-mono text-xs text-danger">{pickerError}</p>
          )}
        </form>

        {/* 最近使用路徑 */}
        {recentPaths.length > 0 && (
          <div>
            <h3 className="eyebrow text-text-muted mb-3">Recent</h3>
            <div className="card overflow-hidden divide-y divide-border">
              {recentPaths.map((p) => {
                const status = pathStatuses[p];
                return (
                  <div key={p} className="group flex items-center hover:bg-bg-tertiary transition-colors">
                    <button
                      onClick={() => {
                        setInputPath(p);
                        if (status === "valid") openRepo(p);
                      }}
                      className="flex-1 min-w-0 text-left px-4 py-3 flex items-center gap-3 cursor-pointer"
                      title={p}
                    >
                      {/* 狀態指標 */}
                      {status === "checking" && (
                        <span className="w-3.5 h-3.5 border-[1.5px] border-border-strong border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      )}
                      {status === "valid" && (
                        <svg className="w-3.5 h-3.5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {status === "invalid" && (
                        <svg className="w-3.5 h-3.5 text-danger flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-sm text-text-primary font-medium shrink-0">{getProjectName(p)}</span>
                      <span className="font-mono text-xs text-text-faint truncate">{p}</span>
                    </button>
                    <button
                      onClick={() => removePath(p)}
                      className="p-3 text-text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger transition flex-shrink-0 cursor-pointer"
                      title="Remove from recent"
                      aria-label={`Remove ${getProjectName(p)} from recent`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
