// src/components/ai/AITutorPanel.tsx
// The AI explainer panel shown alongside a past paper.
// Handles: sign-in gate, tier limit, upgrade wall, hints, streaming response.

import { useState, useEffect, useRef } from "react";
import { useAI, type AIResponse, type AIError } from "../../hooks/useAI";
import { useAuth } from "../../contexts/AuthContext";
import { Sparkles, Lightbulb, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface AITutorPanelProps {
  subject?: string;
  grade?: string;
  paperName?: string;
}

type HintLevel = 1 | 2 | 3;

function isAIError(r: AIResponse | AIError): r is AIError {
  return "error" in r;
}

export function AITutorPanel({ subject, grade, paperName }: AITutorPanelProps) {
  const { user } = useAuth();
  const { explain, getHint, fetchStatus, loading, status } = useAI();

  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<HintLevel>(1);
  const [error, setError] = useState<AIError | null>(null);
  const [mode, setMode] = useState<"explain" | "hint">("explain");
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.uid) fetchStatus();
  }, [user?.uid, fetchStatus]);

  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [response]);

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-[#1D9E75]/40 bg-[#E8F9F3]/50 p-6 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#1D9E75]" />
        <h3 className="mb-1 text-base font-semibold text-[#0A5C44]">GMA AI Tutor</h3>
        <p className="mb-4 text-sm text-[#5A7A6E]">
          Sign in to ask the AI to explain any question from this paper — free, 3 times per day.
        </p>
        <a
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A5C44]"
        >
          Sign in to use AI <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  // ── Upgrade wall (limit reached) ─────────────────────────────────────────
  if (error?.error === "limit_reached") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-amber-900">Daily limit reached</h3>
        </div>
        <p className="mb-4 text-sm text-amber-800">{error.upgradeMessage}</p>
        <div className="rounded-xl border border-[#1D9E75]/30 bg-white p-4 mb-4">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-bold text-[#0A5C44]">R5</span>
            <span className="text-sm text-[#5A7A6E]">/month</span>
            <span className="ml-2 text-xs text-[#5A7A6E]">+ R2.50 processing fee</span>
          </div>
          <p className="text-xs text-[#5A7A6E] mb-3">Scholar tier — 20 AI questions daily, offline packs</p>
          <a
            href="/pricing"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A5C44] transition"
          >
            Upgrade to Scholar <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <button
          onClick={() => setError(null)}
          className="w-full text-xs text-amber-700 underline"
        >
          Come back tomorrow for 3 more free questions
        </button>
      </div>
    );
  }

  const handleExplain = async () => {
    if (!question.trim()) return;
    setError(null);
    setResponse(null);
    setHint(null);

    const result = await explain(question, subject, grade, paperName);

    if (isAIError(result)) {
      setError(result);
    } else {
      setResponse(result.answer);
      if (result.nudge) {
        // Show nudge as a soft banner after response
      }
    }
  };

  const handleHint = async () => {
    if (!question.trim()) return;
    setError(null);
    setHint(null);
    setResponse(null);

    const result = await getHint(question, subject, grade, hintLevel);

    if ("error" in result) {
      setError(result as AIError);
    } else {
      setHint(result.hint ?? null);
      setHintLevel((prev) => Math.min(3, prev + 1) as HintLevel);
    }
  };

  const usageBar = status
    ? Math.min(100, (status.used / status.limit) * 100)
    : 0;

  return (
    <div className="rounded-2xl border border-[#D4E8DF] bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D4E8DF] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F9F3]">
            <Sparkles className="h-4 w-4 text-[#1D9E75]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0D1B14]">GMA AI Tutor</h3>
            {subject && (
              <p className="text-xs text-[#5A7A6E]">{subject} · {grade}</p>
            )}
          </div>
        </div>

        {/* Usage indicator */}
        {status && (
          <div className="text-right">
            <p className="text-xs text-[#5A7A6E]">
              {status.remaining === 999999
                ? "Unlimited"
                : `${status.remaining} left today`}
            </p>
            {status.limit < 999 && (
              <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-[#E8F9F3]">
                <div
                  className="h-full rounded-full bg-[#1D9E75] transition-all"
                  style={{ width: `${100 - usageBar}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-[#D4E8DF]">
        <button
          onClick={() => setMode("explain")}
          className={`flex-1 py-2.5 text-xs font-semibold transition ${
            mode === "explain"
              ? "border-b-2 border-[#1D9E75] text-[#1D9E75]"
              : "text-[#5A7A6E] hover:text-[#0D1B14]"
          }`}
        >
          <Sparkles className="inline mr-1 h-3 w-3" />
          Explain
        </button>
        <button
          onClick={() => setMode("hint")}
          className={`flex-1 py-2.5 text-xs font-semibold transition ${
            mode === "hint"
              ? "border-b-2 border-[#1D9E75] text-[#1D9E75]"
              : "text-[#5A7A6E] hover:text-[#0D1B14]"
          }`}
        >
          <Lightbulb className="inline mr-1 h-3 w-3" />
          Hint mode
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Question input */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#5A7A6E]">
            {mode === "explain"
              ? "Paste the question or describe what you don't understand"
              : "Paste the question — I'll give you a hint without the answer"}
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              mode === "explain"
                ? "e.g. Explain Question 4.2 step by step..."
                : "e.g. A car travels at 60km/h for 2 hours..."
            }
            rows={3}
            className="w-full resize-none rounded-xl border border-[#D4E8DF] bg-[#FAFDF9] px-3 py-2.5 text-sm text-[#0D1B14] placeholder-[#9AB5AC] focus:border-[#1D9E75] focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
          />
        </div>

        {/* Hint level selector */}
        {mode === "hint" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5A7A6E]">Hint level:</span>
            {([1, 2, 3] as HintLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setHintLevel(level)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  hintLevel === level
                    ? "bg-[#1D9E75] text-white"
                    : "bg-[#E8F9F3] text-[#0A5C44]"
                }`}
              >
                {level === 1 ? "Small" : level === 2 ? "Medium" : "Big"}
              </button>
            ))}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={mode === "explain" ? handleExplain : handleHint}
          disabled={loading || !question.trim() || status?.remaining === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0A5C44] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </>
          ) : mode === "explain" ? (
            <>
              <Sparkles className="h-4 w-4" />
              Ask AI
            </>
          ) : (
            <>
              <Lightbulb className="h-4 w-4" />
              Get hint
            </>
          )}
        </button>

        {/* Generic error */}
        {error && error.error !== "limit_reached" && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs text-red-700">{error.error}</p>
          </div>
        )}

        {/* AI Response */}
        {response && (
          <div ref={responseRef} className="rounded-xl border border-[#D4E8DF] bg-[#FAFDF9] p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#1D9E75]" />
              <span className="text-xs font-semibold text-[#1D9E75]">GMA AI</span>
            </div>
            <div className="prose prose-sm max-w-none text-[#0D1B14]">
              {response.split("\n").map((line, i) => (
                <p key={i} className="mb-2 text-sm leading-relaxed last:mb-0">
                  {line}
                </p>
              ))}
            </div>

            {/* Upgrade nudge after response */}
            {status && status.tier === "starter" && status.remaining <= 1 && (
              <div className="mt-3 rounded-lg border border-[#1D9E75]/20 bg-[#E8F9F3] p-3">
                <p className="text-xs text-[#0A5C44] mb-2">
                  {status.remaining === 0
                    ? "That was your last free question today."
                    : "1 free question left today."}{" "}
                  Upgrade to Scholar for R5/month — 20 questions daily.
                </p>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1D9E75] hover:underline"
                >
                  Upgrade now <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Hint Response */}
        {hint && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">
                Hint {hintLevel - 1} of 3
              </span>
            </div>
            <p className="text-sm text-amber-900 leading-relaxed">{hint}</p>
            {hintLevel <= 3 && (
              <button
                onClick={handleHint}
                className="mt-3 text-xs font-semibold text-amber-700 hover:underline"
              >
                Need a bigger hint? →
              </button>
            )}
          </div>
        )}

        {/* Starter tier disclaimer */}
        {status?.tier === "starter" && !response && !hint && !error && (
          <p className="text-center text-xs text-[#9AB5AC]">
            Free tier: 3 AI questions per day.{" "}
            <a href="/pricing" className="text-[#1D9E75] font-medium hover:underline">
              Upgrade for more
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
