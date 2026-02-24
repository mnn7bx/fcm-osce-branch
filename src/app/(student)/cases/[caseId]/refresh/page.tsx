"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSubmission, FeedbackResult } from "@/types";
import { generateCards, type QuizCard } from "@/lib/quiz-cards";
import { RecallCard, TrueFalseCard, MultipleChoiceCard } from "@/components/quiz-card-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Trophy,
  RotateCcw,
} from "lucide-react";

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
  const emoji =
    pct >= 80 ? "Great job" : pct >= 50 ? "Getting there" : "Keep practicing";

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
              {
                Object.values(feedback.vindicate_coverage).filter(Boolean)
                  .length
              }{" "}
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
  const [quizKey, setQuizKey] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);

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

  // Save score when quiz finishes
  useEffect(() => {
    if (!isFinished || scoreSaved || !user || cards.length === 0) return;
    setScoreSaved(true);
    supabase.from("fcm_quiz_scores").insert({
      user_id: user.id,
      case_id: caseId,
      score: correctCount,
      total: cards.length,
      quiz_mode: "full",
    });
  }, [isFinished, scoreSaved, user, caseId, correctCount, cards.length]);

  const handleNext = useCallback(() => {
    setRevealed(false);
    setCurrentCard((c) => c + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentCard(0);
    setAnswers(new Map());
    setRevealed(false);
    setScoreSaved(false);
    setQuizKey((k) => k + 1);
  }, []);

  // ─── Loading / empty states ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin-slow text-primary" />
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
          {cards.map((_: QuizCard, i: number) => (
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
