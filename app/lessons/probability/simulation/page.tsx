"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Trophy,
  FlaskConical,
  RefreshCw,
  AlertCircle,
  Coins,
  Brain,
} from "lucide-react";

type LessonRecord = {
  id: string;
  xp_reward: number;
};

type ProgressRecord = {
  status: string;
  percent_complete: number;
};

type SimulationRun = {
  id: number;
  flips: number;
  heads: number;
  tails: number;
  proportion: number;
};

export default function ProbabilitySimulationPage() {
  const [lesson, setLesson] = useState<LessonRecord | null>(null);

  const [numberOfFlips, setNumberOfFlips] = useState(100);
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [reflection, setReflection] = useState("");

  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          setMessage("Please sign in to access this lesson.");
          return;
        }

        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("id, xp_reward")
          .eq("module_key", "probability")
          .eq("lesson_key", "simulation")
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
        console.error("SIMULATION LESSON LOAD ERROR:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load the simulation lesson."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, []);

  function runSimulation() {
    if (
      !Number.isFinite(numberOfFlips) ||
      numberOfFlips < 1 ||
      numberOfFlips > 100000
    ) {
      setMessage(
        "Choose a number of flips between 1 and 100,000."
      );
      return;
    }

    let heads = 0;

    for (let i = 0; i < numberOfFlips; i++) {
      if (Math.random() < 0.5) {
        heads++;
      }
    }

    const tails = numberOfFlips - heads;
    const proportion = heads / numberOfFlips;

    const newRun: SimulationRun = {
      id: Date.now(),
      flips: numberOfFlips,
      heads,
      tails,
      proportion,
    };

    setRuns((previousRuns) => [
      newRun,
      ...previousRuns,
    ]);

    setMessage("");
  }

  function clearRuns() {
    setRuns([]);
    setMessage("");
  }

  const latestRun = runs[0];

  const differenceFromExpected = useMemo(() => {
    if (!latestRun) return null;

    return Math.abs(latestRun.proportion - 0.5);
  }, [latestRun]);

  const canComplete =
    runs.length >= 3 &&
    reflection.trim().length >= 20;

  async function completeLesson() {
  if (!lesson || completed || saving) return;

  if (runs.length < 3) {
    setMessage(
      "Run the simulation at least three times before completing the lesson."
    );
    return;
  }

  if (reflection.trim().length < 20) {
    setMessage(
      "Write a short reflection about what you observed before completing the lesson."
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

    // ----------------------------------
    // AWARD XP ONLY ONCE
    // ----------------------------------

    const { data: xpAwarded, error: xpError } =
      await supabase.rpc("award_xp_once", {
        p_student_id: user.id,
        p_source_type: "lesson",
        p_source_key: "probability-simulation",
        p_xp_amount: lesson.xp_reward,
        p_description: "Completed Probability Simulation lesson",
      });

    if (xpError) throw xpError;

    // ----------------------------------
    // MARK LESSON COMPLETE
    // ----------------------------------

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

    // ----------------------------------
    // FIND NEXT LESSON
    // ----------------------------------

    const { data: nextLesson, error: nextLessonError } =
      await supabase
        .from("lessons")
        .select("id")
        .eq("module_key", "probability")
        .eq("lesson_key", "ai-critique")
        .single();

    if (nextLessonError) throw nextLessonError;

    // ----------------------------------
    // UNLOCK NEXT LESSON
    // ----------------------------------

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
        ? `Simulation complete. You earned ${lesson.xp_reward} XP and unlocked AI Interpretation Check.`
        : "Simulation complete. AI Interpretation Check is unlocked. XP was not awarded again because you already earned the reward for this lesson."
    );
  } catch (error) {
    console.error(
      "SIMULATION COMPLETION ERROR:",
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
        {/* BACK */}
        <Link
          href="/learning-paths/probability"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition hover:text-purple-400"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Probability Module
        </Link>

        {/* MESSAGE */}
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
              Loading simulation...
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="mb-10">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10">
                  <FlaskConical className="h-8 w-8 text-green-400" />
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-green-400">
                    Module 3 • Lesson 3
                  </p>

                  <h1 className="text-5xl font-bold">
                    Probability Simulation
                  </h1>
                </div>
              </div>

              <p className="max-w-4xl text-lg leading-relaxed text-slate-400">
                Investigate randomness by repeatedly flipping a
                simulated fair coin. Explore what happens to the
                observed proportion of heads as the number of
                trials changes.
              </p>
            </div>

            {/* LEARNING GOAL */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/30 to-blue-900/20 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Your Investigation
              </h2>

              <p className="text-lg leading-relaxed text-slate-300">
                A fair coin has a theoretical probability of
                0.5 for heads. Your goal is to investigate
                whether the experimental proportion of heads
                becomes more stable as the number of flips
                increases.
              </p>
            </div>

            {/* SIMULATOR */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <div className="mb-6 flex items-center gap-4">
                <Coins className="h-10 w-10 text-yellow-400" />

                <div>
                  <h2 className="text-3xl font-bold">
                    Coin Flip Simulator
                  </h2>

                  <p className="mt-1 text-slate-400">
                    You decide the sample size.
                  </p>
                </div>
              </div>

              <label className="mb-3 block text-lg font-semibold text-slate-300">
                How many times would you like to flip the
                coin?
              </label>

              <input
                type="number"
                min="1"
                max="100000"
                value={numberOfFlips}
                disabled={completed}
                onChange={(event) =>
                  setNumberOfFlips(
                    Number(event.target.value)
                  )
                }
                className="mb-5 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-4 text-xl text-white outline-none transition focus:border-purple-500"
              />

              <div className="flex flex-wrap gap-4">
                {[10, 100, 1000, 10000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={completed}
                    onClick={() =>
                      setNumberOfFlips(value)
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-2 text-slate-300 transition hover:border-cyan-500 disabled:opacity-50"
                  >
                    {value.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={runSimulation}
                  disabled={completed}
                  className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105 disabled:opacity-50"
                >
                  <FlaskConical className="h-5 w-5" />
                  Flip Coin
                </button>

                {runs.length > 0 && !completed && (
                  <button
                    type="button"
                    onClick={clearRuns}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-7 py-4 font-semibold text-slate-300 transition hover:border-slate-500"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Clear Results
                  </button>
                )}
              </div>
            </div>

            {/* LATEST RESULT */}
            {latestRun && (
              <div className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-950/10 p-8">
                <h2 className="mb-6 text-3xl font-bold">
                  Latest Result
                </h2>

                <div className="grid gap-6 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">
                      Flips
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {latestRun.flips.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">
                      Heads
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-400">
                      {latestRun.heads.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">
                      Tails
                    </p>

                    <p className="mt-2 text-3xl font-bold text-purple-400">
                      {latestRun.tails.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">
                      Proportion Heads
                    </p>

                    <p className="mt-2 text-3xl font-bold text-cyan-400">
                      {latestRun.proportion.toFixed(4)}
                    </p>
                  </div>
                </div>

                {differenceFromExpected !== null && (
                  <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-slate-300">
                      Distance from theoretical probability
                      0.5:
                      <span className="ml-2 font-bold text-yellow-400">
                        {differenceFromExpected.toFixed(4)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* RUN HISTORY */}
            {runs.length > 0 && (
              <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
                <h2 className="mb-2 text-3xl font-bold">
                  Your Experiments
                </h2>

                <p className="mb-6 text-slate-400">
                  Try different sample sizes and compare the
                  results.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="px-4 py-4">
                          Run
                        </th>

                        <th className="px-4 py-4">
                          Flips
                        </th>

                        <th className="px-4 py-4">
                          Heads
                        </th>

                        <th className="px-4 py-4">
                          Tails
                        </th>

                        <th className="px-4 py-4">
                          Proportion Heads
                        </th>

                        <th className="px-4 py-4">
                          |p̂ − 0.5|
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {runs.map((run, index) => (
                        <tr
                          key={run.id}
                          className="border-b border-slate-800"
                        >
                          <td className="px-4 py-4">
                            {runs.length - index}
                          </td>

                          <td className="px-4 py-4">
                            {run.flips.toLocaleString()}
                          </td>

                          <td className="px-4 py-4 text-green-400">
                            {run.heads.toLocaleString()}
                          </td>

                          <td className="px-4 py-4 text-purple-400">
                            {run.tails.toLocaleString()}
                          </td>

                          <td className="px-4 py-4 font-semibold text-cyan-400">
                            {run.proportion.toFixed(4)}
                          </td>

                          <td className="px-4 py-4 text-yellow-400">
                            {Math.abs(
                              run.proportion - 0.5
                            ).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* THINK */}
            <div className="mb-8 rounded-3xl border border-purple-500/20 bg-purple-950/10 p-8">
              <div className="mb-5 flex items-center gap-3">
                <Brain className="h-8 w-8 text-pink-400" />

                <h2 className="text-3xl font-bold">
                  Think Like a Data Scientist
                </h2>
              </div>

              <p className="mb-5 text-lg leading-relaxed text-slate-300">
                Try at least three experiments. Change the
                number of flips between experiments. For
                example, compare a small sample with much
                larger samples.
              </p>

              <p className="mb-6 text-lg font-semibold text-white">
                What happens to the observed proportion of
                heads as the sample size becomes larger? Why
                do you think this happens?
              </p>

              <textarea
                value={reflection}
                disabled={completed}
                onChange={(event) =>
                  setReflection(event.target.value)
                }
                placeholder="Describe what you observed across your simulations..."
                className="h-40 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white outline-none transition focus:border-purple-500 disabled:opacity-60"
              />
            </div>

            {/* COMPLETION REQUIREMENTS */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-5 text-2xl font-bold">
                Lesson Checklist
              </h2>

              <div className="space-y-4">
                <div
                  className={`flex items-center gap-3 ${
                    runs.length >= 3
                      ? "text-green-400"
                      : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />

                  Run at least three simulations
                  ({Math.min(runs.length, 3)}/3)
                </div>

                <div
                  className={`flex items-center gap-3 ${
                    reflection.trim().length >= 20
                      ? "text-green-400"
                      : "text-slate-400"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />

                  Explain what you observed
                </div>
              </div>
            </div>

            {/* COMPLETE */}
            <div className="flex flex-col justify-between gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />

                  <h2 className="text-2xl font-bold">
                    Lesson Reward
                  </h2>
                </div>

                <p className="text-slate-300">
                  Complete the investigation to earn{" "}
                  <span className="font-bold text-yellow-400">
                    {lesson?.xp_reward ?? 25} XP
                  </span>{" "}
                  and unlock AI Interpretation Check.
                </p>
              </div>

              {completed ? (
                <Link
                  href="/lessons/probability/ai-critique"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-7 py-4 font-semibold transition hover:scale-105"
                >
                  Continue to Lesson 4
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={completeLesson}
                  disabled={saving || !canComplete}
                  className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : "Complete Simulation"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}