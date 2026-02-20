"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSubmission, FeedbackResult } from "@/types";
import { VINDICATE_CATEGORIES } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
  Trophy,
  RotateCcw,
  Brain,
  Stethoscope,
} from "lucide-react";

// ─── Quiz card types ────────────────────────────────────────────────
type QuizCard =
  | { type: "recall"; question: string; answer: string }
  | {
      type: "true_false";
      statement: string;
      correct: boolean;
      explanation: string;
    }
  | {
      type: "multiple_choice";
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };

// ─── Card generation from submission + feedback ─────────────────────
function generateCards(
  caseData: FcmCase,
  submission: FcmSubmission,
  feedback: FeedbackResult
): QuizCard[] {
  const cards: QuizCard[] = [];
  const studentDiagnoses = submission.diagnoses.map((d) => d.diagnosis);

  // 1. Chief complaint recall (always first)
  cards.push({
    type: "recall",
    question: "What was this week's chief complaint?",
    answer: caseData.chief_complaint,
  });

  // 2. True/False: "Was [diagnosis] in your differential?"
  // Pick 2 that were + 1 that wasn't (from missed)
  const allMissed = [...feedback.common_missed, ...feedback.cant_miss_missed];
  const shuffledStudent = shuffle([...studentDiagnoses]).slice(0, 2);
  const shuffledMissed = shuffle([...allMissed]).slice(0, 1);
  for (const d of shuffledStudent) {
    cards.push({
      type: "true_false",
      statement: `"${d}" was in your differential`,
      correct: true,
      explanation: `Yes — you included ${d} in your submission.`,
    });
  }
  for (const d of shuffledMissed) {
    cards.push({
      type: "true_false",
      statement: `"${d}" was in your differential`,
      correct: false,
      explanation: `No — ${d} was a diagnosis you missed. Remember it for next time.`,
    });
  }

  // 3. Can't-miss identification (multiple choice)
  const allCantMiss = [
    ...feedback.cant_miss_hit,
    ...feedback.cant_miss_missed,
  ];
  if (allCantMiss.length > 0) {
    const target = allCantMiss[0];
    // Build 4 options: correct + 3 distractors
    const distractors = shuffle(
      [...feedback.common_hit, ...feedback.common_missed].filter(
        (d) => !allCantMiss.includes(d)
      )
    ).slice(0, 3);

    if (distractors.length >= 2) {
      const options = shuffle([target, ...distractors]);
      cards.push({
        type: "multiple_choice",
        question: `Which of these is a can't-miss diagnosis for "${caseData.chief_complaint}"?`,
        options,
        correctIndex: options.indexOf(target),
        explanation: `${target} is a can't-miss diagnosis — missing it could lead to serious patient harm.`,
      });
    }
  }

  // 4. VINDICATE category match for a diagnosis they submitted
  const diagWithCategory = submission.diagnoses.find(
    (d) =>
      d.vindicate_categories?.length ||
      d.vindicate_category
  );
  if (diagWithCategory) {
    const catKey =
      diagWithCategory.vindicate_categories?.[0] ||
      diagWithCategory.vindicate_category ||
      "";
    const catLabel =
      VINDICATE_CATEGORIES.find((c) => c.key === catKey)?.label || catKey;

    if (catLabel && catKey) {
      const wrongCats = shuffle(
        VINDICATE_CATEGORIES.filter((c) => c.key !== catKey).map(
          (c) => c.label
        )
      ).slice(0, 3);
      const options = shuffle([catLabel, ...wrongCats]);
      cards.push({
        type: "multiple_choice",
        question: `What VINDICATE category does "${diagWithCategory.diagnosis}" fall under?`,
        options,
        correctIndex: options.indexOf(catLabel),
        explanation: `${diagWithCategory.diagnosis} is categorized as ${catLabel} (${catKey}).`,
      });
    }
  }

  // 5. How many diagnoses did you submit? (recall)
  cards.push({
    type: "recall",
    question: "How many diagnoses did you include in your differential?",
    answer: `${studentDiagnoses.length} diagnoses`,
  });

  // 6. Missed diagnosis reveal (if any missed)
  if (feedback.cant_miss_missed.length > 0) {
    cards.push({
      type: "recall",
      question:
        "Which can't-miss diagnosis did you miss? (Tap to reveal)",
      answer: feedback.cant_miss_missed.join(", "),
    });
  } else if (feedback.common_missed.length > 0) {
    const missed = feedback.common_missed.slice(0, 3);
    cards.push({
      type: "recall",
      question:
        "Name a common diagnosis you missed. (Tap to reveal)",
      answer: missed.join(", "),
    });
  }

  // 7. Most likely diagnosis (multiple choice)
  if (feedback.tiered_differential.most_likely.length > 0) {
    const target = feedback.tiered_differential.most_likely[0];
    const distractors = shuffle(
      [
        ...feedback.tiered_differential.moderate,
        ...feedback.tiered_differential.less_likely,
      ].filter((d) => d !== target)
    ).slice(0, 3);
    if (distractors.length >= 2) {
      const options = shuffle([target, ...distractors]);
      cards.push({
        type: "multiple_choice",
        question: "Which diagnosis was ranked as most likely?",
        options,
        correctIndex: options.indexOf(target),
        explanation: `${target} was the top-ranked diagnosis in the expert differential.`,
      });
    }
  }

  // Shuffle all except the first (chief complaint always first)
  const [first, ...rest] = cards;
  return [first, ...shuffle(rest)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Individual card components ─────────────────────────────────────

function RecallCard({
  card,
  revealed,
  onReveal,
}: {
  card: Extract<QuizCard, { type: "recall" }>;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <Brain className="h-8 w-8 text-primary/60" />
      <p className="text-lg font-medium leading-snug px-2">{card.question}</p>
      {!revealed ? (
        <button
          onClick={onReveal}
          className="mt-2 rounded-2xl border-2 border-dashed border-primary/30 px-8 py-4 text-sm text-primary hover:bg-primary/5 active:scale-95 transition-all"
        >
          Tap to reveal
        </button>
      ) : (
        <div className="rounded-2xl bg-primary/10 px-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-base font-semibold text-primary">{card.answer}</p>
        </div>
      )}
    </div>
  );
}

function TrueFalseCard({
  card,
  answered,
  userAnswer,
  onAnswer,
}: {
  card: Extract<QuizCard, { type: "true_false" }>;
  answered: boolean;
  userAnswer: boolean | null;
  onAnswer: (answer: boolean) => void;
}) {
  const isCorrect = userAnswer === card.correct;

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <Stethoscope className="h-8 w-8 text-primary/60" />
      <p className="text-lg font-medium leading-snug px-2">True or False?</p>
      <p className="text-base text-muted-foreground italic px-4">
        {card.statement}
      </p>

      {!answered ? (
        <div className="flex gap-4 mt-2">
          <button
            onClick={() => onAnswer(true)}
            className="rounded-2xl border-2 border-green-300 bg-green-50 dark:bg-green-950/30 px-8 py-3 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 active:scale-95 transition-all"
          >
            True
          </button>
          <button
            onClick={() => onAnswer(false)}
            className="rounded-2xl border-2 border-red-300 bg-red-50 dark:bg-red-950/30 px-8 py-3 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 active:scale-95 transition-all"
          >
            False
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-2xl px-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
            isCorrect ? "bg-green-50 dark:bg-green-950/30" : "bg-amber-50 dark:bg-amber-950/30"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {isCorrect ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-600" />
            )}
            <span
              className={cn(
                "font-semibold text-sm",
                isCorrect ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
              )}
            >
              {isCorrect ? "Correct!" : "Not quite"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{card.explanation}</p>
        </div>
      )}
    </div>
  );
}

function MultipleChoiceCard({
  card,
  answered,
  selectedIndex,
  onSelect,
}: {
  card: Extract<QuizCard, { type: "multiple_choice" }>;
  answered: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const isCorrect = selectedIndex === card.correctIndex;

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <Brain className="h-8 w-8 text-primary/60" />
      <p className="text-lg font-medium leading-snug px-2">{card.question}</p>

      <div className="w-full space-y-2 px-2">
        {card.options.map((option, i) => {
          let style =
            "border-border bg-background hover:bg-accent/50 active:scale-[0.98]";

          if (answered) {
            if (i === card.correctIndex) {
              style = "border-green-400 bg-green-50 dark:bg-green-950/30";
            } else if (i === selectedIndex && !isCorrect) {
              style = "border-red-400 bg-red-50 dark:bg-red-950/30";
            } else {
              style = "border-border bg-muted/30 opacity-50";
            }
          }

          return (
            <button
              key={i}
              onClick={() => !answered && onSelect(i)}
              disabled={answered}
              className={cn(
                "w-full rounded-xl border-2 px-4 py-3 text-sm text-left transition-all",
                style
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium shrink-0",
                    answered && i === card.correctIndex
                      ? "border-green-400 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : answered && i === selectedIndex && !isCorrect
                      ? "border-red-400 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      : "border-muted-foreground/30"
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
                {answered && i === card.correctIndex && (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-auto shrink-0" />
                )}
                {answered && i === selectedIndex && !isCorrect && (
                  <XCircle className="h-4 w-4 text-red-500 ml-auto shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={cn(
            "rounded-2xl px-5 py-3 text-sm text-left w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
            isCorrect ? "bg-green-50 dark:bg-green-950/30" : "bg-amber-50 dark:bg-amber-950/30"
          )}
        >
          <p className="text-muted-foreground">{card.explanation}</p>
        </div>
      )}
    </div>
  );
}

// ─── Summary screen ─────────────────────────────────────────────────
function SummaryScreen({
  total,
  correct,
  caseData,
  feedback,
  onRestart,
  onBack,
}: {
  total: number;
  correct: number;
  caseData: FcmCase;
  feedback: FeedbackResult;
  onRestart: () => void;
  onBack: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  const emoji = pct >= 80 ? "Great job" : pct >= 50 ? "Getting there" : "Keep practicing";

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <Trophy
        className={cn(
          "h-12 w-12",
          pct >= 80
            ? "text-yellow-500"
            : pct >= 50
            ? "text-blue-500"
            : "text-muted-foreground"
        )}
      />
      <div>
        <p className="text-2xl font-bold">
          {correct}/{total}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{emoji}</p>
      </div>

      {/* Key takeaways */}
      <Card className="w-full text-left">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Key Takeaways
          </p>

          <p className="text-sm">
            <span className="font-medium">Chief complaint:</span>{" "}
            {caseData.chief_complaint}
          </p>

          {feedback.cant_miss_missed.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-amber-700 dark:text-amber-400">
                Can&apos;t-miss to remember:
              </span>{" "}
              {feedback.cant_miss_missed.join(", ")}
            </div>
          )}

          {feedback.common_missed.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Common diagnoses to review:</span>{" "}
              {feedback.common_missed.slice(0, 3).join(", ")}
            </div>
          )}

          {/* VINDICATE coverage reminder */}
          {Object.values(feedback.vindicate_coverage).filter(Boolean).length <
            5 && (
            <p className="text-sm text-muted-foreground">
              Try to expand your VINDICATE coverage next time — you covered{" "}
              {Object.values(feedback.vindicate_coverage).filter(Boolean).length}{" "}
              of 9 categories.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1" onClick={onRestart}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Try Again
        </Button>
        <Button className="flex-1" onClick={onBack}>
          Done
        </Button>
      </div>
    </div>
  );
}

// ─── Main page component ────────────────────────────────────────────
export default function RefreshPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [caseData, setCaseData] = useState<FcmCase | null>(null);
  const [submission, setSubmission] = useState<FcmSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [currentCard, setCurrentCard] = useState(0);
  const [answers, setAnswers] = useState<
    Map<number, { correct: boolean; value: unknown }>
  >(new Map());
  const [revealed, setRevealed] = useState(false);
  const [quizKey, setQuizKey] = useState(0); // for restart

  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      const [caseRes, subRes] = await Promise.all([
        supabase.from("fcm_cases").select("*").eq("id", caseId).single(),
        supabase
          .from("fcm_submissions")
          .select("*")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .single(),
      ]);

      if (caseRes.data) setCaseData(caseRes.data);
      if (subRes.data) setSubmission(subRes.data);
      setLoading(false);
    }

    fetchAll();
  }, [user, caseId]);

  const feedback = submission?.feedback as FeedbackResult | null;

  const cards = useMemo(() => {
    if (!caseData || !submission || !feedback) return [];
    return generateCards(caseData, submission, feedback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData, submission, feedback, quizKey]);

  const correctCount = useMemo(() => {
    let count = 0;
    answers.forEach((a) => {
      if (a.correct) count++;
    });
    return count;
  }, [answers]);

  const currentAnswered = answers.has(currentCard) || revealed;
  const isFinished = currentCard >= cards.length;

  const handleNext = useCallback(() => {
    setRevealed(false);
    setCurrentCard((c) => c + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentCard(0);
    setAnswers(new Map());
    setRevealed(false);
    setQuizKey((k) => k + 1);
  }, []);

  // ─── Loading / empty states ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission || !feedback) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => router.push(`/cases/${caseId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {!submission
              ? "You haven't submitted a differential for this case yet."
              : "Feedback hasn't been generated yet. View your feedback page first."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cards.length === 0) return null;

  // ─── Summary screen ───────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <SummaryScreen
          total={cards.length}
          correct={correctCount}
          caseData={caseData!}
          feedback={feedback}
          onRestart={handleRestart}
          onBack={() => router.push(`/cases/${caseId}`)}
        />
      </div>
    );
  }

  // ─── Quiz UI ──────────────────────────────────────────────────────
  const card = cards[currentCard];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-8rem)] md:min-h-[calc(100dvh-3rem)]">
      {/* Top bar: back + progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push(`/cases/${caseId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit
          </button>
          <span className="text-xs text-muted-foreground">
            {currentCard + 1} / {cards.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i < currentCard
                  ? answers.get(i)?.correct
                    ? "bg-green-500"
                    : "bg-amber-400"
                  : i === currentCard
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          {card.type === "recall" && (
            <RecallCard
              card={card}
              revealed={revealed}
              onReveal={() => {
                setRevealed(true);
                setAnswers((prev) => {
                  const next = new Map(prev);
                  next.set(currentCard, { correct: true, value: null });
                  return next;
                });
              }}
            />
          )}

          {card.type === "true_false" && (
            <TrueFalseCard
              card={card}
              answered={answers.has(currentCard)}
              userAnswer={
                answers.has(currentCard)
                  ? (answers.get(currentCard)!.value as boolean)
                  : null
              }
              onAnswer={(answer) => {
                setAnswers((prev) => {
                  const next = new Map(prev);
                  next.set(currentCard, {
                    correct: answer === card.correct,
                    value: answer,
                  });
                  return next;
                });
              }}
            />
          )}

          {card.type === "multiple_choice" && (
            <MultipleChoiceCard
              card={card}
              answered={answers.has(currentCard)}
              selectedIndex={
                answers.has(currentCard)
                  ? (answers.get(currentCard)!.value as number)
                  : null
              }
              onSelect={(index) => {
                setAnswers((prev) => {
                  const next = new Map(prev);
                  next.set(currentCard, {
                    correct: index === card.correctIndex,
                    value: index,
                  });
                  return next;
                });
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom: Next button */}
      <div className="px-4 pb-6 safe-bottom">
        {currentAnswered && (
          <Button
            onClick={handleNext}
            className="w-full h-12 text-base animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {currentCard === cards.length - 1 ? "See Results" : "Next"}
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
