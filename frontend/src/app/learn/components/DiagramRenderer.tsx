"use client";

import { useEffect, useRef } from "react";

interface DiagramRendererProps {
  mermaidCode: string;
}

// The voice tutor's show_diagram tool sometimes emits source with literal
// backslash-n sequences ("mindmap\n  Root\n  Child") instead of real newlines
// — that happens when the model double-escapes in the function_call JSON, and
// JSON.parse leaves us with the two characters "\" and "n". Mermaid then sees
// the whole diagram as line 1 and throws. Unescape defensively.
// Also strip `classDef ...` / `class ...` lines when used inside a mindmap:
// those directives are flowchart-only and cause "Parse error" even after the
// newlines are fixed.
function sanitizeMermaid(raw: string): string {
  const unescaped = raw
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "  ");
  const trimmed = unescaped.trim();
  const firstLine = trimmed.split("\n", 1)[0]?.trim().toLowerCase() ?? "";
  if (firstLine.startsWith("mindmap")) {
    return trimmed
      .split("\n")
      .filter((line) => !/^\s*class(Def)?\b/.test(line))
      .join("\n");
  }
  return trimmed;
}

export default function DiagramRenderer({ mermaidCode }: DiagramRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    // Remove any stray error SVGs that Mermaid v11 leaves behind at document
    // level when a render fails. Without this, every bad diagram the tutor
    // emits stacks a new "Syntax error in text" banner at the top of the page.
    function cleanupMermaidOrphans() {
      document
        .querySelectorAll('svg[aria-roledescription="error"], [id^="dmermaid-"]')
        .forEach((el) => el.remove());
    }

    async function render() {
      if (!containerRef.current || !mermaidCode.trim()) return;

      const source = sanitizeMermaid(mermaidCode);

      const showFallback = (message: string) => {
        if (!containerRef.current) return;
        const escaped = source
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        containerRef.current.innerHTML = `
          <div class="text-xs text-gray-500 space-y-2 w-full">
            <p class="font-medium text-gray-600">Couldn't render this diagram. Showing the source instead:</p>
            <pre class="bg-white border border-gray-200 rounded p-2 overflow-auto whitespace-pre-wrap">${escaped}</pre>
            <p class="text-[10px] text-gray-400">${message}</p>
          </div>
        `;
      };

      let mermaid: typeof import("mermaid").default;
      try {
        mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });
      } catch (err) {
        if (!cancelled) showFallback(err instanceof Error ? err.message : String(err));
        return;
      }

      // Validate first so we never let mermaid attempt a render on bad input
      // (that's the path that pollutes the DOM with orphan error SVGs).
      try {
        await mermaid.parse(source);
      } catch (err) {
        cleanupMermaidOrphans();
        if (!cancelled) showFallback(err instanceof Error ? err.message : String(err));
        return;
      }

      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, source);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        cleanupMermaidOrphans();
        if (!cancelled) showFallback(err instanceof Error ? err.message : String(err));
      }
    }

    render();
    return () => {
      cancelled = true;
      cleanupMermaidOrphans();
    };
  }, [mermaidCode]);

  return (
    <div className="my-4 rounded-xl border border-gray-200 bg-gray-50 p-4 overflow-x-auto">
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}
