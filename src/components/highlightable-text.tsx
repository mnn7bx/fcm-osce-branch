"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Bold, Highlighter, X } from "lucide-react";

export interface Annotation {
  start: number;
  end: number;
  type: "highlight" | "bold";
}

export interface LinkedFinding {
  text: string;
  color: string;
}

interface Toolbar {
  top: number;
  left: number;
  selStart: number;
  selEnd: number;
}

/**
 * Compute auto-bold ranges for "• Label:" prefixes on each line.
 * Bolding covers the label text (not the bullet or colon itself).
 */
function computeLabelAnnotations(text: string): Annotation[] {
  const result: Annotation[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    // Match "• Label:" or "• Label :" at the start of a line
    const match = line.match(/^•\s+([^:]+):/);
    if (match) {
      const bulletLen = line.indexOf(match[1]);
      result.push({
        start: offset + bulletLen,
        end: offset + bulletLen + match[1].length,
        type: "bold",
      });
    }
    offset += line.length + 1; // +1 for the \n
  }
  return result;
}

/**
 * Find positions where a linked finding text appears in the source text.
 */
function findLinkedRanges(
  text: string,
  linkedFindings: LinkedFinding[]
): { start: number; end: number; color: string }[] {
  const ranges: { start: number; end: number; color: string }[] = [];
  for (const lf of linkedFindings) {
    const needle = lf.text.toLowerCase();
    const haystack = text.toLowerCase();
    let pos = 0;
    while (pos < haystack.length) {
      const idx = haystack.indexOf(needle, pos);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + lf.text.length, color: lf.color });
      pos = idx + 1;
    }
  }
  return ranges;
}

/** Split text into annotated segments and render spans */
function renderAnnotated(
  text: string,
  annotations: Annotation[],
  linkedFindings?: LinkedFinding[],
  onFindingClick?: (findingText: string) => void
) {
  const allAnnotations = [...computeLabelAnnotations(text), ...annotations];
  const linkedRanges = linkedFindings ? findLinkedRanges(text, linkedFindings) : [];

  if (!allAnnotations.length && !linkedRanges.length) return <>{text}</>;

  const boundaries = new Set([0, text.length]);
  for (const ann of allAnnotations) {
    if (ann.start >= 0 && ann.end <= text.length) {
      boundaries.add(ann.start);
      boundaries.add(ann.end);
    }
  }
  for (const lr of linkedRanges) {
    if (lr.start >= 0 && lr.end <= text.length) {
      boundaries.add(lr.start);
      boundaries.add(lr.end);
    }
  }

  const points = Array.from(boundaries).sort((a, b) => a - b);

  return (
    <>
      {points.slice(0, -1).map((start, i) => {
        const end = points[i + 1];
        const segment = text.slice(start, end);
        const active = allAnnotations.filter((a) => a.start <= start && a.end >= end);
        const highlighted = active.some((a) => a.type === "highlight");
        const bold = active.some((a) => a.type === "bold");

        // Check linked findings overlay
        const activeLinks = linkedRanges.filter((lr) => lr.start <= start && lr.end >= end);
        const hasLink = activeLinks.length > 0;
        const linkColor = hasLink ? activeLinks[0].color : undefined;

        // Find matching finding text for click handler
        const matchedFinding = hasLink && linkedFindings
          ? linkedFindings.find((lf) => {
              return activeLinks.some(
                (lr) =>
                  text.slice(lr.start, lr.end).toLowerCase() ===
                  lf.text.toLowerCase()
              );
            })
          : undefined;

        return (
          <span
            key={`${start}-${end}`}
            onClick={
              matchedFinding && onFindingClick
                ? (e) => {
                    e.stopPropagation();
                    onFindingClick(matchedFinding.text);
                  }
                : undefined
            }
            className={cn(
              highlighted && "bg-yellow-200 dark:bg-yellow-700/60 rounded-[2px]",
              bold && "font-semibold",
              hasLink && "rounded-[2px] cursor-pointer transition-colors"
            )}
            style={
              hasLink && linkColor
                ? {
                    backgroundColor: `${linkColor}20`,
                    borderBottom: `2px solid ${linkColor}`,
                  }
                : undefined
            }
          >
            {segment}
          </span>
        );
      })}
    </>
  );
}

interface HighlightableTextProps {
  text: string;
  annotations: Annotation[];
  onChange: (annotations: Annotation[]) => void;
  className?: string;
  linkedFindings?: LinkedFinding[];
  onFindingClick?: (findingText: string) => void;
}

export function HighlightableText({
  text,
  annotations,
  onChange,
  className,
  linkedFindings,
  onFindingClick,
}: HighlightableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<Toolbar | null>(null);

  /** Dismiss toolbar on outside click */
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setToolbar(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const processSelection = useCallback(() => {
    // Small delay to let mobile browsers finalize the selection
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !containerRef.current) {
        setToolbar(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const containerText = containerRef.current.textContent ?? "";

      // Get character offsets relative to the container text
      const preRange = document.createRange();
      preRange.selectNodeContents(containerRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;
      const end = start + range.toString().length;

      if (start >= end || end > containerText.length) {
        setToolbar(null);
        return;
      }

      // Position toolbar above the selection
      const rect = range.getBoundingClientRect();
      setToolbar({
        top: rect.top + window.scrollY - 44,
        left: Math.max(8, rect.left + rect.width / 2 - 60),
        selStart: start,
        selEnd: end,
      });
    }, 10);
  }, []);

  function addAnnotation(type: "highlight" | "bold") {
    if (!toolbar) return;
    const { selStart, selEnd } = toolbar;

    // Toggle off if identical annotation already exists
    const exact = annotations.findIndex(
      (a) => a.type === type && a.start === selStart && a.end === selEnd
    );
    if (exact !== -1) {
      onChange(annotations.filter((_, i) => i !== exact));
    } else {
      onChange([...annotations, { start: selStart, end: selEnd, type }]);
    }

    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  }

  function clearAll() {
    onChange([]);
    setToolbar(null);
  }

  return (
    <>
      {/* Floating toolbar */}
      {toolbar && (
        <div
          className="fixed z-50 flex items-center gap-1 rounded-md border bg-popover shadow-md px-1 py-1"
          style={{ top: toolbar.top, left: toolbar.left }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Highlight"
            onClick={() => addAnnotation("highlight")}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
          >
            <Highlighter className="h-3.5 w-3.5 text-yellow-600" />
          </button>
          <button
            type="button"
            title="Bold"
            onClick={() => addAnnotation("bold")}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted transition-colors"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          {annotations.length > 0 && (
            <button
              type="button"
              title="Clear all"
              onClick={clearAll}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-destructive/10 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-destructive" />
            </button>
          )}
        </div>
      )}

      {/* Text */}
      <div
        ref={containerRef}
        onMouseUp={processSelection}
        onTouchEnd={processSelection}
        className={cn("select-text whitespace-pre-line cursor-text", className)}
      >
        {renderAnnotated(text, annotations, linkedFindings, onFindingClick)}
      </div>
    </>
  );
}
