import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { D2 } from "@d2lang/d2";
import { slugifyHeading } from "@spekjs/core/headings";
import { splitFrontMatter, type FrontMatterField } from "../utils/frontMatter";

// rehype plugin：為 h2/h3 加上 deterministic id（與 extractHeadings 的 slug 演算法一致）。
// 在 hast 階段處理可避免 React Strict Mode 的 double render 讓 counter 翻倍。
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function hastToText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  if (node.children) return node.children.map(hastToText).join("");
  return "";
}

function rehypeSpekHeadingIds(options?: { idPrefix?: string }) {
  const prefix = options?.idPrefix ?? "";
  return (tree: HastNode) => {
    const counter = new Map<string, number>();
    const walk = (node: HastNode) => {
      if (
        node.type === "element" &&
        (node.tagName === "h2" || node.tagName === "h3")
      ) {
        const base = slugifyHeading(hastToText(node).trim());
        if (base) {
          const n = counter.get(base) ?? 0;
          counter.set(base, n + 1);
          const dedup = n === 0 ? base : `${base}-${n + 1}`;
          node.properties = node.properties ?? {};
          node.properties.id = `${prefix}${dedup}`;
        }
      }
      if (node.children) for (const child of node.children) walk(child);
    };
    walk(tree);
  };
}

interface MarkdownRendererProps {
  content: string;
  specTopics?: string[];
  // 給 ChangeDetail Specs tab 使用：多份 delta spec 合併時以 `<topic>--` 前綴避免 id 衝突
  idPrefix?: string;
}

// BDD keyword styles: monospace stamps. Color is muted and kept only where it carries meaning
// (WHEN/GIVEN = condition, THEN = outcome, MUST/SHALL = obligation, ADDED/MODIFIED = delta kind).
const BDD_STAMP = "font-mono text-[0.8em] tracking-[0.04em] px-1 py-px rounded-xs";
const BDD_KEYWORDS: Record<string, string> = {
  WHEN: `${BDD_STAMP} bg-info/[0.08] text-info`,
  GIVEN: `${BDD_STAMP} bg-info/[0.08] text-info`,
  THEN: `${BDD_STAMP} bg-success/[0.08] text-success`,
  AND: `${BDD_STAMP} bg-black/[0.05] text-text-muted`,
  MUST: "font-mono text-[0.85em] font-medium text-danger",
  SHALL: "font-mono text-[0.85em] font-medium text-danger",
  ADDED: `${BDD_STAMP} bg-success/[0.08] text-success uppercase`,
  MODIFIED: `${BDD_STAMP} bg-info/[0.08] text-info uppercase`,
};

const BDD_PATTERN = new RegExp(
  `\\b(${Object.keys(BDD_KEYWORDS).join("|")})\\b`,
  "g"
);

function highlightBddKeywords(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  BDD_PATTERN.lastIndex = 0;
  while ((match = BDD_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const keyword = match[1];
    parts.push(
      <span key={match.index} className={BDD_KEYWORDS[keyword]}>
        {keyword}
      </span>
    );
    lastIndex = BDD_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function processChildren(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    return highlightBddKeywords(children);
  }
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === "string" ? (
        <span key={i}>{highlightBddKeywords(child)}</span>
      ) : (
        child
      )
    );
  }
  return children;
}

function structurizrToMermaid(source: string): { diagram: string; title?: string } | null {
  const modelStart = source.search(/\bmodel\s*\{/);
  if (modelStart < 0) return null;

  const model = source.slice(modelStart);
  const modelEnd = model.search(/\n\s*}\s*views\b/);
  const modelSource = modelEnd >= 0 ? model.slice(0, modelEnd) : model;
  const elements = new Map<string, { type: string; name: string; description: string; external: boolean }>();
  const relationships: Array<{ from: string; to: string; description: string }> = [];

  for (const line of modelSource.split("\n")) {
    const element = line.match(
      /^\s*([\w-]+)\s*=\s*(person|softwareSystem|container|component)\s+"([^"]+)"(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/
    );
    if (element) {
      elements.set(element[1], {
        type: element[2],
        name: element[3],
        description: element[4] ?? "",
        external: element[5] === "External",
      });
      continue;
    }

    const relationship = line.match(/^\s*([\w-]+)\s*->\s*([\w-]+)\s+"([^"]*)"/);
    if (relationship) {
      relationships.push({
        from: relationship[1],
        to: relationship[2],
        description: relationship[3],
      });
    }
  }

  if (!elements.size || relationships.some(({ from, to }) => !elements.has(from) || !elements.has(to))) {
    return null;
  }

  const escape = (value: string) => value.replace(/"/g, "&quot;").replace(/[\n\r]/g, " ");
  const lines = ["flowchart TB"];
  for (const [id, element] of elements) {
    const type = element.type === "person" ? "Person" : element.type === "softwareSystem" ? "Software System" : element.type;
    const label = `${escape(element.name)}<br/><small>[${type}]</small>${element.description ? `<br/>${escape(element.description)}` : ""}`;
    const shape = `["${label}"]`;
    lines.push(`  ${id}${shape}`);
    if (element.external) lines.push(`  class ${id} external`);
  }
  for (const relationship of relationships) {
    lines.push(`  ${relationship.from} -->|${escape(relationship.description)}| ${relationship.to}`);
  }
  if ([...elements.values()].some(({ external }) => external)) {
    lines.push("  classDef external fill:#ebebeb,color:#4d4d4d,stroke:#c9c9c9");
  }
  const title = source.match(/\btitle\s+"([^"]+)"/)?.[1];
  return { diagram: lines.join("\n"), title };
}

