import { SpecGraph } from "@spekjs/ui";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGraphData } from "../hooks/useOpenSpec";

/**
 * `/graph` 頁。
 *
 * 力導向圖本身住在 `@spekjs/ui`（下游的 Electron 工作台用同一份）。這一頁只做**宿主的事**：
 * 取數、loading / error 狀態、以及把使用者的選擇接回 react-router。
 */
export function GraphView() {
  const { data, loading, error } = useGraphData();
  const navigate = useNavigate();

  const handleSelectSpec = useCallback(
    (topic: string) => navigate(`/specs/${topic}`),
    [navigate],
  );

  // 聚合圖的 change 節點帶著來源 worktree —— 導覽時要把它帶上，同名 slug 才分得出來。
  const handleSelectChange = useCallback(
    (slug: string, worktreeKey?: string) =>
      navigate(worktreeKey ? `/changes/${slug}?wt=${worktreeKey}` : `/changes/${slug}`),
    [navigate],
  );

  if (loading) {
    return <p className="text-text-muted">Loading graph...</p>;
  }
  if (error) {
    return <p className="text-danger">Error: {error}</p>;
  }
  if (!data || data.edges.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <p className="text-text-muted">No spec-change relationships to visualize.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <div className="card relative h-[calc(100vh-13rem)] overflow-hidden">
        <SpecGraph
          data={data}
          onSelectSpec={handleSelectSpec}
          onSelectChange={handleSelectChange}
        />
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <p className="eyebrow text-text-muted mb-3">Relationships</p>
      <h1 className="heading">Graph</h1>
    </header>
  );
}
