// src/hooks/useAI.ts
// Client-side hook — calls server-side Gemini routes only. No API key here.

import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

export interface AIStatus {
  tier: string;
  used: number;
  limit: number;
  remaining: number;
  canQuery: boolean;
  byFeature?: Record<string, number>;
}

export interface AIResponse {
  answer: string;
  tier: string;
  used: number;
  limit: number;
  remaining: number;
  nudge: string | null;
}

export interface AIError {
  error: string;
  upgradeMessage?: string;
  upgradeUrl?: string;
}

export function useAI() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);

  // Fetch current usage status
  const fetchStatus = useCallback(async (): Promise<AIStatus | null> => {
    if (!user?.uid) return null;
    try {
      const res = await fetch(`/api/ai/status?uid=${user.uid}`);
      const data: AIStatus = await res.json();
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, [user?.uid]);

  // Ask AI to explain a question
  const explain = useCallback(
    async (
      question: string,
      subject?: string,
      grade?: string,
      paperContext?: string,
      image?: string
    ): Promise<AIResponse | AIError> => {
      if (!user?.uid) {
        return { error: "Please sign in to use the AI tutor.", upgradeUrl: "/sign-in" };
      }

      setLoading(true);
      try {
        const res = await fetch("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            question,
            subject,
            grade,
            paperContext,
            image,
          }),
        });

        const data = await res.json();

        if (res.status === 429) {
          // Limit reached — return upgrade prompt
          return data as AIError;
        }

        if (!res.ok) {
          return { error: data.error || "Something went wrong. Please try again." };
        }

        // Update local status
        setStatus((prev) =>
          prev
            ? { ...prev, used: data.used, remaining: data.remaining, canQuery: data.remaining > 0 }
            : null
        );

        return data as AIResponse;
      } catch {
        return { error: "Network error. Please check your connection." };
      } finally {
        setLoading(false);
      }
    },
    [user?.uid]
  );

  // Get a hint (uses same daily quota)
  const getHint = useCallback(
    async (
      question: string,
      subject?: string,
      grade?: string,
      hintLevel: 1 | 2 | 3 = 1
    ): Promise<{ hint: string; remaining: number } | AIError> => {
      if (!user?.uid) return { error: "Please sign in to use hints.", upgradeUrl: "/sign-in" };

      setLoading(true);
      try {
        const res = await fetch("/api/ai/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, question, subject, grade, hintLevel }),
        });

        const data = await res.json();
        if (!res.ok) return data as AIError;

        setStatus((prev) =>
          prev ? { ...prev, used: prev.limit - data.remaining, remaining: data.remaining, canQuery: data.remaining > 0 } : null
        );
        return data;
      } catch {
        return { error: "Network error." };
      } finally {
        setLoading(false);
      }
    },
    [user?.uid]
  );

  return { explain, getHint, fetchStatus, loading, status };
}
