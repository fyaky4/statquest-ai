"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import {
  Brain,
  Trophy,
  FlaskConical,
  CheckCircle,
  XCircle,
  Sparkles,
  Code2,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

type ExistingSubmission = {
  selected_answer: string | null;
  simulation_response: string | null;
  ai_critique_response: string | null;
  reflection_response: string | null;
  score: number | null;
  xp_earned: number | null;
};

type ProfileData = {
  total_xp: number | null;
  ai_critiques: number | null;
};

export default function LearningPathModulePage() {
  const params = useParams<{ id: string }>();
  const moduleId = params.id;

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [aiCritique, setAiCritique] = useState("");
  const [reflection, setReflection] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const correctAnswer = "1000 tosses";
  const isCorrect = selectedAnswer === correctAnswer;

  const xpEarned = isCorrect ? 120 : 80;
  const score = isCorrect ? 100 : 70;

  const progressItems = [
    selectedAnswer,
    shortAnswer,
    aiCritique,
    reflection,
  ];

  const completedCount = progressItems.filter(
    (item) => item.trim() !== ""
  ).length;

  const progressPercent = Math.round(
    (completedCount / progressItems.length) * 100
  );

  const loadExistingSubmission = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setErrorMessage("Please log in to access this learning module.");
        return;
      }

      if (moduleId !== "probability") {
        setErrorMessage("This learning module is not available yet.");
        return;
      }

      const { data, error } = await supabase
        .from("lab_submissions")
        .select(
          `
          selected_answer,
          simulation_response,
          ai_critique_response,
          reflection_response,
          score,
          xp_earned
        `
        )
        .eq("student_id", user.id)
        .eq("lab_id", "probability-simulation")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle<ExistingSubmission>();

      if (error) throw error;

      if (data) {
        setSelectedAnswer(data.selected_answer ?? "");
        setShortAnswer(data.simulation_response ?? "");
        setAiCritique(data.ai_critique_response ?? "");
        setReflection(data.reflection_response ?? "");
        setSubmitted(true);
        setMessage(
          `You previously completed this lab and earned ${
            data.xp_earned ?? 0
          } XP.`
        );
      }
    } catch (error) {
      console.error("LOAD LAB ERROR:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load this learning module."
      );
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    loadExistingSubmission();
  }, [loadExistingSubmission]);

  async function handleSubmit() {
    if (submitted || saving) return;

    setMessage("");
    setErrorMessage("");

    if (
      !selectedAnswer ||
      !shortAnswer.trim() ||
      !aiCritique.trim() ||
      !reflection.trim()
    ) {
      setErrorMessage(
        "Please complete the simulation response, quick check, AI critique, and reflection before submitting."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setErrorMessage("Please log in before submitting this lab.");
        return;
      }

      const { data: existingSubmission, error: existingError } =
        await supabase
          .from("lab_submissions")
          .select("id, xp_earned")
          .eq("student_id", user.id)
          .eq("lab_id", "probability-simulation")
          .limit(1)
          .maybeSingle();

      if (existingError) throw existingError;

      if (existingSubmission) {
        setSubmitted(true);
        setMessage(
          "This lab was already submitted. XP cannot be awarded twice."
        );

        await supabase
          .from("learning_progress")
          .upsert(
            {
              student_id: user.id,
              module_key: "probability",
              module_name: "Module 3: Probability",
              completed: true,
              percent_complete: 100,
              completed_at: new Date().toISOString(),
            },
            {
              onConflict: "student_id,module_key",
            }
          );

        return;
      }

      const { error: submissionError } = await supabase
        .from("lab_submissions")
        .insert({
          student_id: user.id,
          lab_id: "probability-simulation",
          selected_answer: selectedAnswer,
          simulation_response: shortAnswer.trim(),
          ai_critique_response: aiCritique.trim(),
          reflection_response: reflection.trim(),
          score,
          xp_earned: xpEarned,
        });

      if (submissionError) throw submissionError;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("total_xp, ai_critiques")
        .eq("id", user.id)
        .single<ProfileData>();

      if (profileError) throw profileError;

      const currentXP = profileData?.total_xp ?? 0;
      const currentCritiques = profileData?.ai_critiques ?? 0;

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          total_xp: currentXP + xpEarned,
          ai_critiques: currentCritiques + 1,
        })
        .eq("id", user.id);

      if (profileUpdateError) throw profileUpdateError;

      const { error: progressError } = await supabase
        .from("learning_progress")
        .upsert(
          {
            student_id: user.id,
            module_key: "probability",
            module_name: "Module 3: Probability",
            completed: true,
            percent_complete: 100,
            completed_at: new Date().toISOString(),
          },
          {
            onConflict: "student_id,module_key",
          }
        );

      if (progressError) throw progressError;

      setSubmitted(true);
      setMessage(
        `Lab saved successfully. You earned ${xpEarned} XP, completed the Probability module, and received credit for one AI critique.`
      );
    } catch (error) {
      console.error("SUBMISSION ERROR:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving your lab."
      );
    } finally {
      setSaving(false);
    }
  }

  if (moduleId !== "probability") {
    return (
      <main className="flex min-h-screen bg-[#020617] text-white">
        <Sidebar />

        <section className="flex-1 p-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10">
            <h1 className="mb-4 text-4xl font-bold">
              Module Coming Soon
            </h1>

            <p className="mb-8 text-lg text-slate-400">
              This learning module is still being developed.
            </p>

            <Link
              href="/learning-paths"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold"
            >
              <ArrowLeft className="h-5 w-5" />
              Return to Learning Paths
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        <Link
          href="/learning-paths"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition hover:text-purple-400"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Learning Paths
        </Link>

        {errorMessage && (
          <div className="mb-8 flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-7 w-7 animate-spin" />
              Loading Probability module...
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="mb-10">
              <div className="mb-6 flex items-center gap-4">
                <FlaskConical className="h-14 w-14 text-green-400" />

                <div>
                  <h1 className="text-5xl font-bold">
                    Probability & Simulation
                  </h1>

                  <p className="mt-2 text-lg text-slate-400">
                    Module 3 Interactive Decision Lab
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-3 flex justify-between">
                  <span className="font-semibold text-slate-300">
                    Lab Progress
                  </span>

                  <span className="font-bold text-cyan-400">
                    {submitted ? 100 : progressPercent}%
                  </span>
                </div>

                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-950">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-purple-600 to-cyan-400 transition-all"
                    style={{
                      width: `${
                        submitted ? 100 : progressPercent
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* REAL-WORLD SCENARIO */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/40 to-blue-900/20 p-8">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-400" />

                <h2 className="text-3xl font-bold">
                  Real-World Scenario
                </h2>
              </div>

              <p className="text-lg leading-relaxed text-slate-300">
                A data scientist wants to understand how reliable a sample
                result is. Instead of relying only on formulas, they simulate
                coin tosses with different sample sizes and compare the
                results.
              </p>
            </div>

            {/* OBJECTIVES */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-6 text-3xl font-bold">
                Learning Objectives
              </h2>

              <ul className="space-y-4 text-lg text-slate-300">
                <li>• Understand sample spaces and events</li>
                <li>• Explore simulation and randomness</li>
                <li>• Explain the Law of Large Numbers</li>
                <li>
                  • Critically evaluate AI-generated interpretations
                </li>
              </ul>
            </div>

            {/* R SIMULATION */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <div className="mb-6 flex items-center gap-4">
                <Code2 className="h-10 w-10 text-cyan-400" />

                <h2 className="text-3xl font-bold">
                  R Simulation Task
                </h2>
              </div>

              <p className="mb-6 text-lg text-slate-300">
                Run this R code to simulate coin tosses and observe how the
                sample proportion changes as the sample size increases.
              </p>

              <pre className="mb-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 text-green-400">
{`set.seed(380)

# 10 tosses
mean(sample(c(0, 1), 10, replace = TRUE))

# 100 tosses
mean(sample(c(0, 1), 100, replace = TRUE))

# 1000 tosses
mean(sample(c(0, 1), 1000, replace = TRUE))`}
              </pre>

              <textarea
                value={shortAnswer}
                onChange={(event) =>
                  setShortAnswer(event.target.value)
                }
                disabled={submitted || saving}
                placeholder="Record your simulation results and describe what you observed..."
                className="h-36 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white focus:border-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* QUICK CHECK */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-6 text-3xl font-bold">
                Quick Check
              </h2>

              <p className="mb-6 text-lg text-slate-300">
                Which sample size should generally give a sample proportion
                closest to the true probability of heads, 0.5?
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  "10 tosses",
                  "100 tosses",
                  "1000 tosses",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedAnswer(option)}
                    disabled={submitted || saving}
                    className={`rounded-2xl border p-5 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selectedAnswer === option
                        ? "border-purple-400 bg-purple-600"
                        : "border-slate-700 bg-slate-950 hover:border-purple-500"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {submitted && selectedAnswer && (
                <div className="mt-6">
                  {isCorrect ? (
                    <div className="flex items-center gap-3 text-green-400">
                      <CheckCircle className="h-6 w-6" />
                      <span>
                        Correct. Larger samples tend to produce more stable
                        estimates.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-red-400">
                      <XCircle className="h-6 w-6" />
                      <span>
                        Not quite. Think about how variability changes as
                        sample size increases.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI CRITIQUE */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/40 to-blue-900/20 p-8">
              <div className="mb-6 flex items-center gap-4">
                <Brain className="h-12 w-12 text-pink-400" />

                <h2 className="text-3xl font-bold">
                  AI Interpretation Check
                </h2>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950 p-6">
                <p className="text-lg leading-relaxed text-slate-300">
                  “Since the simulation with 10 tosses produced many heads,
                  the coin is probably biased.”
                </p>
              </div>

              <textarea
                value={aiCritique}
                onChange={(event) =>
                  setAiCritique(event.target.value)
                }
                disabled={submitted || saving}
                placeholder="Explain why this interpretation may or may not be correct..."
                className="h-40 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white focus:border-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />

              {submitted && aiCritique.trim() && (
                <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5">
                  <p className="mb-2 font-semibold text-cyan-400">
                    Instructor Feedback
                  </p>

                  <p className="leading-relaxed text-slate-300">
                    A sample of 10 tosses is very small, so unusual results
                    can happen by random chance. Strong evidence of bias
                    would require more data or repeated simulations showing
                    consistent deviation from 0.5.
                  </p>
                </div>
              )}
            </div>

            {/* REFLECTION */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-6 text-3xl font-bold">
                Decision Reflection
              </h2>

              <p className="mb-6 text-lg text-slate-300">
                In one short paragraph, explain how simulation can help data
                scientists make better decisions under uncertainty.
              </p>

              <textarea
                value={reflection}
                onChange={(event) =>
                  setReflection(event.target.value)
                }
                disabled={submitted || saving}
                placeholder="Write your reflection here..."
                className="h-40 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white focus:border-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* SUBMISSION */}
            <div className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="mb-3 text-3xl font-bold">
                  Module Rewards
                </h2>

                <p className="text-lg text-slate-300">
                  Submit the lab to complete the Probability module, earn
                  XP, and unlock badge progress.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 text-yellow-400">
                  <Trophy className="h-10 w-10" />

                  <span className="text-3xl font-bold">
                    {xpEarned} XP
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || submitted}
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-4 font-semibold transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {saving && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : submitted
                      ? "Module Completed"
                      : "Submit Lab"}
                </button>
              </div>
            </div>

            {message && (
              <div
                className={`mt-8 rounded-3xl border p-6 ${
                  submitted
                    ? "border-green-500/30 bg-green-900/30"
                    : "border-red-500/30 bg-red-900/30"
                }`}
              >
                <h3
                  className={`mb-2 text-2xl font-bold ${
                    submitted ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {submitted
                    ? "Probability Module Completed"
                    : "Submission Notice"}
                </h3>

                <p className="text-slate-300">
                  {message}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}