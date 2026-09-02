"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle,
  Loader2,
  Trophy,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

type LessonRecord = {
  id: string;
  xp_reward: number;
};

type ProgressRecord = {
  status: string;
  percent_complete: number;
};

export default function AICritiqueLessonPage() {
  const [lesson, setLesson] = useState<LessonRecord | null>(null);

  const [critique, setCritique] = useState("");
  const [improvedExplanation, setImprovedExplanation] = useState("");

  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackShown, setFeedbackShown] = useState(false);
  const [message, setMessage] = useState("");

  const critiqueReady = critique.trim().length >= 40;
  const explanationReady = improvedExplanation.trim().length >= 40;

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
          .eq("lesson_key", "ai-critique")
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
        console.error("AI CRITIQUE LOAD ERROR:", error);

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

  function checkReasoning() {
    if (!critiqueReady || !explanationReady) {
      setMessage(
        "Please provide a substantive critique and an improved explanation before checking your reasoning."
      );
      return;
    }

    setFeedbackShown(true);
    setMessage("");
  }

  async function completeLesson() {
    if (!lesson || completed || saving) return;

    if (!feedbackShown) {
      setMessage(
        "Check your reasoning before completing this lesson."
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
        setMessage(
          "Please sign in before completing the lesson."
        );
        return;
      }

      // --------------------------------
      // MARK LESSON COMPLETE
      // --------------------------------

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

      // --------------------------------
      // AWARD XP ONLY ONCE
      // --------------------------------

      const { data: xpAwarded, error: xpError } =
        await supabase.rpc("award_xp_once", {
          p_student_id: user.id,
          p_source_type: "lesson",
          p_source_key: "probability-ai-critique",
          p_xp_amount: lesson.xp_reward,
          p_description:
            "Completed Probability AI Interpretation Check",
        });

      if (xpError) throw xpError;

      // --------------------------------
      // COUNT AI CRITIQUE ONLY ONCE
      // --------------------------------

      if (xpAwarded) {
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("ai_critiques")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        const currentCritiques =
          profileData?.ai_critiques ?? 0;

        const { error: critiqueUpdateError } =
          await supabase
            .from("profiles")
            .update({
              ai_critiques: currentCritiques + 1,
            })
            .eq("id", user.id);

        if (critiqueUpdateError) {
          throw critiqueUpdateError;
        }
      }

      // --------------------------------
      // FIND NEXT LESSON
      // --------------------------------

      const { data: nextLesson, error: nextLessonError } =
        await supabase
          .from("lessons")
          .select("id")
          .eq("module_key", "probability")
          .eq("lesson_key", "decision-lab")
          .single();

      if (nextLessonError) throw nextLessonError;

      // --------------------------------
      // UNLOCK DECISION LAB
      // --------------------------------

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
          ? `Lesson complete. You earned ${lesson.xp_reward} XP, received credit for one AI critique, and unlocked the Probability Decision Lab.`
          : "Lesson complete. The Probability Decision Lab is unlocked. XP and AI critique credit were not awarded again because you already completed this reward."
      );
    } catch (error) {
      console.error(
        "AI CRITIQUE COMPLETION ERROR:",
        error
      );

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
              Loading AI critique lesson...
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="mb-10">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-pink-500/30 bg-pink-500/10">
                  <Brain className="h-8 w-8 text-pink-400" />
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-pink-400">
                    Module 3 • Lesson 4
                  </p>

                  <h1 className="text-5xl font-bold">
                    AI Interpretation Check
                  </h1>
                </div>
              </div>

              <p className="max-w-4xl text-lg leading-relaxed text-slate-400">
                Practice evaluating statistical claims generated by AI. Your
                goal is not simply to decide whether the statement is wrong,
                but to explain precisely why the reasoning is weak and replace
                it with a better statistical interpretation.
              </p>
            </div>

            {/* WHY THIS MATTERS */}
            <div className="mb-8 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-blue-950/20 p-8">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-purple-400" />

                <h2 className="text-3xl font-bold">
                  Why This Matters
                </h2>
              </div>

              <p className="text-lg leading-relaxed text-slate-300">
                AI systems can produce explanations that sound confident and
                mathematically sophisticated while still containing weak
                statistical reasoning. Data scientists must be able to verify
                assumptions, evaluate evidence, and identify overconfident
                conclusions.
              </p>
            </div>

            {/* AI CLAIM */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-pink-400">
                AI-Generated Interpretation
              </p>

              <div className="rounded-2xl border border-pink-500/20 bg-slate-950 p-7">
                <p className="text-xl leading-relaxed text-slate-200">
                  “A fair coin was tossed 10 times and produced 8 heads. Since
                  80% of the tosses were heads, this proves that the coin is
                  biased toward heads.”
                </p>
              </div>
            </div>

            {/* CRITIQUE */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Part 1: Critique the AI
              </h2>

              <p className="mb-6 text-lg leading-relaxed text-slate-300">
                What is wrong with the AI&apos;s reasoning? Explain what the AI
                is overlooking about randomness, sample size, and evidence.
              </p>

              <textarea
                value={critique}
                onChange={(event) =>
                  setCritique(event.target.value)
                }
                disabled={completed}
                placeholder="Explain the statistical problem with the AI's conclusion..."
                className="h-48 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white outline-none transition focus:border-purple-500 disabled:opacity-60"
              />

              <p className="mt-3 text-sm text-slate-500">
                Aim for at least 2–3 thoughtful sentences.
              </p>
            </div>

            {/* BETTER EXPLANATION */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Part 2: Improve the Explanation
              </h2>

              <p className="mb-6 text-lg leading-relaxed text-slate-300">
                Rewrite the interpretation as a careful data scientist would.
                What conclusion is actually justified by these 10 tosses?
              </p>

              <textarea
                value={improvedExplanation}
                onChange={(event) =>
                  setImprovedExplanation(event.target.value)
                }
                disabled={completed}
                placeholder="Write a more statistically defensible interpretation..."
                className="h-48 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white outline-none transition focus:border-purple-500 disabled:opacity-60"
              />
            </div>

            {/* CHECK REASONING */}
            {!feedbackShown && !completed && (
              <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
                <button
                  type="button"
                  onClick={checkReasoning}
                  disabled={
                    !critiqueReady ||
                    !explanationReady
                  }
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Check My Reasoning
                </button>
              </div>
            )}

            {/* FEEDBACK */}
            {feedbackShown && (
              <div className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-950/10 p-8">
                <h2 className="mb-5 text-3xl font-bold text-cyan-300">
                  Statistical Reasoning Check
                </h2>

                <div className="space-y-5 text-lg leading-relaxed text-slate-300">
                  <p>
                    The main issue is that a sample of only 10 tosses is small.
                    Random variation can easily produce results such as 8 heads
                    even when the true probability of heads is 0.5.
                  </p>

                  <p>
                    The observed proportion, 0.80, is an estimate based on one
                    small sample. It is not sufficient by itself to
                    &quot;prove&quot; that the coin is biased.
                  </p>

                  <p>
                    A stronger investigation would use substantially more
                    tosses or a formal statistical test to evaluate whether the
                    observed evidence is inconsistent with a fair coin.
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border border-purple-500/20 bg-slate-950 p-6">
                  <p className="font-semibold text-purple-400">
                    Key Principle
                  </p>

                  <p className="mt-2 text-slate-300">
                    An unusual sample result is not automatically evidence that
                    the underlying probability model is wrong. We must consider
                    sampling variability and the strength of the evidence.
                  </p>
                </div>
              </div>
            )}

            {/* CHECKLIST */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-5 text-2xl font-bold">
                Lesson Checklist
              </h2>

              <div className="space-y-4">
                <div
                  className={`flex items-center gap-3 ${
                    critiqueReady
                      ? "text-green-400"
                      : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Critique the AI&apos;s statistical reasoning
                </div>

                <div
                  className={`flex items-center gap-3 ${
                    explanationReady
                      ? "text-green-400"
                      : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Provide a better interpretation
                </div>

                <div
                  className={`flex items-center gap-3 ${
                    feedbackShown
                      ? "text-green-400"
                      : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Compare your reasoning with statistical feedback
                </div>
              </div>
            </div>

            {/* COMPLETION */}
            <div className="flex flex-col justify-between gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />

                  <h2 className="text-2xl font-bold">
                    Lesson Reward
                  </h2>
                </div>

                <p className="text-slate-300">
                  Complete this AI critique to earn{" "}
                  <span className="font-bold text-yellow-400">
                    {lesson?.xp_reward ?? 25} XP
                  </span>{" "}
                  and unlock the Probability Decision Lab.
                </p>
              </div>

              {completed ? (
                <Link
                  href="/lessons/probability/decision-lab"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-7 py-4 font-semibold transition hover:scale-105"
                >
                  Continue to Decision Lab
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

                  {saving
                    ? "Saving..."
                    : "Complete Lesson"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}