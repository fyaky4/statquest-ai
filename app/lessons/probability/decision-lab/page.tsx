"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Trophy,
  AlertCircle,
  Sparkles,
  Scale,
} from "lucide-react";

type LessonRecord = {
  id: string;
  xp_reward: number;
};

type ProgressRecord = {
  status: string;
  percent_complete: number;
};

export default function ProbabilityDecisionLabPage() {
  const [lesson, setLesson] = useState<LessonRecord | null>(null);

  const [decision, setDecision] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [riskReflection, setRiskReflection] = useState("");

  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackShown, setFeedbackShown] = useState(false);
  const [message, setMessage] = useState("");

  const reasoningReady = reasoning.trim().length >= 50;
  const riskReady = riskReflection.trim().length >= 40;

  useEffect(() => {
    async function loadLesson() {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setMessage("Please sign in to access this lesson.");
          return;
        }

        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("id, xp_reward")
          .eq("module_key", "probability")
          .eq("lesson_key", "decision-lab")
          .single<LessonRecord>();

        if (lessonError) throw lessonError;

        setLesson(lessonData);

        const { data: progressData, error: progressError } = await supabase
          .from("student_lesson_progress")
          .select("status, percent_complete")
          .eq("student_id", user.id)
          .eq("lesson_id", lessonData.id)
          .maybeSingle<ProgressRecord>();

        if (progressError) throw progressError;

        if (
          progressData?.status === "completed" ||
          progressData?.percent_complete === 100
        ) {
          setCompleted(true);
          setFeedbackShown(true);
        } else {
          const { error: startError } = await supabase
            .from("student_lesson_progress")
            .upsert(
              {
                student_id: user.id,
                lesson_id: lessonData.id,
                status: "in_progress",
                percent_complete: 25,
                started_at: new Date().toISOString(),
              },
              {
                onConflict: "student_id,lesson_id",
              }
            );

          if (startError) throw startError;
        }
      } catch (error) {
        console.error("DECISION LAB LOAD ERROR:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load this lesson."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, []);

  function checkDecision() {
    if (!decision) {
      setMessage("Choose a decision before checking your reasoning.");
      return;
    }

    if (!reasoningReady || !riskReady) {
      setMessage(
        "Please provide enough reasoning and risk analysis before checking your decision."
      );
      return;
    }

    setFeedbackShown(true);
    setMessage("");
  }

  async function completeLesson() {
    if (!lesson || completed || saving) return;

    if (!feedbackShown) {
      setMessage("Check your decision reasoning before completing the lab.");
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
        setMessage("Please sign in before completing the lab.");
        return;
      }

      // MARK LESSON COMPLETE
      const { error: progressError } = await supabase
        .from("student_lesson_progress")
        .update({
          status: "completed",
          percent_complete: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("student_id", user.id)
        .eq("lesson_id", lesson.id);

      if (progressError) throw progressError;

      // AWARD XP ONLY ONCE
      const { data: xpAwarded, error: xpError } =
        await supabase.rpc("award_xp_once", {
          p_student_id: user.id,
          p_source_type: "lesson",
          p_source_key: "probability-decision-lab",
          p_xp_amount: lesson.xp_reward,
          p_description: "Completed Probability Decision Lab",
        });

      if (xpError) throw xpError;

      // FIND NEXT LESSON
      const { data: nextLesson, error: nextLessonError } = await supabase
        .from("lessons")
        .select("id")
        .eq("module_key", "probability")
        .eq("lesson_key", "module-quiz")
        .single();

      if (nextLessonError) throw nextLessonError;

      // UNLOCK MASTERY QUIZ
      const { error: unlockError } = await supabase
        .from("student_lesson_progress")
        .upsert(
          {
            student_id: user.id,
            lesson_id: nextLesson.id,
            status: "available",
            percent_complete: 0,
          },
          {
            onConflict: "student_id,lesson_id",
          }
        );

      if (unlockError) throw unlockError;

      setCompleted(true);

      setMessage(
        xpAwarded
          ? `Decision Lab complete. You earned ${lesson.xp_reward} XP and unlocked the Probability Mastery Quiz.`
          : "Decision Lab complete. The Probability Mastery Quiz is unlocked. XP was not awarded again because you already earned this lab reward."
      );
    } catch (error) {
      console.error("DECISION LAB COMPLETION ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not complete this lesson."
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
          href="/learning-paths/probability"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition hover:text-purple-400"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Probability Module
        </Link>

        {message && (
          <div
            className={`mb-8 flex items-start gap-3 rounded-3xl border p-6 ${
              completed
                ? "border-green-500/30 bg-green-950/30 text-green-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {completed ? (
              <CheckCircle className="mt-0.5 h-6 w-6 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
            )}

            <p>{message}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-7 w-7 animate-spin" />
              Loading Decision Lab...
            </div>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10">
                  <Scale className="h-8 w-8 text-purple-400" />
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-purple-400">
                    Module 3 • Lesson 5
                  </p>

                  <h1 className="text-5xl font-bold">
                    Probability Decision Lab
                  </h1>
                </div>
              </div>

              <p className="max-w-4xl text-lg leading-relaxed text-slate-400">
                Apply probability reasoning to a realistic decision problem.
                Your task is not simply to calculate a number, but to determine
                what decision is justified under uncertainty.
              </p>
            </div>

            <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/30 to-blue-900/20 p-8">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-400" />
                <h2 className="text-3xl font-bold">
                  Data Science Scenario
                </h2>
              </div>

              <p className="mb-5 text-lg leading-relaxed text-slate-300">
                A fraud-detection system flags transactions as suspicious.
                Historical data show that only 2% of all transactions are
                actually fraudulent.
              </p>

              <p className="mb-5 text-lg leading-relaxed text-slate-300">
                The system correctly flags 90% of fraudulent transactions, but
                it also incorrectly flags 8% of legitimate transactions.
              </p>

              <p className="text-lg leading-relaxed text-slate-300">
                A transaction has just been flagged. A manager proposes
                automatically blocking every flagged transaction without any
                further review.
              </p>
            </div>

            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Part 1: Make a Decision
              </h2>

              <p className="mb-6 text-lg text-slate-300">
                Based on the information available, what is the most defensible
                action?
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  "Automatically block every flagged transaction",
                  "Send flagged transactions for additional review",
                  "Ignore the fraud-detection system",
                  "Assume every flagged transaction is fraudulent",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDecision(option)}
                    disabled={completed}
                    className={`rounded-2xl border p-5 text-left transition ${
                      decision === option
                        ? "border-purple-400 bg-purple-600"
                        : "border-slate-700 bg-slate-950 hover:border-purple-500"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Part 2: Explain Your Reasoning
              </h2>

              <p className="mb-6 text-lg leading-relaxed text-slate-300">
                Explain why the base rate of fraud matters and why a positive
                flag does not automatically mean the transaction is fraudulent.
              </p>

              <textarea
                value={reasoning}
                onChange={(event) => setReasoning(event.target.value)}
                disabled={completed}
                placeholder="Explain the probability reasoning behind your decision..."
                className="h-48 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white outline-none transition focus:border-purple-500 disabled:opacity-60"
              />
            </div>

            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Part 3: Consider Decision Risk
              </h2>

              <p className="mb-6 text-lg leading-relaxed text-slate-300">
                What could go wrong if the company automatically blocks every
                flagged transaction? Discuss the cost of false positives and
                why statistical decisions often involve tradeoffs.
              </p>

              <textarea
                value={riskReflection}
                onChange={(event) =>
                  setRiskReflection(event.target.value)
                }
                disabled={completed}
                placeholder="Discuss the consequences of false positives and decision tradeoffs..."
                className="h-48 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white outline-none transition focus:border-purple-500 disabled:opacity-60"
              />
            </div>

            {!feedbackShown && !completed && (
              <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
                <button
                  type="button"
                  onClick={checkDecision}
                  disabled={!decision || !reasoningReady || !riskReady}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Check My Decision
                </button>
              </div>
            )}

            {feedbackShown && (
              <div className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-950/10 p-8">
                <h2 className="mb-5 text-3xl font-bold text-cyan-300">
                  Decision Analysis
                </h2>

                <p className="mb-5 text-lg leading-relaxed text-slate-300">
                  The most defensible choice is usually to send flagged
                  transactions for additional review rather than automatically
                  treating every flag as proof of fraud.
                </p>

                <p className="mb-5 text-lg leading-relaxed text-slate-300">
                  Fraud is relatively rare, so even a reasonably accurate
                  detection system can produce many false positives. The prior
                  probability, or base rate, matters when interpreting the
                  meaning of a positive flag.
                </p>

                <p className="text-lg leading-relaxed text-slate-300">
                  This is a core data-science principle: a predictive signal
                  should inform a decision, but the decision should also account
                  for uncertainty, false-positive costs, and the consequences
                  of acting incorrectly.
                </p>
              </div>
            )}

            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-5 text-2xl font-bold">
                Lab Checklist
              </h2>

              <div className="space-y-4">
                <div
                  className={`flex items-center gap-3 ${
                    decision ? "text-green-400" : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Make a decision
                </div>

                <div
                  className={`flex items-center gap-3 ${
                    reasoningReady ? "text-green-400" : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Explain the probability reasoning
                </div>

                <div
                  className={`flex items-center gap-3 ${
                    riskReady ? "text-green-400" : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Analyze false-positive risk
                </div>

                <div
                  className={`flex items-center gap-3 ${
                    feedbackShown ? "text-green-400" : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Compare your decision with the statistical analysis
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />

                  <h2 className="text-2xl font-bold">
                    Lab Reward
                  </h2>
                </div>

                <p className="text-slate-300">
                  Complete this Decision Lab to earn{" "}
                  <span className="font-bold text-yellow-400">
                    {lesson?.xp_reward ?? 50} XP
                  </span>{" "}
                  and unlock the Probability Mastery Quiz.
                </p>
              </div>

              {completed ? (
                <Link
                  href="/lessons/probability/module-quiz"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-7 py-4 font-semibold transition hover:scale-105"
                >
                  Continue to Mastery Quiz
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={completeLesson}
                  disabled={saving || !feedbackShown}
                  className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}

                  {saving ? "Saving..." : "Complete Decision Lab"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}