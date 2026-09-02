"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

type ExistingAttempt = {
  id: string;
};

type Question = {
  key: string;
  prompt: string;
  options: string[];
};

const questions: Question[] = [
  {
    key: "q1",
    prompt: "What does a sample space contain?",
    options: [
      "Only likely outcomes",
      "All possible outcomes",
      "Only observed outcomes",
      "Only successful outcomes",
    ],
  },
  {
    key: "q2",
    prompt: "If P(A) = 0.30, what is P(Aᶜ)?",
    options: ["0.30", "0.50", "0.70", "1.30"],
  },
  {
    key: "q3",
    prompt:
      "If P(A) = 0.4 and P(B) = 0.5 and A and B are independent, what is P(A ∩ B)?",
    options: ["0.10", "0.20", "0.40", "0.90"],
  },
  {
    key: "q4",
    prompt:
      "If knowing that event B occurred does not change the probability of event A, the two events are:",
    options: [
      "Mutually exclusive",
      "Independent",
      "Complements",
      "Impossible",
    ],
  },
  {
    key: "q5",
    prompt: "What does P(A | B) mean?",
    options: [
      "The probability of A given that B occurred",
      "The probability of A and B never occurring",
      "The probability of A plus B",
      "The probability of B given that A did not occur",
    ],
  },
  {
    key: "q6",
    prompt:
      "A fair coin is tossed 10 times and produces 8 heads. What is the best interpretation?",
    options: [
      "The coin is definitely biased",
      "The result could occur because of random variation",
      "The true probability of heads is now 0.8",
      "The probability model is invalid",
    ],
  },
  {
    key: "q7",
    prompt:
      "For a fair coin, what generally happens to the observed proportion of heads as the number of tosses becomes very large?",
    options: [
      "It tends to move closer to 0.5",
      "It always becomes exactly 1",
      "It becomes increasingly variable",
      "It alternates between 0 and 1",
    ],
  },
  {
    key: "q8",
    prompt:
      "Which statement best describes the effect of increasing sample size?",
    options: [
      "Larger samples generally have less sampling variability",
      "Larger samples always eliminate error",
      "Larger samples always increase variability",
      "Sample size has no effect on variability",
    ],
  },
  {
    key: "q9",
    prompt:
      "A fraud model flags a transaction, but fraud is rare and false positives occur. What is the most defensible action?",
    options: [
      "Automatically block every flagged transaction",
      "Send the flagged transaction for additional review",
      "Assume every flag proves fraud",
      "Ignore all model predictions",
    ],
  },
  {
    key: "q10",
    prompt:
      "Why can a positive fraud alert still have a substantial chance of being a false positive?",
    options: [
      "The base rate of fraud is low",
      "The probability of fraud is always 0.5",
      "False positives cannot occur",
      "Base rates do not affect interpretation",
    ],
  },
  {
    key: "q11",
    prompt:
      "A sample mean is calculated from observed data. Which statement is most accurate?",
    options: [
      "A sample statistic is an estimate of a population parameter",
      "A sample statistic always equals the population parameter",
      "A population parameter changes every time a sample is collected",
      "Sample statistics cannot be used for inference",
    ],
  },
  {
    key: "q12",
    prompt:
      "An AI-generated statistical explanation sounds very confident. What should a data scientist do before accepting it?",
    options: [
      "Verify the assumptions, calculation, and interpretation",
      "Accept it because confidence implies correctness",
      "Check only the grammar",
      "Ignore all AI-generated statistical explanations",
    ],
  },
];

