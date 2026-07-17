// src/components/ai/AITutorPanel.tsx
// The AI explainer panel shown alongside a past paper.
// Handles: sign-in gate, tier limit, upgrade wall, hints, streaming response.

import { useState, useEffect, useRef } from "react";
import { useAI, type AIResponse, type AIError } from "../../hooks/useAI";
import { useAuth } from "../../contexts/AuthContext";
import { Sparkles, Lightbulb, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { AIUpgradePrompt } from "./AIUpgradePrompt";

interface AITutorPanelProps {
  subject?: string;
  grade?: string;
  paperName?: string;
  initialQuestion?: string;
}

type HintLevel = 1 | 2 | 3;

function isAIError(r: AIResponse | AIError): r is AIError {
  return "error" in r;
}

export function AITutorPanel({ subject, grade, paperName, initialQuestion }: AITutorPanelProps) {
  const { user } = useAuth();
  const { explain, getHint, fetchStatus, loading, status } = useAI();

  const [question, setQuestion] = useState(initialQuestion || "");
  const [response, setResponse] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<HintLevel>(1);
  const [error, setError] = useState<AIError | null>(null);
  const [mode, setMode] = useState<"explain" | "hint">("explain");
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
    }
  }, [initialQuestion]);

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
      <div className="rounded-2xl sm:rounded-3xl border border-dashed border-[var(--color-lux-green-500)]/40 bg-[#E8F9F3]/50 p-6 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-[var(--color-lux-green-500)]" />
        <h3 className="mb-1 text-base font-semibold text-[var(--color-lux-green-900)]">GMA AI Tutor</h3>
        <p className="mb-4 text-sm text-lux-text">
          Sign in to ask the AI to explain any question from this paper — free, 3 times per day.
        </p>
        <a
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-lux-green-500)] px-4 py-2 text-sm font-semibold text-lux-text transition hover:bg-[var(--color-lux-green-900)]"
        >
          Sign in to use AI <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  // ── Upgrade wall (limit reached) ─────────────────────────────────────────
  if (error?.error === "limit_reached" || status?.canQuery === false || status?.remaining === 0) {
    return (
      <div className="pt-8">
        <AIUpgradePrompt />
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
    <div className="rounded-2xl sm:rounded-3xl border border-[#D4E8DF] bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D4E8DF] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F9F3]">
            <Sparkles className="h-4 w-4 text-[var(--color-lux-green-500)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-lux-text">GMA AI Tutor</h3>
            {subject && (
              <p className="text-xs text-lux-text">{subject} · {grade}</p>
            )}
          </div>
        </div>

        {/* Usage indicator */}
        {status && (
          <div className="text-right">
            <p className="text-xs text-lux-text">
              {status.remaining === 999999
                ? "Unlimited"
                : `${status.remaining} left today`}
            </p>
            {status.limit < 999 && (
              <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-[#E8F9F3]">
                <div
                  className="h-full rounded-full bg-[var(--color-lux-green-500)] transition-all"
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
              ? "border-b-2 border-[var(--color-lux-green-500)] text-[var(--color-lux-green-500)]"
              : "text-lux-text"
          }`}
        >
          <Sparkles className="inline mr-1 h-3 w-3" />
          Explain
        </button>
        <button
          onClick={() => setMode("hint")}
          className={`flex-1 py-2.5 text-xs font-semibold transition ${
            mode === "hint"
              ? "border-b-2 border-[var(--color-lux-green-500)] text-[var(--color-lux-green-500)]"
              : "text-lux-text"
          }`}
        >
          <Lightbulb className="inline mr-1 h-3 w-3" />
          Hint mode
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Question input */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-lux-text">
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
            className="w-full resize-none rounded-xl border border-[#D4E8DF] bg-[#FAFDF9] px-3 py-2.5 text-sm text-lux-text"
          />
        </div>

        {/* Hint level selector */}
        {mode === "hint" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-lux-text">Hint level:</span>
            {([1, 2, 3] as HintLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setHintLevel(level)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  hintLevel === level
                    ? "bg-[var(--color-lux-green-500)] text-lux-text"
                    : "bg-[#E8F9F3] text-[var(--color-lux-green-900)]"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-lux-green-500)] px-4 py-3 text-sm font-bold text-lux-text transition hover:bg-[var(--color-lux-green-900)] disabled:cursor-not-allowed disabled:opacity-50"
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

        {status && status.tier === 'free' && (
          <div className="bg-[var(--color-lux-green-500)]/10 border border-[var(--color-lux-green-500)]/20 px-3 py-1 rounded-full text-[10px] font-bold text-[var(--color-lux-green-900)] uppercase tracking-widest text-center mt-2 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-[var(--color-lux-green-500)]/20" style={{ width: `${(status.remaining / status.limit) * 100}%`}}></div>
            <span className="relative z-10">{status.remaining} AI questions left today</span>
          </div>
        )}

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
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-lux-green-500)]" />
              <span className="text-xs font-semibold text-[var(--color-lux-green-500)]">GMA AI</span>
            </div>
            <div className="prose prose-sm max-w-none text-lux-text">
              {response.split("\n").map((line, i) => (
                <p key={i} className="mb-2 text-sm leading-relaxed last:mb-0">
                  {line}
                </p>
              ))}
            </div>

            {/* Upgrade nudge after response */}
            {status && status.tier === "starter" && status.remaining <= 1 && (
              <div className="mt-3 rounded-lg border border-[var(--color-lux-green-500)]/20 bg-[#E8F9F3] p-3">
                <p className="text-xs text-[var(--color-lux-green-900)] mb-2">
                  {status.remaining === 0
                    ? "That was your last free question today."
                    : "1 free question left today."}{" "}
                  Upgrade to Scholar for R5/month — 20 questions daily.
                </p>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-lux-green-500)] hover:underline"
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
          <p className="text-center text-xs text-lux-text">
            Free tier: 3 AI questions per day.{" "}
            <a href="/pricing" className="text-[var(--color-lux-green-500)] font-medium hover:underline">
              Upgrade for more
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
