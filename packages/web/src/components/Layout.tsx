import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useRepo } from "../contexts/RepoContext";
import { useFileWatcher } from "../hooks/useFileWatcher";
import { Sidebar } from "./Sidebar";
import { SearchDialog } from "./SearchDialog";
import { AggregationScopeControl } from "./AggregationScopeControl";

function getWorkspaceName(workspacePath: string): string {
  return workspacePath.split(/[\\/]/).filter(Boolean).pop() ?? workspacePath;
}

export function Layout() {
  const { repoPath } = useRepo();
  useFileWatcher();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("spek-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("spek-sidebar-collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setSidebarOpen(false);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!repoPath) {
      navigate("/", { replace: true });
    }
  }, [repoPath, navigate]);

  // Cmd+K / Ctrl+K 全域快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  if (!repoPath) return null;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header
        data-spek-app-header
        className="fixed top-0 left-0 right-0 h-[4.5rem] bg-bg-primary/95 border-b border-border flex items-center gap-3 px-4 md:px-8 z-10"
      >
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Open navigation menu"
            className="p-1.5 -ml-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        )}
        <Link
          to="/"
          aria-label="Go to spek home"
          className="flex items-center gap-2 text-text-primary text-[20px] font-semibold tracking-[-0.02em]"
        >
          <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
            <path
              d="M 20 8.5 C 20 8.5, 23 8.5, 23 11.5 C 23 14.5, 20 16, 16 16 C 12 16, 9 17.5, 9 20.5 C 9 23.5, 12 23.5, 12 23.5"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path d="M 12.8 8.5 L 14.3 7 L 15.8 8.5 L 14.3 10 Z" fill="currentColor" />
            <path d="M 16.2 23.5 L 17.7 22 L 19.2 23.5 L 17.7 25 Z" fill="currentColor" />
          </svg>
          spek
        </Link>
        {!isMobile && (
          <>
            <span className="text-accent text-lg font-light select-none" aria-hidden="true">·</span>
            <span className="font-mono text-[13px] text-text-secondary truncate max-w-64" title={repoPath}>
              {getWorkspaceName(repoPath)}
            </span>
          </>
        )}
        <div className="flex-1 flex justify-center px-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full max-w-sm h-9 px-3 rounded bg-bg-secondary text-text-faint text-sm shadow-[0_0_0_1px_var(--color-border)] hover:shadow-[0_0_0_1px_var(--color-border-strong)] hover:text-text-muted transition-shadow flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[11px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded-xs shadow-[0_0_0_1px_var(--color-border)]">
              ⌘K
            </kbd>
          </button>
        </div>
        <AggregationScopeControl isMobile={isMobile} />
      </header>

      <Sidebar open={sidebarOpen} isMobile={isMobile} collapsed={collapsed} onClose={() => setSidebarOpen(false)} onToggle={toggleCollapsed} />

      {/* Main content */}
      <main className={`pt-28 pb-20 px-4 md:px-10 transition-all duration-200 ${isMobile ? "" : collapsed ? "ml-14" : "ml-60"}`}>
        <div className="mx-auto max-w-[1280px]">
          <Outlet />
        </div>
      </main>

      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
