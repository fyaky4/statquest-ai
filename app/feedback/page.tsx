"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  MessageSquareText,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";

type ExistingFeedback = {
  ease_of_use: number | null;
  learning_helpfulness: number | null;
  ai_critique_helpfulness: number | null;
  simulation_helpfulness: number | null;
  motivation_rating: number | null;
  improvement_feedback: string | null;
};

export default function FeedbackPage() {
  const [easeOfUse, setEaseOfUse] = useState(0);
  const [learningHelpfulness, setLearningHelpfulness] = useState(0);
  const [aiCritiqueHelpfulness, setAiCritiqueHelpfulness] = useState(0);
  const [simulationHelpfulness, setSimulationHelpfulness] = useState(0);
  const [motivationRating, setMotivationRating] = useState(0);
  const [improvementFeedback, setImprovementFeedback] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadFeedback() {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setMessage("Please sign in to complete the pilot feedback survey.");
          return;
        }

        const { data, error } = await supabase
          .from("pilot_feedback")
          .select(
            "ease_of_use, learning_helpfulness, ai_critique_helpfulness, simulation_helpfulness, motivation_rating, improvement_feedback"
          )
          .eq("student_id", user.id)
          .maybeSingle<ExistingFeedback>();

        if (error) throw error;

        if (data) {
          setEaseOfUse(data.ease_of_use ?? 0);
          setLearningHelpfulness(data.learning_helpfulness ?? 0);
          setAiCritiqueHelpfulness(data.ai_critique_helpfulness ?? 0);
          setSimulationHelpfulness(data.simulation_helpfulness ?? 0);
          setMotivationRating(data.motivation_rating ?? 0);
          setImprovementFeedback(data.improvement_feedback ?? "");
          setSubmitted(true);
        }
      } catch (error) {
        console.error("FEEDBACK LOAD ERROR:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load feedback."
        );
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();
  }, []);

  async function submitFeedback() {
    if (submitted || saving) return;

    if (
      easeOfUse === 0 ||
      learningHelpfulness === 0 ||
      aiCritiqueHelpfulness === 0 ||
      simulationHelpfulness === 0 ||
      motivationRating === 0
    ) {
      setMessage(
        "Please rate all five items before submitting your feedback."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setMessage("Please sign in before submitting feedback.");
        return;
      }

      const { error } = await supabase
        .from("pilot_feedback")
        .insert({
          student_id: user.id,
          ease_of_use: easeOfUse,
          learning_helpfulness: learningHelpfulness,
          ai_critique_helpfulness: aiCritiqueHelpfulness,
          simulation_helpfulness: simulationHelpfulness,
          motivation_rating: motivationRating,
          improvement_feedback: improvementFeedback.trim() || null,
        });

      if (error) {
        if (error.code === "23505") {
          setSubmitted(true);
          setMessage("You have already submitted the pilot feedback survey.");
          return;
        }

        throw error;
      }

      setSubmitted(true);

      setMessage(
        "Thank you. Your feedback has been submitted successfully."
      );
    } catch (error) {
      console.error("FEEDBACK SUBMISSION ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not submit your feedback."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition hover:text-purple-400"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </Link>

        <div className="mb-10">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10">
              <MessageSquareText className="h-8 w-8 text-purple-400" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-purple-400">
                StatQuest AI Pilot
              </p>

              <h1 className="text-5xl font-bold">
                Student Feedback
              </h1>
            </div>
          </div>

          <p className="max-w-4xl text-lg leading-relaxed text-slate-400">
            Your feedback will help improve StatQuest AI. Rate each statement
            from 1 to 5, where 1 means very low and 5 means very high.
          </p>
        </div>

        {message && (
          <div
            className={`mb-8 flex items-start gap-3 rounded-3xl border p-6 ${
              submitted
                ? "border-green-500/30 bg-green-950/30 text-green-300"
                : "border-yellow-500/30 bg-yellow-950/20 text-yellow-300"
            }`}
          >
            {submitted ? (
              <CheckCircle className="mt-0.5 h-6 w-6 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
            )}

            <p>{message}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-7 w-7 animate-spin" />
              Loading feedback survey...
            </div>
          </div>
        ) : (
          <>
            <RatingCard
              title="1. Ease of Use"
              description="How easy was StatQuest AI to navigate and use?"
              value={easeOfUse}
              onChange={setEaseOfUse}
              disabled={submitted}
            />

            <RatingCard
              title="2. Learning Helpfulness"
              description="How much did the Probability module help you understand the statistical concepts?"
              value={learningHelpfulness}
              onChange={setLearningHelpfulness}
              disabled={submitted}
            />

            <RatingCard
              title="3. AI Interpretation Check"
              description="How useful was the AI Interpretation Check for improving your statistical reasoning?"
              value={aiCritiqueHelpfulness}
              onChange={setAiCritiqueHelpfulness}
              disabled={submitted}
            />

            <RatingCard
              title="4. Simulation Arena"
              description="How useful were the simulations for helping you understand randomness and probability?"
              value={simulationHelpfulness}
              onChange={setSimulationHelpfulness}
              disabled={submitted}
            />

            <RatingCard
              title="5. Motivation"
              description="How much did XP, badges, Daily Quests, and the leaderboard motivate you to participate?"
              value={motivationRating}
              onChange={setMotivationRating}
              disabled={submitted}
            />

            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                What should we improve?
              </h2>

              <p className="mb-6 text-lg text-slate-300">
                Tell us what you liked, what was confusing, and what would make
                StatQuest AI more useful for your learning.
              </p>

              <textarea
                value={improvementFeedback}
                onChange={(event) =>
                  setImprovementFeedback(event.target.value)
                }
                disabled={submitted}
                placeholder="Write your suggestions here..."
                className="h-44 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white outline-none transition focus:border-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/30 to-blue-900/20 p-8 md:flex-row md:items-center">
              <div>
                <h2 className="mb-2 text-3xl font-bold">
                  {submitted
                    ? "Feedback Submitted"
                    : "Submit Pilot Feedback"}
                </h2>

                <p className="text-slate-300">
                  {submitted
                    ? "Thank you for helping improve StatQuest AI."
                    : "Please review your ratings before submitting."}
                </p>
              </div>

              <button
                type="button"
                onClick={submitFeedback}
                disabled={saving || submitted}
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-4 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}

                {saving
                  ? "Submitting..."
                  : submitted
                    ? "Submitted"
                    : "Submit Feedback"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

type RatingCardProps = {
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
};

function RatingCard({
  title,
  description,
  value,
  onChange,
  disabled,
}: RatingCardProps) {
  return (
    <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
      <h2 className="mb-3 text-2xl font-bold">
        {title}
      </h2>

      <p className="mb-6 text-slate-300">
        {description}
      </p>

      <div className="flex flex-wrap gap-4">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onChange(rating)}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-xl font-bold transition disabled:cursor-not-allowed ${
              value === rating
                ? "border-yellow-400 bg-yellow-500/20 text-yellow-300"
                : "border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-500/60"
            }`}
          >
            <Star
              className={`mr-1 h-5 w-5 ${
                value >= rating
                  ? "fill-current text-yellow-400"
                  : "text-slate-500"
              }`}
            />

            {rating}
          </button>
        ))}
      </div>

      {value > 0 && (
        <p className="mt-4 text-sm text-slate-400">
          Selected rating:{" "}
          <span className="font-semibold text-yellow-400">
            {value}/5
          </span>
        </p>
      )}
    </div>
  );
}