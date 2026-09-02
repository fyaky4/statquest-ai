"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Trophy,
  ClipboardCheck,
} from "lucide-react";

type LessonRecord = {
  id: string;
  xp_reward: number;
};

type ProgressRecord = {
  status: string;
  percent_complete: number;
};

type PretestAttempt = {
  id: string;
};

export default function ProbabilityConceptOverviewPage() {
  const router = useRouter();

  const [lesson, setLesson] = useState<LessonRecord | null>(null);

  const [completed, setCompleted] = useState(false);
  const [pretestCompleted, setPretestCompleted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");

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
          router.replace("/auth");
          return;
        }

        // --------------------------------
        // REQUIRE PROBABILITY PRETEST
        // --------------------------------

        const {
          data: pretestAttempt,
          error: pretestError,
        } = await supabase
          .from("module_pretest_attempts")
          .select("id")
          .eq("student_id", user.id)
          .eq("module_key", "probability")
          .maybeSingle<PretestAttempt>();

        if (pretestError) {
          throw pretestError;
        }

        if (!pretestAttempt) {
          setPretestCompleted(false);

          router.replace(
            "/learning-paths/probability/pretest"
          );

          return;
        }

        setPretestCompleted(true);

        // --------------------------------
        // LOAD LESSON
        // --------------------------------

        const {
          data: lessonData,
          error: lessonError,
        } = await supabase
          .from("lessons")
          .select("id, xp_reward")
          .eq("module_key", "probability")
          .eq("lesson_key", "concept-overview")
          .single<LessonRecord>();

        if (lessonError) {
          throw lessonError;
        }

        setLesson(lessonData);

        // --------------------------------
        // LOAD STUDENT LESSON PROGRESS
        // --------------------------------

        const {
          data: progressData,
          error: progressError,
        } = await supabase
          .from("student_lesson_progress")
          .select("status, percent_complete")
          .eq("student_id", user.id)
          .eq("lesson_id", lessonData.id)
          .maybeSingle<ProgressRecord>();

        if (progressError) {
          throw progressError;
        }

        // --------------------------------
        // ALREADY COMPLETED
        // --------------------------------

        if (
          progressData?.status === "completed" ||
          progressData?.percent_complete === 100
        ) {
          setCompleted(true);
          return;
        }

        // --------------------------------
        // MARK LESSON AS STARTED
        //
        // This only happens AFTER the
        // required pretest has been completed.
        // --------------------------------

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

        if (startError) {
          throw startError;
        }

        // --------------------------------
        // RECORD MODULE AS STARTED
        // --------------------------------

        const { error: moduleProgressError } =
          await supabase
            .from("learning_progress")
            .upsert(
              {
                student_id: user.id,
                module_key: "probability",
                module_name: "Module 3: Probability",
                completed: false,
                percent_complete: 10,
                completed_at: null,
              },
              {
                onConflict: "student_id,module_key",
              }
            );

        if (moduleProgressError) {
          throw moduleProgressError;
        }
      } catch (error) {
        console.error(
          "LESSON LOAD ERROR:",
          error
        );

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
  }, [router]);

  async function completeLesson() {
    if (
      !lesson ||
      completed ||
      saving ||
      !pretestCompleted
    ) {
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
        router.replace("/auth");
        return;
      }

      // --------------------------------
      // SECURITY CHECK:
      // VERIFY PRETEST AGAIN
      //
      // Do not trust only the page state.
      // --------------------------------

      const {
        data: pretestAttempt,
        error: pretestError,
      } = await supabase
        .from("module_pretest_attempts")
        .select("id")
        .eq("student_id", user.id)
        .eq("module_key", "probability")
        .maybeSingle<PretestAttempt>();

      if (pretestError) {
        throw pretestError;
      }

      if (!pretestAttempt) {
        setPretestCompleted(false);

        setMessage(
          "You must complete the Probability pretest before completing Lesson 1."
        );

        router.replace(
          "/learning-paths/probability/pretest"
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

      if (progressError) {
        throw progressError;
      }

      // --------------------------------
      // AWARD XP ONLY ONCE
      // --------------------------------

      const {
        data: xpAwarded,
        error: xpError,
      } = await supabase.rpc(
        "award_xp_once",
        {
          p_student_id: user.id,
          p_source_type: "lesson",
          p_source_key:
            "probability-concept-overview",
          p_xp_amount: lesson.xp_reward,
          p_description:
            "Completed Probability Foundations lesson",
        }
      );

      if (xpError) {
        throw xpError;
      }

      // --------------------------------
      // FIND NEXT LESSON
      // --------------------------------

      const {
        data: nextLesson,
        error: nextLessonError,
      } = await supabase
        .from("lessons")
        .select("id")
        .eq("module_key", "probability")
        .eq("lesson_key", "sample-spaces")
        .single();

      if (nextLessonError) {
        throw nextLessonError;
      }

      // --------------------------------
      // UNLOCK LESSON 2
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

      if (unlockError) {
        throw unlockError;
      }

      // --------------------------------
      // UPDATE MODULE PROGRESS
      //
      // Pretest itself does not count as
      // instructional completion.
      // Lesson 1 completion begins the
      // instructional progress measure.
      // --------------------------------

      const { error: moduleProgressError } =
        await supabase
          .from("learning_progress")
          .upsert(
            {
              student_id: user.id,
              module_key: "probability",
              module_name:
                "Module 3: Probability",
              completed: false,
              percent_complete: 20,
              completed_at: null,
            },
            {
              onConflict:
                "student_id,module_key",
            }
          );

      if (moduleProgressError) {
        throw moduleProgressError;
      }

      setCompleted(true);

      setMessage(
        xpAwarded
          ? `Lesson complete. You earned ${lesson.xp_reward} XP and unlocked Sample Spaces and Events.`
          : "Lesson complete. Sample Spaces and Events is unlocked. XP was not awarded again because you already earned this lesson reward."
      );
    } catch (error) {
      console.error(
        "LESSON COMPLETION ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not complete the lesson."
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
              Checking baseline and loading lesson...
            </div>
          </div>
        ) : !pretestCompleted ? (
          <div className="rounded-3xl border border-cyan-500/30 bg-cyan-950/20 p-10">
            <ClipboardCheck className="mb-5 h-14 w-14 text-cyan-400" />

            <h1 className="mb-4 text-4xl font-bold">
              Pretest Required
            </h1>

            <p className="max-w-3xl text-lg leading-relaxed text-slate-300">
              You must complete the Probability baseline assessment before
              beginning Lesson 1.
            </p>

            <Link
              href="/learning-paths/probability/pretest"
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105"
            >
              Take Probability Pretest
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="mb-10">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10">
                  <BookOpen className="h-8 w-8 text-purple-400" />
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-purple-400">
                    Module 3 • Lesson 1
                  </p>

                  <h1 className="text-5xl font-bold">
                    Probability Foundations
                  </h1>
                </div>
              </div>

              <p className="max-w-4xl text-lg leading-relaxed text-slate-400">
                Build the vocabulary and conceptual foundation you need before
                working with probability rules, simulation, and statistical
                decision making.
              </p>
            </div>

            {/* BASELINE STATUS */}
            <div className="mb-8 flex items-start gap-4 rounded-3xl border border-green-500/20 bg-green-950/10 p-6">
              <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-green-400" />

              <div>
                <p className="font-semibold text-green-300">
                  Baseline Assessment Completed
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Your pretest has been recorded. Your instructional progress
                  begins with this lesson.
                </p>
              </div>
            </div>

            {/* RANDOM EXPERIMENTS */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-6 text-3xl font-bold">
                1. Random Experiments
              </h2>

              <p className="mb-4 text-lg leading-relaxed text-slate-300">
                A random experiment is a process whose exact outcome cannot be
                predicted with certainty before it occurs, even though the set
                of possible outcomes may be known.
              </p>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6">
                <p className="font-semibold text-cyan-400">
                  Examples
                </p>

                <ul className="mt-3 space-y-2 text-slate-300">
                  <li>• Tossing a coin</li>
                  <li>• Rolling a die</li>
                  <li>• Selecting a student at random</li>
                  <li>• Recording whether a customer makes a purchase</li>
                </ul>
              </div>
            </div>

            {/* OUTCOMES */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-6 text-3xl font-bold">
                2. Outcomes and Sample Spaces
              </h2>

              <p className="mb-4 text-lg leading-relaxed text-slate-300">
                An outcome is one possible result of a random experiment. The
                sample space is the collection of all possible outcomes.
              </p>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6 text-lg text-slate-300">
                For one coin toss, the sample space is:
                <span className="ml-2 font-semibold text-cyan-400">
                  {"{H, T}"}
                </span>
              </div>
            </div>

            {/* EVENTS */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-6 text-3xl font-bold">
                3. Events
              </h2>

              <p className="text-lg leading-relaxed text-slate-300">
                An event is a collection of one or more outcomes from the
                sample space. Events allow us to describe the outcomes we are
                interested in and assign probabilities to them.
              </p>
            </div>

            {/* DATA SCIENCE */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/30 to-blue-900/20 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Think Like a Data Scientist
              </h2>

              <p className="text-lg leading-relaxed text-slate-300">
                Probability provides a mathematical language for uncertainty.
                In data science, we use it to quantify risk, build predictive
                models, evaluate evidence, and reason about outcomes that are
                not known with certainty.
              </p>
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
                  Complete this lesson to earn{" "}
                  <span className="font-bold text-yellow-400">
                    {lesson?.xp_reward ?? 10} XP
                  </span>{" "}
                  and unlock Lesson 2.
                </p>
              </div>

              {completed ? (
                <Link
                  href="/lessons/probability/sample-spaces"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-7 py-4 font-semibold transition hover:scale-105"
                >
                  Continue to Lesson 2
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={completeLesson}
                  disabled={saving || !pretestCompleted}
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