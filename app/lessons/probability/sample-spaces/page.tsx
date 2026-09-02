"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  Trophy,
  Shapes,
  AlertCircle,
} from "lucide-react";

type LessonRecord = {
  id: string;
  xp_reward: number;
};

type ProgressRecord = {
  status: string;
  percent_complete: number;
};

export default function SampleSpacesLessonPage() {
  const [lesson, setLesson] = useState<LessonRecord | null>(null);

  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");

  const [submittedPractice, setSubmittedPractice] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const q1Correct = q1 === "{1,2,3,4,5,6}";
  const q2Correct = q2 === "{2,4,6}";
  const q3Correct = q3 === "{1,3,5}";

  const practiceScore = [
    q1Correct,
    q2Correct,
    q3Correct,
  ].filter(Boolean).length;

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
          .eq("lesson_key", "sample-spaces")
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
        console.error("SAMPLE SPACES LOAD ERROR:", error);

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

  function checkPractice() {
    if (!q1 || !q2 || !q3) {
      setMessage(
        "Please answer all three practice questions first."
      );
      return;
    }

    setSubmittedPractice(true);
    setMessage("");
  }

  async function completeLesson() {
    if (!lesson || completed || saving) return;

    if (!submittedPractice) {
      setMessage(
        "Complete the practice questions before finishing the lesson."
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
          p_source_key: "probability-sample-spaces",
          p_xp_amount: lesson.xp_reward,
          p_description:
            "Completed Sample Spaces and Events lesson",
        });

      if (xpError) throw xpError;

      // --------------------------------
      // FIND NEXT LESSON
      // --------------------------------

      const { data: nextLesson, error: nextLessonError } =
        await supabase
          .from("lessons")
          .select("id")
          .eq("module_key", "probability")
          .eq("lesson_key", "simulation")
          .single();

      if (nextLessonError) throw nextLessonError;

      // --------------------------------
      // UNLOCK NEXT LESSON
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
          ? `Lesson complete. You earned ${lesson.xp_reward} XP and unlocked Probability Simulation.`
          : "Lesson complete. Probability Simulation is unlocked. XP was not awarded again because you already earned this lesson reward."
      );
    } catch (error) {
      console.error(
        "SAMPLE SPACES COMPLETION ERROR:",
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
              Loading lesson...
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="mb-10">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
                  <Shapes className="h-8 w-8 text-cyan-400" />
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-cyan-400">
                    Module 3 • Lesson 2
                  </p>

                  <h1 className="text-5xl font-bold">
                    Sample Spaces and Events
                  </h1>
                </div>
              </div>

              <p className="max-w-4xl text-lg leading-relaxed text-slate-400">
                Practice identifying sample spaces, events,
                complements, and subsets before moving into
                simulation and probability rules.
              </p>
            </div>

            {/* REVIEW */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-5 text-3xl font-bold">
                Quick Review
              </h2>

              <div className="space-y-4 text-lg leading-relaxed text-slate-300">
                <p>
                  A <strong>sample space</strong> contains
                  every possible outcome of a random experiment.
                </p>

                <p>
                  An <strong>event</strong> is any subset of
                  that sample space.
                </p>

                <p>
                  The <strong>complement</strong> of an event
                  contains all outcomes that are not in the
                  event.
                </p>
              </div>
            </div>

            {/* QUESTION 1 */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-2xl font-bold">
                Practice 1
              </h2>

              <p className="mb-6 text-lg text-slate-300">
                A fair six-sided die is rolled once. Which set
                is the sample space?
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  "{1,2,3,4,5,6}",
                  "{2,4,6}",
                  "{1,3,5}",
                  "{0,1}",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setQ1(option)}
                    disabled={completed}
                    className={`rounded-2xl border p-5 transition ${
                      q1 === option
                        ? "border-purple-400 bg-purple-600"
                        : "border-slate-700 bg-slate-950 hover:border-purple-500"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {submittedPractice && (
                <div className="mt-5">
                  {q1Correct ? (
                    <p className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      Correct. The sample space includes all six
                      possible outcomes.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-red-400">
                      <XCircle className="h-5 w-5" />
                      Not quite. A sample space must contain
                      every possible outcome.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* QUESTION 2 */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-2xl font-bold">
                Practice 2
              </h2>

              <p className="mb-6 text-lg text-slate-300">
                Let event E be “rolling an even number.” Which
                set represents E?
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  "{1,2,3}",
                  "{2,4,6}",
                  "{1,3,5}",
                  "{4,5,6}",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setQ2(option)}
                    disabled={completed}
                    className={`rounded-2xl border p-5 transition ${
                      q2 === option
                        ? "border-purple-400 bg-purple-600"
                        : "border-slate-700 bg-slate-950 hover:border-purple-500"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {submittedPractice && (
                <div className="mt-5">
                  {q2Correct ? (
                    <p className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      Correct. The even outcomes are 2, 4, and 6.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-red-400">
                      <XCircle className="h-5 w-5" />
                      Try listing all even numbers in the sample
                      space.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* QUESTION 3 */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-4 text-2xl font-bold">
                Practice 3
              </h2>

              <p className="mb-6 text-lg text-slate-300">
                If E = {"{2,4,6}"}, what is the complement of E?
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  "{1,3,5}",
                  "{2,4,6}",
                  "{1,2,3}",
                  "{4,5,6}",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setQ3(option)}
                    disabled={completed}
                    className={`rounded-2xl border p-5 transition ${
                      q3 === option
                        ? "border-purple-400 bg-purple-600"
                        : "border-slate-700 bg-slate-950 hover:border-purple-500"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {submittedPractice && (
                <div className="mt-5">
                  {q3Correct ? (
                    <p className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      Correct. The complement contains the
                      outcomes not in E.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-red-400">
                      <XCircle className="h-5 w-5" />
                      Look for all outcomes in the sample space
                      that are not in E.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* CHECK PRACTICE */}
            {!submittedPractice && !completed && (
              <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
                <button
                  type="button"
                  onClick={checkPractice}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105"
                >
                  Check My Answers
                </button>
              </div>
            )}

            {submittedPractice && (
              <div className="mb-8 rounded-3xl border border-blue-500/30 bg-blue-950/20 p-8">
                <h2 className="mb-3 text-2xl font-bold">
                  Practice Result
                </h2>

                <p className="text-lg text-slate-300">
                  You answered{" "}
                  <span className="font-bold text-cyan-400">
                    {practiceScore}/3
                  </span>{" "}
                  correctly.
                </p>

                {practiceScore < 3 && !completed && (
                  <p className="mt-3 text-slate-400">
                    You can review the feedback before completing
                    the lesson.
                  </p>
                )}
              </div>
            )}

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
                  Complete this lesson to earn{" "}
                  <span className="font-bold text-yellow-400">
                    {lesson?.xp_reward ?? 20} XP
                  </span>{" "}
                  and unlock Probability Simulation.
                </p>
              </div>

              {completed ? (
                <Link
                  href="/lessons/probability/simulation"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-7 py-4 font-semibold transition hover:scale-105"
                >
                  Continue to Simulation
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={completeLesson}
                  disabled={saving || !submittedPractice}
                  className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}

                  {saving ? "Saving..." : "Complete Lesson"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}