function MermaidDiagram({ source, title, fallbackSource = source }: { source: string; title?: string; fallbackSource?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = `mermaid-${useId().replace(/:/g, "")}`;
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void import("mermaid")
      .then(({ default: mermaid }) => {
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          flowchart: { htmlLabels: true, curve: "linear", nodeSpacing: 50, rankSpacing: 65 },
          themeVariables: {
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
            primaryColor: "#ffffff",
            primaryBorderColor: "#c9c9c9",
            primaryTextColor: "#171717",
            lineColor: "#8f8f8f",
            edgeLabelBackground: "#fafafa",
            tertiaryColor: "#fafafa",
          },
        });
        return mermaid.render(renderId, source.trim());
      })
      .then((result) => {
        if (cancelled || !result || !containerRef.current) return;
        containerRef.current.innerHTML = result.svg;
        result.bindFunctions?.(containerRef.current);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [renderId, source]);

  if (error) {
    return (
      <pre className="card p-4 text-[13px] overflow-x-auto mb-4 leading-relaxed">
        <code className="language-mermaid">{fallbackSource}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram card overflow-x-auto mb-4 p-6 [&_svg]:mx-auto [&_svg]:max-w-full"
      role="img"
      aria-label="Mermaid diagram"
    >
      {title && <div className="eyebrow mt-3 text-center text-text-muted">{title}</div>}
    </div>
  );
}

let d2Promise: Promise<D2> | undefined;
let d2RenderQueue = Promise.resolve();

function getD2(): Promise<D2> {
  d2Promise ??= import("@d2lang/d2").then(({ D2 }) => new D2());
  return d2Promise;
}

function renderD2(source: string, salt: string): Promise<string> {
  const render = d2RenderQueue.then(async () => {
    const d2 = await getD2();
    const compiled = await d2.compile({
      fs: { index: source.trim() },
      options: { layout: "tala" },
    });
    return d2.render(compiled.diagram, {
      ...compiled.renderOptions,
      // 1 = "Neutral Grey": monochrome, matching the light-only UI.
      themeID: 1,
      noXMLTag: true,
      pad: 24,
      salt,
    });
  });
  d2RenderQueue = render.then(() => undefined, () => undefined);
  return render;
}

function D2Diagram({ source }: { source: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = `d2-${useId().replace(/:/g, "")}`;
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (containerRef.current) containerRef.current.textContent = "Rendering D2 diagram…";

    void renderD2(source, renderId)
      .then((svg) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        setError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [renderId, source]);

  if (error) {
    return (
      <pre className="card p-4 text-[13px] overflow-x-auto mb-4 leading-relaxed">
        <code className="language-d2">{source}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="d2-diagram card overflow-x-auto mb-4 p-6 font-mono text-xs text-text-muted [&_svg]:mx-auto [&_svg]:max-w-full"
      role="img"
      aria-label="D2 diagram"
    >
      Rendering D2 diagram…
    </div>
  );
}

// Front matter is document metadata, not content: a quiet mono row above the body.
function FrontMatterRow({ fields }: { fields: FrontMatterField[] }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 mb-8 pb-4 border-b border-border font-mono text-xs">
      {fields.map((f) => (
        <div key={f.key} className="flex gap-2 min-w-0">
          <dt className="eyebrow text-text-faint">{f.key}</dt>
          <dd className="text-text-muted break-all">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MarkdownRenderer({ content, specTopics, idPrefix }: MarkdownRendererProps) {
  const { fields, body } = splitFrontMatter(content);
  return (
    <div className="markdown-body max-w-[760px] text-[15px] leading-[1.7] text-text-secondary">
      {fields.length > 0 && <FrontMatterRow fields={fields} />}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSpekHeadingIds, { idPrefix }]]}
        components={{
          // 段落：套用 BDD 高亮
          p({ children }) {
            return <p className="mb-4">{processChildren(children)}</p>;
          },
          // 列表項：套用 BDD 高亮
          li({ children }) {
            return <li className="mb-1">{processChildren(children)}</li>;
          },
          // 標題
          h1({ children }) {
            return <h1 className="heading mt-8 mb-5">{children}</h1>;
          },
          h2({ id, children }) {
            return <h2 id={id} className="text-[22px] leading-tight font-medium tracking-[-0.6px] mt-12 mb-4 text-text-primary border-b border-border pb-3 scroll-mt-24">{children}</h2>;
          },
          h3({ id, children }) {
            return <h3 id={id} className="text-[17px] leading-snug font-medium tracking-[-0.3px] mt-8 mb-2 text-text-primary scroll-mt-24">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-[15px] font-medium mt-6 mb-2 text-text-primary">{children}</h4>;
          },
          h5({ children }) {
            return <h5 className="eyebrow mt-5 mb-2 text-text-primary">{children}</h5>;
          },
          h6({ children }) {
            return <h6 className="eyebrow mt-5 mb-2 text-text-muted">{children}</h6>;
          },
          // 強調
          strong({ children }) {
            return <strong className="font-semibold text-text-primary">{processChildren(children)}</strong>;
          },
          em({ children }) {
            return <em className="italic text-text-secondary">{children}</em>;
          },
          // 連結
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-text-primary underline decoration-border-strong underline-offset-[3px] hover:decoration-text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          // 程式碼區塊 — 不做 BDD 高亮
          code({ className, children }) {
            const isBlock = className?.startsWith("language-");
            const language = className?.replace(/^language-/, "");
            const source = Array.isArray(children)
              ? children.join("")
              : String(children ?? "");
            if (language === "d2") {
              return <D2Diagram source={source} />;
            }
            if (language === "mermaid" || language === "structurizr" || language === "structurizr-dsl" || language === "dsl") {
              const converted = language === "mermaid" ? { diagram: source } : structurizrToMermaid(source);
              if (converted) {
                return <MermaidDiagram source={converted.diagram} title={converted.title} fallbackSource={source} />;
              }
              return <code className={`${className} block`}>{children}</code>;
            }
            if (isBlock) {
              return (
                <code className={`${className} block`}>
                  {children}
                </code>
              );
            }
            const text = typeof children === "string" ? children : String(children ?? "");
            if (specTopics?.includes(text)) {
              return (
                <Link
                  to={`/specs/${text}`}
                  className="font-mono bg-bg-tertiary shadow-[0_0_0_1px_var(--color-border)] text-success hover:bg-success/[0.08] px-1.5 py-0.5 rounded-xs text-[0.85em] transition-colors"
                >
                  {text}
                </Link>
              );
            }
            return (
              <code className="bg-bg-tertiary shadow-[0_0_0_1px_var(--color-border)] text-text-primary px-1.5 py-0.5 rounded-xs text-[0.85em]">
                {children}
              </code>
            );
          },
          pre({ children }) {
            if (
              children &&
              typeof children === "object" &&
              "type" in children &&
              (children.type === MermaidDiagram || children.type === D2Diagram)
            ) {
              return children;
            }
            return (
              <pre className="card p-4 text-[13px] text-text-primary overflow-x-auto mb-4 leading-relaxed">
                {children}
              </pre>
            );
          },
          // 表格
          table({ children }) {
            return (
              <div className="card overflow-x-auto mb-6">
                <table className="min-w-full border-collapse text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-bg-tertiary">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="eyebrow px-3 py-2 text-left text-text-muted">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-t border-border px-3 py-2 text-text-primary">
                {children}
              </td>
            );
          },
          // Lists: list-outside puts the marker in the left padding gutter, inline with the
          // first line. `list-style-position: inside` breaks a loose list (blank lines between
          // items, so each item's content is a block <p>) — an inline marker can't share a line
          // box with a block, so it gets pushed onto its own line above the text.
          // The gutter must fit the widest marker: a bullet is ~7px, but "99." is 22.2px and
          // "100." is 31.1px, so ol gets pl-8 (32px) while ul stays at pl-6 (24px).
          ul({ children }) {
            return <ul className="list-disc list-outside pl-6 mb-4 space-y-1 marker:text-text-faint">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside pl-8 mb-4 space-y-1 marker:font-mono marker:text-[0.85em] marker:text-text-muted">{children}</ol>;
          },
          // 分隔線
          hr() {
            return <hr className="border-border my-10" />;
          },
          // 引用
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-text-primary pl-4 my-6 text-text-secondary">
                {children}
              </blockquote>
            );
          },
          // 輸入（checkbox）
          input({ checked, type }) {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2 accent-[#171717]"
                />
              );
            }
            return <input type={type} />;
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
