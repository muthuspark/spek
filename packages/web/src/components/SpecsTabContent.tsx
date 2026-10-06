import { MarkdownRenderer } from "./MarkdownRenderer";

interface SpecsTabContentProps {
  specs: { topic: string; content: string }[];
}

// Change 的 Specs tab：多份 delta spec 合併渲染。
// 每份 spec 的 heading id 以 `<topic>--` 為前綴，避免不同 spec 間 slug 衝突
// （例如兩 spec 同時有 `### Requirement: Foo`）。
export function SpecsTabContent({ specs }: SpecsTabContentProps) {
  return (
    <div className="space-y-12">
      {specs.map((spec) => (
        <section key={spec.topic} id={`spec-${spec.topic}`}>
          <h3 className="eyebrow text-text-muted mb-3">
            <span className="text-text-faint">spec /</span> {spec.topic}
          </h3>
          <MarkdownRenderer content={spec.content} idPrefix={`${spec.topic}--`} />
        </section>
      ))}
    </div>
  );
}
