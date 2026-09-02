"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Trophy,
  AlertCircle,
  GraduationCap,
  RotateCcw,
} from "lucide-react";

type LessonRecord = {
  id: string;
  xp_reward: number;
};

type ProgressRecord = {
  status: string;
  percent_complete: number;
};

export default function ProbabilityMasteryQuizPage() {
  const [lesson, setLesson] = useState<LessonRecord | null>(null);

  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");
  const [q5, setQ5] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);
  const [moduleCompleted, setModuleCompleted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const q1Correct = q1 === "All possible outcomes";
  const q2Correct = q2 === "0.20";
  const q3Correct = q3 === "Sampling variability";
  const q4Correct = q4 === "It tends to move closer to 0.5";
  const q5Correct =
    q5 === "Send the flagged transaction for additional review";

  const score = [
    q1Correct,
    q2Correct,
    q3Correct,
    q4Correct,
    q5Correct,
  ].filter(Boolean).length;

  const percentScore = Math.round((score / 5) * 100);

  const masteryThreshold = 80;

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
          setMessage("Please sign in to access this quiz.");
          return;
        }

        const { data: lessonData, error: lessonError } =
          await supabase
            .from("lessons")
            .select("id, xp_reward")
            .eq("module_key", "probability")
            .eq("lesson_key", "module-quiz")
            .single<LessonRecord>();

        if (lessonError) throw lessonError;

        setLesson(lessonData);

        const { data: progressData, error: progressError } =
          await supabase
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
          setPassed(true);
          setModuleCompleted(true);
          setSubmitted(true);
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
        console.error("MASTERY QUIZ LOAD ERROR:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load the mastery quiz."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, []);

  async function submitQuiz() {
    if (!lesson || saving || moduleCompleted) return;

    if (!q1 || !q2 || !q3 || !q4 || !q5) {
      setMessage(
        "Please answer all five questions before submitting."
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
          "Please sign in before submitting the quiz."
        );
        return;
      }

      const didPass =
        percentScore >= masteryThreshold;

      // --------------------------------
      // FAILED ATTEMPT
      // --------------------------------

      if (!didPass) {
        const { error: attemptError } = await supabase
          .from("quiz_attempts")
          .insert({
            student_id: user.id,
            module_key: "probability",
            lesson_key: "module-quiz",
            score,
            total_questions: 5,
            percent_score: percentScore,
            passed: false,
            xp_earned: 0,
          });

        if (attemptError) throw attemptError;

        setSubmitted(true);
        setPassed(false);

        setMessage(
          `You scored ${percentScore}%. Mastery requires ${masteryThreshold}%. Review the feedback and try again.`
        );

        return;
      }

      // --------------------------------
      // PASSING ATTEMPT
      //
      // IMPORTANT:
      // Save the passing attempt FIRST.
      // The database XP function verifies
      // that a passing attempt exists.
      // --------------------------------

      const { data: attemptData, error: attemptError } =
        await supabase
          .from("quiz_attempts")
          .insert({
            student_id: user.id,
            module_key: "probability",
            lesson_key: "module-quiz",
            score,
            total_questions: 5,
            percent_score: percentScore,
            passed: true,

            // Set to 0 initially.
            // We update this only if XP is
            // actually awarded.
            xp_earned: 0,
          })
          .select("id")
          .single();

      if (attemptError) throw attemptError;

      // --------------------------------
      // AWARD MASTERY XP ONLY ONCE
      //
      // The database ignores the XP amount
      // sent by the browser and determines
      // the legitimate reward itself.
      // --------------------------------

      const { data: xpAwarded, error: xpError } =
        await supabase.rpc("award_xp_once", {
          p_student_id: user.id,
          p_source_type: "quiz",
          p_source_key: "probability-mastery-quiz",
          p_xp_amount: lesson.xp_reward,
          p_description:
            "Passed Probability Mastery Quiz",
        });

      if (xpError) throw xpError;

      // --------------------------------
      // RECORD XP ON THIS ATTEMPT
      // --------------------------------

      if (xpAwarded) {
        const { error: attemptXPError } =
          await supabase
            .from("quiz_attempts")
            .update({
              xp_earned: lesson.xp_reward,
            })
            .eq("id", attemptData.id);

        if (attemptXPError) {
          throw attemptXPError;
        }
      }

      // --------------------------------
      // MARK LESSON COMPLETE
      // --------------------------------

      const { error: lessonProgressError } =
        await supabase
          .from("student_lesson_progress")
          .update({
            status: "completed",
            percent_complete: 100,
            completed_at: new Date().toISOString(),
          })
          .eq("student_id", user.id)
          .eq("lesson_id", lesson.id);

      if (lessonProgressError) {
        throw lessonProgressError;
      }

      // --------------------------------
      // MARK PROBABILITY MODULE COMPLETE
      // --------------------------------

      const { error: moduleProgressError } =
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

      if (moduleProgressError) {
        throw moduleProgressError;
      }

      setSubmitted(true);
      setPassed(true);
      setModuleCompleted(true);

      setMessage(
        xpAwarded
          ? `Mastery achieved! You scored ${percentScore}%, earned ${lesson.xp_reward} XP, and completed Module 3: Probability.`
          : `Mastery achieved! You scored ${percentScore}% and completed Module 3: Probability. XP was not awarded again because you already earned the mastery reward.`
      );
    } catch (error) {
      console.error("QUIZ SUBMISSION ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not submit the quiz."
      );
    } finally {
      setSaving(false);
    }
  }

  function retryQuiz() {
    setQ1("");
    setQ2("");
    setQ3("");
    setQ4("");
    setQ5("");

    setSubmitted(false);
    setPassed(false);
    setMessage("");
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
              passed
                ? "border-green-500/30 bg-green-950/30 text-green-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {passed ? (
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
              Loading mastery quiz...
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="mb-10">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/10">
                  <GraduationCap className="h-8 w-8 text-yellow-400" />
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-yellow-400">
                    Module 3 • Lesson 6
                  </p>

                  <h1 className="text-5xl font-bold">
                    Probability Mastery Quiz
                  </h1>
                </div>
              </div>

              <p className="max-w-4xl text-lg leading-relaxed text-slate-400">
                Demonstrate mastery of the ideas you explored throughout the
                Probability learning path. You need at least{" "}
                <span className="font-semibold text-yellow-400">
                  {masteryThreshold}%
                </span>{" "}
                to complete the module.
              </p>
            </div>

            <QuestionCard
              number={1}
              question="What does a sample space contain?"
              options={[
                "Only likely outcomes",
                "All possible outcomes",
                "Only successful outcomes",
                "Only observed outcomes",
              ]}
              value={q1}
              onChange={setQ1}
              submitted={submitted}
              correct={q1Correct}
              correctMessage="Correct. The sample space contains every possible outcome."
              incorrectMessage="Review the definition of a sample space."
              disabled={moduleCompleted}
            />

            <QuestionCard
              number={2}
              question="If P(A) = 0.4 and P(B) = 0.5 and A and B are independent, what is P(A ∩ B)?"
              options={["0.20", "0.40", "0.50", "0.90"]}
              value={q2}
              onChange={setQ2}
              submitted={submitted}
              correct={q2Correct}
              correctMessage="Correct. Independent probabilities multiply."
              incorrectMessage="For independent events, multiply P(A) and P(B)."
              disabled={moduleCompleted}
            />

            <QuestionCard
              number={3}
              question="A fair coin produces 8 heads in 10 tosses. What is the best explanation for why this alone does not prove the coin is biased?"
              options={[
                "Sampling variability",
                "The coin must be unfair",
                "Probability does not apply",
                "Ten tosses guarantee accuracy",
              ]}
              value={q3}
              onChange={setQ3}
              submitted={submitted}
              correct={q3Correct}
              correctMessage="Correct. Small samples can vary substantially by chance."
              incorrectMessage="Think about random variation in small samples."
              disabled={moduleCompleted}
            />

            <QuestionCard
              number={4}
              question="For a fair coin, what generally happens to the observed proportion of heads as the number of tosses becomes very large?"
              options={[
                "It always becomes exactly 1",
                "It tends to move closer to 0.5",
                "It becomes more variable",
                "It alternates between 0 and 1",
              ]}
              value={q4}
              onChange={setQ4}
              submitted={submitted}
              correct={q4Correct}
              correctMessage="Correct. This reflects long-run stabilization."
              incorrectMessage="Recall what you observed in the simulation lesson."
              disabled={moduleCompleted}
            />

            <QuestionCard
              number={5}
              question="A fraud model flags a transaction, but fraud is rare and false positives occur. Which decision is most statistically defensible?"
              options={[
                "Automatically block every flagged transaction",
                "Send the flagged transaction for additional review",
                "Assume the model is always correct",
                "Ignore every model prediction",
              ]}
              value={q5}
              onChange={setQ5}
              submitted={submitted}
              correct={q5Correct}
              correctMessage="Correct. Statistical predictions should inform decisions without ignoring uncertainty and false-positive costs."
              incorrectMessage="Think about base rates, false positives, and decision consequences."
              disabled={moduleCompleted}
            />

            {/* SCORE */}
            {submitted && !moduleCompleted && (
              <div
                className={`mb-8 rounded-3xl border p-8 ${
                  passed
                    ? "border-green-500/30 bg-green-950/20"
                    : "border-yellow-500/30 bg-yellow-950/10"
                }`}
              >
                <h2 className="mb-4 text-3xl font-bold">
                  Quiz Result
                </h2>

                <p className="text-5xl font-bold">
                  {percentScore}%
                </p>

                <p className="mt-3 text-lg text-slate-300">
                  {score} out of 5 questions correct
                </p>

                {!passed && (
                  <button
                    type="button"
                    onClick={retryQuiz}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-3 font-semibold text-yellow-300 transition hover:bg-yellow-500/20"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Try Again
                  </button>
                )}
              </div>
            )}

            {/* COMPLETION */}
            <div className="flex flex-col justify-between gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />

                  <h2 className="text-2xl font-bold">
                    Mastery Reward
                  </h2>
                </div>

                <p className="text-slate-300">
                  Score at least {masteryThreshold}% to earn{" "}
                  <span className="font-bold text-yellow-400">
                    {lesson?.xp_reward ?? 20} XP
                  </span>{" "}
                  and complete Module 3.
                </p>
              </div>

              {moduleCompleted ? (
                <Link
                  href="/learning-paths"
                  className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-7 py-4 font-semibold transition hover:scale-105"
                >
                  Return to Learning Paths
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={submitQuiz}
                  disabled={saving || submitted}
                  className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}

                  {saving
                    ? "Submitting..."
                    : "Submit Quiz"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

type QuestionCardProps = {
  number: number;
  question: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  submitted: boolean;
  correct: boolean;
  correctMessage: string;
  incorrectMessage: string;
  disabled: boolean;
};

function QuestionCard({
  number,
  question,
  options,
  value,
  onChange,
  submitted,
  correct,
  correctMessage,
  incorrectMessage,
  disabled,
}: QuestionCardProps) {
  return (
    <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-purple-400">
        Question {number}
      </p>

      <h2 className="mb-6 text-2xl font-bold">
        {question}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled || submitted}
            onClick={() => onChange(option)}
            className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed ${
              value === option
                ? "border-purple-400 bg-purple-600"
                : "border-slate-700 bg-slate-950 hover:border-purple-500"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {submitted && value && (
        <div className="mt-5">
          {correct ? (
            <p className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              {correctMessage}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              {incorrectMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}