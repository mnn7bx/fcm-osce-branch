"use client";

import { cn } from "@/lib/utils";

const steps = [
  { key: "door_prep", label: "Door Prep" },
  { key: "soap_note", label: "SOAP Note" },
  { key: "completed", label: "Feedback" },
] as const;

type Phase = "door_prep" | "soap_note" | "completed";

export function OsceProgress({ currentPhase }: { currentPhase: Phase }) {
  const currentIndex = steps.findIndex((s) => s.key === currentPhase);

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      {steps.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isComplete ? "\u2713" : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 -mt-4",
                  i < currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
