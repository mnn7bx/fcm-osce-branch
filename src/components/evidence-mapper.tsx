"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Strip JSON artifacts from a string (brackets, braces, quotes, keys).
 */
function cleanText(s: string): string {
  return s
    .replace(/^\s*[•\-]\s*/, "") // strip bullet prefix
    .replace(/[{}\[\]"]/g, "")   // strip JSON syntax characters
    .replace(/^\w+:\s*/, "")     // strip leading "key: " labels that look like JSON keys
    .trim();
}

/**
 * Extract discrete findings from S/O bullet text.
 * Each bullet line becomes one selectable finding.
 */
export function extractFindings(subjective: string, objective: string): string[] {
  const combined = `${subjective}\n${objective}`;
  const findings: string[] = [];

  // Each line is already a bullet — split on newlines first
  const lines = combined.split(/\n/);
  for (const line of lines) {
    const cleaned = cleanText(line);
    if (
      cleaned.length >= 5 &&
      cleaned.length <= 200 &&
      !cleaned.match(/^(History|Symptoms|Physical Examination|Test Results|Review of Systems|Past Medical|Social|Family|Medications|Allergies|Objective|Subjective|No subjective|No objective)\s*$/i)
    ) {
      findings.push(cleaned);
    }
  }

  return findings;
}

export function EvidenceMapper({
  findings,
  selectedFindings,
  onToggleFinding,
  disabled,
}: {
  findings: string[];
  selectedFindings: string[];
  onToggleFinding: (finding: string) => void;
  disabled?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFindings = useMemo(() => {
    if (!searchQuery.trim()) return findings;
    const q = searchQuery.toLowerCase();
    return findings.filter((f) => f.toLowerCase().includes(q));
  }, [findings, searchQuery]);

  return (
    <div className="space-y-2">
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search findings..."
        className="h-8 text-xs"
        disabled={disabled}
      />

      {/* Selected findings */}
      {selectedFindings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedFindings.map((f, i) => (
            <Badge key={i} variant="default" className="gap-1 pr-1 text-xs">
              <span className="max-w-[200px] truncate">{f}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onToggleFinding(f)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Available findings */}
      <div className="max-h-32 overflow-y-auto rounded border p-1.5 space-y-0.5">
        {filteredFindings.length === 0 ? (
          <p className="text-xs text-muted-foreground p-1">No findings match your search.</p>
        ) : (
          filteredFindings.map((f, i) => {
            const isSelected = selectedFindings.includes(f);
            return (
              <button
                key={i}
                type="button"
                onClick={() => !disabled && onToggleFinding(f)}
                disabled={disabled}
                className={cn(
                  "w-full text-left text-xs px-2 py-1 rounded transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-accent text-muted-foreground"
                )}
              >
                {f}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
