import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabViewProps {
  tabs: Tab[];
  header?: React.ReactNode;
  sticky?: boolean;
  // 當同時提供 activeId + onChange 時走受控模式（讓外層 page 例如 ChangeDetail 把 tab
  // 同步到 URL query string）；未提供時走內部 state，維持既有未受控行為
  activeId?: string;
  onChange?: (id: string) => void;
}

export function TabView({ tabs, header, sticky, activeId: controlledId, onChange }: TabViewProps) {
  const isControlled = controlledId !== undefined && onChange !== undefined;
  const [internalId, setInternalId] = useState(tabs[0]?.id ?? "");
  const activeId = isControlled ? controlledId : internalId;
  const setActiveId = (id: string) => {
    if (isControlled) onChange(id);
    else setInternalId(id);
  };

  const activeTab = tabs.find((t) => t.id === activeId);

  const tabBar = (
    <>
      {header}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`px-3 py-2.5 text-sm transition-colors border-b-2 -mb-px cursor-pointer ${
              tab.id === activeId
                ? "border-text-primary text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div>
      {sticky ? (
        <div data-spek-scroll-offset className="sticky top-16 z-[5] bg-bg-primary/90 backdrop-blur-xl -mx-4 px-4 md:-mx-8 md:px-8 pb-px">
          {tabBar}
        </div>
      ) : (
        <div className="mb-4">{tabBar}</div>
      )}
      <div key={activeId} className={`animate-fade-in ${sticky ? "mt-6" : ""}`}>
        {activeTab?.content}
      </div>
    </div>
  );
}