export default function ProbabilityPretestPage() {
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [existingAttempt, setExistingAttempt] =
    useState<ExistingAttempt | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  const answeredCount = useMemo(() => {
    return questions.filter((question) =>
      Boolean(answers[question.key])
    ).length;
  }, [answers]);

  const progressPercent = Math.round(
    (answeredCount / questions.length) * 100
  );

  useEffect(() => {
    let active = true;

    async function loadPretest() {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/auth");
          return;
        }

        /*
          We intentionally request ONLY the attempt ID.

          The pretest score is a baseline measure and does not need
          to be shown on the student-facing page.
        */
        const { data, error } = await supabase
          .from("module_pretest_attempts")
          .select("id")
          .eq("student_id", user.id)
          .eq("module_key", "probability")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!active) return;

        if (data) {
          setExistingAttempt({
            id: data.id,
          });

          setSubmitted(true);
        }
      } catch (error) {
        console.error("PRETEST LOAD ERROR:", error);

        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load the Probability pretest."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPretest();

    return () => {
      active = false;
    };
  }, [router]);

  function selectAnswer(
    questionKey: string,
    option: string
  ) {
    if (submitted || saving) return;

    setAnswers((current) => ({
      ...current,
      [questionKey]: option,
    }));

    /*
      Remove an earlier validation message once the
      student continues answering questions.
    */
    if (message) {
      setMessage("");
    }
  }

  async function submitPretest() {
    if (saving || submitted) return;

    if (answeredCount !== questions.length) {
      setMessage(
        `Please answer all ${questions.length} questions before submitting. You have answered ${answeredCount}/${questions.length}.`
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

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/auth");
        return;
      }

      /*
        IMPORTANT:

        The browser sends only the student's selected answers.

        Scoring must remain inside the Supabase RPC so that the
        browser cannot determine its own score or manipulate the
        answer key.

        The RPC should also:

        1. verify auth.uid() = p_student_id
        2. enforce one attempt per student/module
        3. grade the answers server-side
        4. save the attempt
        5. save item responses
        6. award NO XP
        7. NOT complete instructional learning progress
      */
      const { data, error } = await supabase.rpc(
        "submit_probability_pretest",
        {
          p_student_id: user.id,
          p_answers: answers,
        }
      );

      if (error) {
        const errorMessage =
          error.message?.toLowerCase() ?? "";

        /*
          If the server says the student has already submitted,
          treat the assessment as complete rather than allowing
          a second attempt.
        */
        if (
          errorMessage.includes("already submitted") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("duplicate")
        ) {
          const { data: attemptData } = await supabase
            .from("module_pretest_attempts")
            .select("id")
            .eq("student_id", user.id)
            .eq("module_key", "probability")
            .maybeSingle();

          if (attemptData) {
            setExistingAttempt({
              id: attemptData.id,
            });
          }

          setSubmitted(true);

          setMessage(
            "Your Probability pretest has already been recorded."
          );

          return;
        }

        throw error;
      }

      /*
        The exact RPC response format is not important for the
        student-facing page. We only keep an attempt ID if one
        is returned.

        We deliberately do NOT store or display the baseline score.
      */
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];

        if (result?.attempt_id) {
          setExistingAttempt({
            id: result.attempt_id,
          });
        }
      } else if (
        data &&
        typeof data === "object" &&
        "attempt_id" in data
      ) {
        const result = data as {
          attempt_id?: string;
        };

        if (result.attempt_id) {
          setExistingAttempt({
            id: result.attempt_id,
          });
        }
      }

      setSubmitted(true);

      setMessage(
        "Baseline recorded successfully. Your responses have been saved. You may now begin the Probability module."
      );
    } catch (error) {
      console.error("PRETEST SUBMISSION ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not submit the Probability pretest."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen bg-[#020617] text-white">
        <Sidebar />

        <section className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="h-7 w-7 animate-spin" />
            Loading Probability pretest...
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
          href="/learning-paths/probability"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition hover:text-purple-400"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Probability Module
        </Link>

        <div className="mb-10">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
              <ClipboardCheck className="h-8 w-8 text-cyan-400" />
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-cyan-400">
                Module 3 • Baseline Assessment
              </p>

              <h1 className="text-5xl font-bold">
                Probability Pretest
              </h1>
            </div>
          </div>

          <p className="max-w-4xl text-lg leading-relaxed text-slate-400">
            This {questions.length}-question assessment records what
            you know before beginning the Probability module. It does
            not award XP and does not affect your course grade.
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

        {!submitted && (
          <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                Assessment Progress
              </span>

              <span className="font-bold text-cyan-400">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-950">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-400 transition-all"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>
        )}

        {submitted ? (
          <div className="rounded-3xl border border-green-500/30 bg-gradient-to-r from-green-950/30 to-emerald-950/20 p-10">
            <CheckCircle className="mb-5 h-14 w-14 text-green-400" />

            <h2 className="mb-4 text-4xl font-bold">
              Baseline Recorded
            </h2>

            <p className="max-w-3xl text-lg leading-relaxed text-slate-300">
              Your pretest responses have been saved. This assessment
              is used to measure your starting knowledge before the
              Probability learning activities.
            </p>

            <p className="mt-4 max-w-3xl text-slate-400">
              Your pretest score is intentionally not displayed here.
              Your instructor can use the baseline later to evaluate
              learning progress.
            </p>

            <Link
              href="/lessons/probability/concept-overview"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105"
            >
              Begin Lesson 1
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        ) : (
          <>
            {questions.map((question, index) => (
              <QuestionCard
                key={question.key}
                number={index + 1}
                question={question}
                selectedAnswer={
                  answers[question.key] ?? ""
                }
                onSelect={(option) =>
                  selectAnswer(question.key, option)
                }
                disabled={saving}
              />
            ))}

            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 md:flex-row md:items-center">
              <div>
                <h2 className="mb-2 text-3xl font-bold">
                  Submit Baseline Assessment
                </h2>

                <p className="text-slate-300">
                  You must answer all {questions.length} questions
                  before submitting.
                </p>
              </div>

              <button
                type="button"
                onClick={submitPretest}
                disabled={
                  saving ||
                  answeredCount !== questions.length
                }
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-4 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}

                {saving
                  ? "Submitting..."
                  : "Submit Pretest"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

type QuestionCardProps = {
  number: number;
  question: Question;
  selectedAnswer: string;
  onSelect: (option: string) => void;
  disabled: boolean;
};

function QuestionCard({
  number,
  question,
  selectedAnswer,
  onSelect,
  disabled,
}: QuestionCardProps) {
  return (
    <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-purple-400">
        Question {number}
      </p>

      <h2 className="mb-6 text-2xl font-bold">
        {question.prompt}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            disabled={disabled}
            className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed ${
              selectedAnswer === option
                ? "border-purple-400 bg-purple-600"
                : "border-slate-700 bg-slate-950 hover:border-purple-500"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}