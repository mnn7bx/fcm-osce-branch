"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";

type Mode = "list" | "text" | "voice";

export default function OscePage() {
  const { user } = useUser();
  const [cases, setCases] = useState<FcmCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<FcmCase | null>(null);
  const [mode, setMode] = useState<Mode>("list");
  const [textResponse, setTextResponse] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    async function fetchCases() {
      // Get cases that user has submitted
      const { data: submissions } = await supabase
        .from("fcm_submissions")
        .select("case_id")
        .eq("user_id", user!.id)
        .in("status", ["submitted", "resubmitted"]);

      if (submissions && submissions.length > 0) {
        const caseIds = submissions.map((s) => s.case_id);
        const { data: casesData } = await supabase
          .from("fcm_cases")
          .select("*")
          .in("id", caseIds)
          .order("sort_order");

        if (casesData) setCases(casesData);
      }
      setLoading(false);
    }

    if (user) fetchCases();
  }, [user]);

  function startCase(c: FcmCase, m: Mode) {
    setSelectedCase(c);
    setMode(m);
    setTextResponse("");
    setVoiceText("");
    setEvaluation(null);
  }

  function goBack() {
    setSelectedCase(null);
    setMode("list");
    setEvaluation(null);
    setTextResponse("");
    setVoiceText("");
    stopRecording();
  }

  async function submitResponse(content: string, type: "text" | "voice") {
    if (!user || !selectedCase || !content.trim()) return;
    setEvaluating(true);
    try {
      const res = await fetch("/api/osce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          case_id: selectedCase.id,
          response_content: content,
          response_type: type,
        }),
      });
      const data = await res.json();
      if (data.evaluation) setEvaluation(data.evaluation);
    } catch {
      setEvaluation("Unable to generate evaluation. Please try again.");
    }
    setEvaluating(false);
  }

  function startRecording() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setEvaluation(
        "Speech recognition is not supported in your browser. Try Chrome on mobile."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalText = "";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setVoiceText(finalText + interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setVoiceText("");
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Case list view
  if (mode === "list") {
    return (
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">OSCE Prep</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Practice presenting your differential from memory
          </p>
        </div>

        {cases.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Submit at least one case differential to unlock OSCE practice.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {c.chief_complaint}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Badge variant="outline">{c.body_system}</Badge>
                    <Badge variant="outline">{c.difficulty}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCase(c, "text")}
                    >
                      Type Response
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCase(c, "voice")}
                    >
                      <Mic className="h-3.5 w-3.5 mr-1" />
                      Voice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Practice view (text or voice)
  return (
    <div className="p-4 space-y-4">
      <button
        onClick={goBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </button>

      {/* Case prompt — only chief complaint */}
      <Card className="border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase">
              OSCE Practice
            </span>
          </div>
          <p className="text-sm font-medium">
            {selectedCase?.chief_complaint}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Present your differential diagnosis from memory.{" "}
            {mode === "voice"
              ? "Tap the microphone to begin speaking."
              : "Type your response below."}
          </p>
        </CardContent>
      </Card>

      {/* Text mode */}
      {mode === "text" && !evaluation && (
        <div className="space-y-3">
          <Textarea
            value={textResponse}
            onChange={(e) => setTextResponse(e.target.value)}
            placeholder="List your differential diagnoses and briefly explain your reasoning..."
            className="min-h-[150px]"
          />
          <Button
            onClick={() => submitResponse(textResponse, "text")}
            disabled={!textResponse.trim() || evaluating}
            className="w-full"
          >
            {evaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Evaluating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Submit for Feedback
              </>
            )}
          </Button>
        </div>
      )}

      {/* Voice mode */}
      {mode === "voice" && !evaluation && (
        <div className="space-y-3">
          {voiceText && (
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Captured speech:
                </p>
                <p className="text-sm">{voiceText}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              className="flex-1 h-14"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          </div>

          {voiceText && !isRecording && (
            <Button
              onClick={() => submitResponse(voiceText, "voice")}
              disabled={evaluating}
              className="w-full"
            >
              {evaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Submit for Feedback
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Evaluation result */}
      {evaluation && (
        <div className="space-y-3">
          <Card className="border-primary/30 bg-accent/30">
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed">{evaluation}</p>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={goBack} className="w-full">
            <RotateCcw className="h-4 w-4 mr-1" />
            Practice Another Case
          </Button>
        </div>
      )}
    </div>
  );
}
