"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Trophy,
  Flame,
  LoaderCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type ProfileData = {
  streak: number | null;
};

type ExistingSubmission = {
  score: number;
  xp_earned: number;
  q1_answer: string | null;
  q2_answer: string | null;
  reflection: string | null;
};

type SubmissionDate = {
  quest_date: string;
};

type QuestQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  correctFeedback: string;
  incorrectFeedback: string;
};

type DailyQuestDefinition = {
  title: string;
  theme: string;
  q1: QuestQuestion;
  q2: QuestQuestion;
  reflectionPrompt: string;
};

const questBank: DailyQuestDefinition[] = [
  {
    title: "Independence & Sample Size",
    theme: "Probability Fundamentals",
    q1: {
      question:
        "If P(A) = 0.4 and P(B) = 0.5, and A and B are independent, what is P(A ∩ B)?",
      options: ["0.10", "0.20", "0.40", "0.90"],
      correctAnswer: "0.20",
      correctFeedback:
        "Correct. For independent events, P(A ∩ B) = P(A)P(B).",
      incorrectFeedback:
        "Not quite. For independent events, multiply P(A) and P(B).",
    },
    q2: {
      question:
        "In general, increasing the sample size tends to produce:",
      options: [
        "More variability",
        "Less variability",
        "No change",
        "Guaranteed accuracy",
      ],
      correctAnswer: "Less variability",
      correctFeedback:
        "Correct. Larger samples generally reduce sampling variability.",
      incorrectFeedback:
        "Think about how estimates stabilize as the sample size increases.",
    },
    reflectionPrompt:
      "In one sentence, explain why larger sample sizes are useful in data science.",
  },

  {
    title: "Sample Spaces & Events",
    theme: "Events and Outcomes",
    q1: {
      question:
        "A fair six-sided die is rolled once. Which set is the sample space?",
      options: [
        "{1,2,3,4,5,6}",
        "{1,2,3}",
        "{2,4,6}",
        "{0,1}",
      ],
      correctAnswer: "{1,2,3,4,5,6}",
      correctFeedback:
        "Correct. The sample space contains every possible outcome.",
      incorrectFeedback:
        "Remember that a sample space must contain all possible outcomes.",
    },
    q2: {
      question:
        "For a six-sided die, let E be the event 'rolling an even number.' Which set represents E?",
      options: [
        "{1,3,5}",
        "{2,4,6}",
        "{1,2,3}",
        "{4,5,6}",
      ],
      correctAnswer: "{2,4,6}",
      correctFeedback:
        "Correct. The even outcomes are 2, 4, and 6.",
      incorrectFeedback:
        "List the even numbers contained in the die's sample space.",
    },
    reflectionPrompt:
      "Why is defining the sample space important before calculating probabilities?",
  },

  {
    title: "Complements & Probability Rules",
    theme: "Probability Rules",
    q1: {
      question:
        "If P(A) = 0.30, what is the probability of the complement of A?",
      options: ["0.30", "0.50", "0.70", "1.30"],
      correctAnswer: "0.70",
      correctFeedback:
        "Correct. P(Aᶜ) = 1 − P(A) = 0.70.",
      incorrectFeedback:
        "Use the complement rule: P(Aᶜ) = 1 − P(A).",
    },
    q2: {
      question:
        "Which statement must be true for every valid probability?",
      options: [
        "It must be greater than 1",
        "It must be between 0 and 1",
        "It must equal 0.5",
        "It must be negative",
      ],
      correctAnswer: "It must be between 0 and 1",
      correctFeedback:
        "Correct. Valid probabilities range from 0 through 1.",
      incorrectFeedback:
        "Recall the allowable numerical range for probabilities.",
    },
    reflectionPrompt:
      "Give one real-world situation where a complement probability would be useful.",
  },

  {
    title: "Conditional Probability",
    theme: "Updating Information",
    q1: {
      question:
        "What does P(A | B) represent?",
      options: [
        "The probability of A given that B occurred",
        "The probability that neither A nor B occurs",
        "The probability of A plus B",
        "The probability of B given that A never occurs",
      ],
      correctAnswer:
        "The probability of A given that B occurred",
      correctFeedback:
        "Correct. Conditional probability updates our probability of A using information that B occurred.",
      incorrectFeedback:
        "The vertical bar means 'given that.'",
    },
    q2: {
      question:
        "If knowing that B occurred changes the probability of A, then A and B are:",
      options: [
        "Independent",
        "Dependent",
        "Impossible",
        "Complements",
      ],
      correctAnswer: "Dependent",
      correctFeedback:
        "Correct. If information about B changes P(A), the events are dependent.",
      incorrectFeedback:
        "Independent events do not change one another's probabilities.",
    },
    reflectionPrompt:
      "Why can additional information change the probability of an event?",
  },

  {
    title: "Random Variation",
    theme: "Simulation",
    q1: {
      question:
        "A fair coin produces 8 heads in 10 tosses. What is the best immediate interpretation?",
      options: [
        "The coin is definitely biased",
        "The result could occur because of random variation",
        "The probability of heads must now be 0.8",
        "Probability theory has failed",
      ],
      correctAnswer:
        "The result could occur because of random variation",
      correctFeedback:
        "Correct. Small samples can produce unusual outcomes simply through random variation.",
      incorrectFeedback:
        "A small sample does not by itself prove that the underlying probability has changed.",
    },
    q2: {
      question:
        "For a fair coin, what generally happens to the proportion of heads as the number of tosses becomes very large?",
      options: [
        "It tends to move closer to 0.5",
        "It always becomes exactly 1",
        "It becomes increasingly unstable",
        "It must alternate between 0 and 1",
      ],
      correctAnswer:
        "It tends to move closer to 0.5",
      correctFeedback:
        "Correct. Long-run relative frequencies tend to stabilize near the true probability.",
      incorrectFeedback:
        "Think about what you observed when increasing the sample size in simulation.",
    },
    reflectionPrompt:
      "What does simulation help us understand about random variation?",
  },

  {
    title: "Decision Making Under Uncertainty",
    theme: "Data Science Decisions",
    q1: {
      question:
        "A fraud model flags a transaction, but fraud is rare and false positives occur. What is the most defensible action?",
      options: [
        "Automatically block every flagged transaction",
        "Send the flagged transaction for additional review",
        "Assume the model is always correct",
        "Ignore the model entirely",
      ],
      correctAnswer:
        "Send the flagged transaction for additional review",
      correctFeedback:
        "Correct. Predictions should inform decisions while accounting for uncertainty and false-positive costs.",
      incorrectFeedback:
        "Consider both the evidence from the model and the consequences of a false positive.",
    },
    q2: {
      question:
        "Why does the base rate of an event matter when interpreting a positive prediction?",
      options: [
        "Rare events can still generate many false positives",
        "Base rates are irrelevant",
        "A positive prediction is always correct",
        "Base rates only matter for coin tosses",
      ],
      correctAnswer:
        "Rare events can still generate many false positives",
      correctFeedback:
        "Correct. When an event is rare, even a useful classifier may generate many false positives.",
      incorrectFeedback:
        "Think about what happens when the event being predicted is uncommon.",
    },
    reflectionPrompt:
      "Why should a data scientist consider the cost of a wrong decision, not only model accuracy?",
  },

  {
    title: "AI Statistical Reasoning",
    theme: "AI Critique",
    q1: {
      question:
        "An AI says, 'The sample mean is 72, therefore the population mean must be exactly 72.' What is the main problem?",
      options: [
        "A sample statistic is an estimate, not necessarily the exact population parameter",
        "Sample means can never equal population means",
        "Means cannot be used in statistics",
        "Population means must always be larger",
      ],
      correctAnswer:
        "A sample statistic is an estimate, not necessarily the exact population parameter",
      correctFeedback:
        "Correct. Sample statistics estimate population parameters and are subject to sampling variability.",
      incorrectFeedback:
        "Distinguish between a statistic calculated from a sample and the unknown population parameter.",
    },
    q2: {
      question:
        "What should you do when an AI-generated statistical explanation sounds confident?",
      options: [
        "Accept it because confidence implies correctness",
        "Verify assumptions, calculations, and interpretation",
        "Ignore all AI explanations",
        "Only check the spelling",
      ],
      correctAnswer:
        "Verify assumptions, calculations, and interpretation",
      correctFeedback:
        "Correct. Statistical reasoning should be independently checked regardless of how confident the explanation sounds.",
      incorrectFeedback:
        "Confidence of wording is not evidence that the statistical reasoning is correct.",
    },
    reflectionPrompt:
      "What is one thing you should verify before trusting an AI-generated statistical conclusion?",
  },
];

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getYesterdayDateString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return getLocalDateString(yesterday);
}

