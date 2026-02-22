"use client";

import { useState } from "react";
import type { DoorPrepDiagnosis } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import { ConfidenceRating } from "@/components/confidence-rating";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { searchPEManeuvers } from "@/data/pe-lookup";

export function DoorPrepDiagnosisRow({
  diagnosis,
  index,
  total,
  disabled,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdate,
}: {
  diagnosis: DoorPrepDiagnosis;
  index: number;
  total: number;
  disabled?: boolean;
  onRemove: (i: number) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onUpdate: (i: number, updated: DoorPrepDiagnosis) => void;
}) {
  const [showQuestions, setShowQuestions] = useState(
    diagnosis.history_questions.length > 0
  );

  function updateField(fields: Partial<DoorPrepDiagnosis>) {
    onUpdate(index, { ...diagnosis, ...fields });
  }

  function addQuestion() {
    updateField({
      history_questions: [...diagnosis.history_questions, ""],
    });
    if (!showQuestions) setShowQuestions(true);
  }

  function updateQuestion(qi: number, value: string) {
    const updated = [...diagnosis.history_questions];
    updated[qi] = value;
    updateField({ history_questions: updated });
  }

  function removeQuestion(qi: number) {
    updateField({
      history_questions: diagnosis.history_questions.filter((_, i) => i !== qi),
    });
  }

  function addManeuver(term: string) {
    updateField({
      pe_maneuvers: [...diagnosis.pe_maneuvers, term],
    });
  }

  function removeManeuver(mi: number) {
    updateField({
      pe_maneuvers: diagnosis.pe_maneuvers.filter((_, i) => i !== mi),
    });
  }

  return (
    <Card className="py-3">
      <CardContent className="px-4 py-0 space-y-3">
        {/* Top bar: number, name, reorder/remove */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {index + 1}.
            </span>
            <span className="text-sm font-medium truncate">
              {diagnosis.diagnosis}
            </span>
          </div>
          {!disabled && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                aria-label="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onMoveDown(index)}
                disabled={index === total - 1}
                aria-label="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(index)}
                aria-label="Remove diagnosis"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Confidence */}
        {!disabled && (
          <ConfidenceRating
            value={diagnosis.confidence}
            onChange={(val) => updateField({ confidence: val })}
          />
        )}

        {/* History Questions */}
        {!disabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                History Questions
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={addQuestion}
                className="h-6 text-xs px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {showQuestions &&
              diagnosis.history_questions.map((q, qi) => (
                <div key={qi} className="flex gap-1.5">
                  <Input
                    value={q}
                    onChange={(e) => updateQuestion(qi, e.target.value)}
                    placeholder={`Question ${qi + 1}...`}
                    className="h-8 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeQuestion(qi)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
          </div>
        )}

        {/* PE Maneuvers */}
        {!disabled && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              PE Maneuvers
            </span>
            <AutocompleteInput
              onAdd={addManeuver}
              existingTerms={diagnosis.pe_maneuvers}
              searchFn={searchPEManeuvers}
              placeholder="Search PE maneuvers..."
              disabled={disabled}
              hideAddButton
            />
            {diagnosis.pe_maneuvers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {diagnosis.pe_maneuvers.map((m, mi) => (
                  <Badge
                    key={mi}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    <span className="text-xs">{m}</span>
                    <button
                      type="button"
                      onClick={() => removeManeuver(mi)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
