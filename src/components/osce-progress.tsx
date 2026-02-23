"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const steps = [
  { key: "door_prep", label: "Door Prep" },
  { key: "soap_note", label: "SOAP Note" },
  { key: "completed", label: "Feedback" },
] as const;

type Phase = "door_prep" | "soap_note" | "completed";

const phaseRoutes: Record<string, string> = {
  door_prep: "door-prep",
  soap_note: "soap-note",
  completed: "feedback",
};

export function OsceProgress({
  currentPhase,
  sessionId,
  sessionCompleted,
}: {
  currentPhase: Phase;
  sessionId?: string;
  sessionCompleted?: boolean;
}) {
  const router = useRouter();
  const currentIndex = steps.findIndex((s) => s.key === currentPhase);

  function handleStepClick(stepKey: string) {
    if (!sessionId || !sessionCompleted) return;
    router.push(`/osce/${sessionId}/${phaseRoutes[stepKey]}`);
  }

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      {steps.map((step, i) => {
        // When session is completed, all non-current steps are shown as done
        const isComplete = sessionCompleted ? i !== currentIndex : i < currentIndex;
        const isCurrent = i === currentIndex;
        const isClickable = !!sessionId && !!sessionCompleted && !isCurrent;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={() => isClickable && handleStepClick(step.key)}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ")) {
                    handleStepClick(step.key);
                  }
                }}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                    : "bg-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:opacity-80"
                )}
              >
                {isComplete ? "✓" : i + 1}
              </div>
              <span
                onClick={() => isClickable && handleStepClick(step.key)}
                className={cn(
                  "text-[10px] font-medium",
                  isCurrent ? "text-primary" : "text-muted-foreground",
                  isClickable && "cursor-pointer hover:text-foreground transition-colors"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 -mt-4",
                  (sessionCompleted || i < currentIndex) ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