/*
 * Converts YYYY-MM-DD into a stable number.
 * Every student therefore receives the same
 * quest on the same calendar date.
 */
function getQuestIndex(dateString: string) {
  const compactDate = Number(dateString.replaceAll("-", ""));

  return compactDate % questBank.length;
}

export default function DailyQuestPage() {
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [reflection, setReflection] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentStreak, setCurrentStreak] = useState(0);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [savedXP, setSavedXP] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const today = getLocalDateString();

  const todayQuest = useMemo(() => {
    return questBank[getQuestIndex(today)];
  }, [today]);

  const q1Correct =
    q1 === todayQuest.q1.correctAnswer;

  const q2Correct =
    q2 === todayQuest.q2.correctAnswer;

  const calculatedScore = [
    q1Correct,
    q2Correct,
  ].filter(Boolean).length;

  const calculatedXP =
    calculatedScore * 10 +
    (reflection.trim().length > 0 ? 5 : 0);

  const displayedScore =
    savedScore ?? calculatedScore;

  const displayedXP =
    savedXP ?? calculatedXP;

  const loadDailyQuest = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setErrorMessage(
          "Please sign in to access the Daily Quest."
        );
        return;
      }

      const todayDate = getLocalDateString();
      const yesterday = getYesterdayDateString();

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("streak")
          .eq("id", user.id)
          .single<ProfileData>();

      if (profileError) throw profileError;

      const {
        data: submission,
        error: submissionError,
      } = await supabase
        .from("daily_quest_submissions")
        .select(
          "score, xp_earned, q1_answer, q2_answer, reflection"
        )
        .eq("student_id", user.id)
        .eq("quest_date", todayDate)
        .maybeSingle<ExistingSubmission>();

      if (submissionError) {
        throw submissionError;
      }

      if (submission) {
        setQ1(submission.q1_answer ?? "");
        setQ2(submission.q2_answer ?? "");
        setReflection(submission.reflection ?? "");

        setSavedScore(submission.score);
        setSavedXP(submission.xp_earned);

        setCurrentStreak(
          profile?.streak ?? 0
        );

        setSubmitted(true);
        return;
      }

      const {
        data: previousSubmission,
        error: previousSubmissionError,
      } = await supabase
        .from("daily_quest_submissions")
        .select("quest_date")
        .eq("student_id", user.id)
        .lt("quest_date", todayDate)
        .order("quest_date", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle<SubmissionDate>();

      if (previousSubmissionError) {
        throw previousSubmissionError;
      }

      if (
        previousSubmission?.quest_date === yesterday
      ) {
        setCurrentStreak(
          profile?.streak ?? 0
        );
      } else {
        setCurrentStreak(0);
      }
    } catch (error) {
      console.log(
        "DAILY QUEST LOAD ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load today's quest."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDailyQuest();
  }, [loadDailyQuest]);

  async function handleSubmit() {
    if (submitted || saving || loading) {
      return;
    }

    if (!q1 || !q2) {
      setErrorMessage(
        "Please answer both questions before submitting."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setErrorMessage(
          "Please sign in before submitting the Daily Quest."
        );
        return;
      }

      const todayDate = getLocalDateString();
      const yesterday = getYesterdayDateString();

      // Prevent a second submission today.
      const {
        data: existingSubmission,
        error: existingError,
      } = await supabase
        .from("daily_quest_submissions")
        .select("id")
        .eq("student_id", user.id)
        .eq("quest_date", todayDate)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingSubmission) {
        setSubmitted(true);

        setErrorMessage(
          "You have already completed today's Daily Quest."
        );

        await loadDailyQuest();
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("streak")
        .eq("id", user.id)
        .single<ProfileData>();

      if (profileError) {
        throw profileError;
      }

      // Check whether yesterday was completed.
      const {
        data: yesterdaySubmission,
        error: yesterdayError,
      } = await supabase
        .from("daily_quest_submissions")
        .select("id")
        .eq("student_id", user.id)
        .eq("quest_date", yesterday)
        .maybeSingle();

      if (yesterdayError) {
        throw yesterdayError;
      }

      const previousStreak =
        profile?.streak ?? 0;

      const newStreak =
        yesterdaySubmission
          ? previousStreak + 1
          : 1;

      // Save today's quest.
      const { error: submissionError } =
        await supabase
          .from("daily_quest_submissions")
          .insert({
            student_id: user.id,
            quest_date: todayDate,
            score: calculatedScore,
            xp_earned: calculatedXP,
            q1_answer: q1,
            q2_answer: q2,
            reflection:
              reflection.trim() || null,
          });

      if (submissionError) {
        if (submissionError.code === "23505") {
          setSubmitted(true);

          setErrorMessage(
            "You have already completed today's Daily Quest."
          );

          await loadDailyQuest();
          return;
        }

        throw submissionError;
      }

      // Award XP only once.
      const {
        data: xpAwarded,
        error: xpError,
      } = await supabase.rpc(
        "award_xp_once",
        {
          p_student_id: user.id,
          p_source_type: "daily-quest",
          p_source_key:
            `daily-quest-${todayDate}`,
          p_xp_amount: calculatedXP,
          p_description:
            `Daily Quest ${todayDate}: ${todayQuest.title}`,
        }
      );

      if (xpError) throw xpError;

      // Update streak.
      const { error: updateError } =
        await supabase
          .from("profiles")
          .update({
            streak: newStreak,
          })
          .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      /*
       * If XP already existed unexpectedly,
       * correct the submission record so the UI
       * never claims duplicate XP was earned.
       */
      if (!xpAwarded) {
        const { error: correctionError } =
          await supabase
            .from("daily_quest_submissions")
            .update({
              xp_earned: 0,
            })
            .eq("student_id", user.id)
            .eq("quest_date", todayDate);

        if (correctionError) {
          console.log(
            "DAILY QUEST XP CORRECTION ERROR:",
            correctionError
          );
        }
      }

      setCurrentStreak(newStreak);
      setSavedScore(calculatedScore);

      setSavedXP(
        xpAwarded
          ? calculatedXP
          : 0
      );

      setSubmitted(true);
    } catch (error) {
      console.log(
        "DAILY QUEST SUBMISSION ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not save today's quest. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        {/* HEADER */}
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-4">
            <CalendarDays className="h-14 w-14 text-cyan-400" />

            <h1 className="text-5xl font-bold">
              Daily Quest
            </h1>
          </div>

          <p className="max-w-3xl text-lg text-slate-400">
            Complete a short daily probability challenge,
            strengthen retention, build your streak, and earn XP.
          </p>
        </div>

        {/* ERROR */}
        {errorMessage && (
          <div className="mb-8 flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />

            <p>{errorMessage}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <LoaderCircle className="h-7 w-7 animate-spin" />
              Loading today&apos;s quest...
            </div>
          </div>
        ) : (
          <>
            {/* TODAY'S QUEST */}
            <div className="mb-8 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 to-blue-950/30 p-8">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-400" />

                <p className="font-semibold uppercase tracking-wider text-purple-400">
                  Today&apos;s Challenge
                </p>
              </div>

              <h2 className="text-3xl font-bold">
                {todayQuest.title}
              </h2>

              <p className="mt-3 text-slate-400">
                {todayQuest.theme} • {today}
              </p>
            </div>

            {/* SUMMARY */}
            <div className="mb-8 grid gap-8 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <Trophy className="mb-4 h-10 w-10 text-yellow-400" />

                <p className="text-slate-400">
                  Today&apos;s Reward
                </p>

                <p className="text-4xl font-bold">
                  {displayedXP} XP
                </p>

                {!submitted && (
                  <p className="mt-2 text-xs text-slate-500">
                    Up to 25 XP
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <Flame className="mb-4 h-10 w-10 text-orange-400" />

                <p className="text-slate-400">
                  Current Streak
                </p>

                <p className="text-4xl font-bold">
                  {currentStreak}{" "}
                  {currentStreak === 1
                    ? "Day"
                    : "Days"}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <CalendarDays className="mb-4 h-10 w-10 text-cyan-400" />

                <p className="text-slate-400">
                  Quest Theme
                </p>

                <p className="text-2xl font-bold">
                  {todayQuest.theme}
                </p>
              </div>
            </div>

            {/* QUESTION 1 */}
            <QuestionCard
              number={1}
              question={todayQuest.q1}
              value={q1}
              onChange={setQ1}
              submitted={submitted}
              saving={saving}
            />

            {/* QUESTION 2 */}
            <QuestionCard
              number={2}
              question={todayQuest.q2}
              value={q2}
              onChange={setQ2}
              submitted={submitted}
              saving={saving}
            />

            {/* REFLECTION */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/40 to-blue-900/20 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Mini Reflection
              </h2>

              <p className="mb-6 text-lg text-slate-300">
                {todayQuest.reflectionPrompt}
              </p>

              <textarea
                value={reflection}
                onChange={(event) =>
                  setReflection(event.target.value)
                }
                disabled={submitted || saving}
                placeholder="Write one thoughtful sentence..."
                className="h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white focus:border-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />

              {!submitted && (
                <p className="mt-3 text-sm text-slate-500">
                  A reflection earns 5 bonus XP.
                </p>
              )}
            </div>

            {/* SUBMIT */}
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 md:flex-row md:items-center">
              <div>
                <h2 className="mb-2 text-3xl font-bold">
                  {submitted
                    ? "Quest Completed Today"
                    : "Submit Daily Quest"}
                </h2>

                <p className="text-slate-300">
                  {submitted
                    ? "Return tomorrow for a different probability challenge."
                    : "Submit once you have answered both questions."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  saving ||
                  submitted
                }
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-4 font-semibold transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving
                  ? "Saving..."
                  : submitted
                    ? "Completed Today"
                    : "Submit Quest"}
              </button>
            </div>

            {/* COMPLETION */}
            {submitted && (
              <div className="mt-8 rounded-3xl border border-green-500/30 bg-green-900/30 p-6">
                <h3 className="mb-2 text-2xl font-bold text-green-400">
                  Daily Quest Complete
                </h3>

                <p className="text-slate-300">
                  You scored {displayedScore}/2 and earned{" "}
                  {displayedXP} XP. Your current streak is{" "}
                  {currentStreak}{" "}
                  {currentStreak === 1
                    ? "day"
                    : "days"}
                  .
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

type QuestionCardProps = {
  number: number;
  question: QuestQuestion;
  value: string;
  onChange: (value: string) => void;
  submitted: boolean;
  saving: boolean;
};

function QuestionCard({
  number,
  question,
  value,
  onChange,
  submitted,
  saving,
}: QuestionCardProps) {
  const correct =
    value === question.correctAnswer;

  return (
    <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-purple-400">
        Question {number}
      </p>

      <h2 className="mb-6 text-2xl font-bold">
        {question.question}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            disabled={
              submitted ||
              saving
            }
            className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
              {question.correctFeedback}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              {question.incorrectFeedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}