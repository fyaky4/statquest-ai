"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  Database,
  Users,
  FlaskConical,
  Sigma,
  BarChart3,
  Calculator,
  TrendingUp,
  Trophy,
  CheckCircle,
  Clock3,
  Lock,
  RefreshCw,
  AlertCircle,
  LoaderCircle,
  Route,
  ClipboardCheck,
} from "lucide-react";

type LearningProgress = {
  module_key: string;
  module_name: string;
  completed: boolean;
  percent_complete: number;
  completed_at: string | null;
};

type PretestAttempt = {
  module_key: string;
};

const modules = [
  {
    id: "data-basics",
    title: "Module 1: Data Basics",
    description:
      "Variables, data types, observational units, and introductory data science concepts.",
    icon: Database,
    color: "text-cyan-400",
    xp: 100,
    available: false,
    href: "",
  },
  {
    id: "sampling-design",
    title: "Module 2: Sampling & Study Design",
    description:
      "Sampling methods, bias, experiments, observational studies, and study design.",
    icon: Users,
    color: "text-green-400",
    xp: 120,
    available: false,
    href: "",
  },
  {
    id: "probability",
    title: "Module 3: Probability",
    description:
      "Sample spaces, events, conditional probability, independence, and Bayes' theorem.",
    icon: FlaskConical,
    color: "text-purple-400",
    xp: 150,
    available: true,
    href: "/learning-paths/probability",
  },
  {
    id: "random-variables",
    title: "Module 4: Random Variables",
    description:
      "Discrete and continuous random variables, expectation, variance, and distributions.",
    icon: Sigma,
    color: "text-pink-400",
    xp: 170,
    available: false,
    href: "",
  },
  {
    id: "sampling-distributions",
    title: "Module 5: Sampling Distributions",
    description:
      "Law of Large Numbers, Central Limit Theorem, and sampling variability.",
    icon: Calculator,
    color: "text-yellow-400",
    xp: 180,
    available: false,
    href: "",
  },
  {
    id: "inference",
    title: "Module 6: Confidence Intervals & Hypothesis Testing",
    description:
      "Confidence intervals, p-values, significance tests, and statistical decisions.",
    icon: BarChart3,
    color: "text-blue-400",
    xp: 220,
    available: false,
    href: "",
  },
  {
    id: "regression",
    title: "Module 7: Regression & Prediction",
    description:
      "Linear regression, interpretation, prediction, and model evaluation.",
    icon: TrendingUp,
    color: "text-orange-400",
    xp: 250,
    available: false,
    href: "",
  },
];

export default function LearningPathsPage() {
  const router = useRouter();

  const [progressRecords, setProgressRecords] = useState<LearningProgress[]>([]);
  const [pretestModules, setPretestModules] = useState<Set<string>>(
    new Set()
  );

  const [loading, setLoading] = useState(true);
  const [openingModule, setOpeningModule] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadLearningProgress = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setProgressRecords([]);
        setPretestModules(new Set());
        setErrorMessage("Please sign in to view your learning progress.");
        return;
      }

      // --------------------------------
      // LOAD MODULE PROGRESS
      // --------------------------------

      const { data, error } = await supabase
        .from("learning_progress")
        .select(
          "module_key, module_name, completed, percent_complete, completed_at"
        )
        .eq("student_id", user.id);

      if (error) throw error;

      const existingRecords = (data ?? []) as LearningProgress[];

      const existingKeys = new Set(
        existingRecords.map((record) => record.module_key)
      );

      const missingModules = modules.filter(
        (module) => !existingKeys.has(module.id)
      );

      let finalProgressRecords = existingRecords;

      if (missingModules.length > 0) {
        const rows = missingModules.map((module) => ({
          student_id: user.id,
          module_key: module.id,
          module_name: module.title,
          completed: false,
          percent_complete: 0,
          completed_at: null,
        }));

        const { error: insertError } = await supabase
          .from("learning_progress")
          .insert(rows);

        if (insertError) throw insertError;

        const { data: refreshedData, error: refreshedError } =
          await supabase
            .from("learning_progress")
            .select(
              "module_key, module_name, completed, percent_complete, completed_at"
            )
            .eq("student_id", user.id);

        if (refreshedError) throw refreshedError;

        finalProgressRecords =
          (refreshedData ?? []) as LearningProgress[];
      }

      setProgressRecords(finalProgressRecords);

      // --------------------------------
      // LOAD COMPLETED PRETESTS
      // --------------------------------

      const {
        data: pretestData,
        error: pretestError,
      } = await supabase
        .from("module_pretest_attempts")
        .select("module_key")
        .eq("student_id", user.id);

      if (pretestError) throw pretestError;

      const completedPretests = new Set(
        ((pretestData ?? []) as PretestAttempt[]).map(
          (attempt) => attempt.module_key
        )
      );

      setPretestModules(completedPretests);
    } catch (error: unknown) {
      let readableMessage =
        "Could not load your learning progress.";

      if (error instanceof Error) {
        readableMessage = error.message;
      } else if (
        error &&
        typeof error === "object"
      ) {
        const supabaseError = error as {
          message?: string;
          code?: string;
          details?: string;
          hint?: string;
        };

        readableMessage =
          supabaseError.message ||
          supabaseError.details ||
          readableMessage;

        console.log(
          "LEARNING PATHS SUPABASE ERROR:",
          {
            code: supabaseError.code,
            message: supabaseError.message,
            details: supabaseError.details,
            hint: supabaseError.hint,
          }
        );
      } else {
        console.log(
          "LEARNING PATHS UNKNOWN ERROR:",
          error
        );
      }

      setErrorMessage(readableMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLearningProgress();
  }, [loadLearningProgress]);

  const progressMap = useMemo(
    () =>
      new Map(
        progressRecords.map((record) => [
          record.module_key,
          record,
        ])
      ),
    [progressRecords]
  );

  const overallProgress = useMemo(() => {
    if (modules.length === 0) return 0;

    const total = modules.reduce(
      (sum, module) => {
        return (
          sum +
          (progressMap.get(module.id)
            ?.percent_complete ?? 0)
        );
      },
      0
    );

    return Math.round(
      total / modules.length
    );
  }, [progressMap]);

  const completedModules =
    progressRecords.filter(
      (record) => record.completed
    ).length;

  const activeModules =
    progressRecords.filter(
      (record) =>
        !record.completed &&
        (record.percent_complete ?? 0) > 0
    ).length;

  async function openModule(
    moduleId: string,
    moduleTitle: string,
    href: string
  ) {
    if (!href || openingModule) return;

    setOpeningModule(moduleId);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.push("/auth");
        return;
      }

      // --------------------------------
      // PROBABILITY PRETEST GATE
      // --------------------------------

      if (
        moduleId === "probability" &&
        !pretestModules.has("probability")
      ) {
        router.push(
          "/learning-paths/probability/pretest"
        );

        return;
      }

      // --------------------------------
      // PRETEST IS COMPLETE.
      // NOW THE MODULE MAY BEGIN.
      // --------------------------------

      const existingProgress =
        progressMap.get(moduleId);

      const currentPercent =
        existingProgress?.percent_complete ?? 0;

      /*
       * Do not mark the Probability module as
       * started until after its baseline pretest.
       *
       * At this point the gate above guarantees
       * that Probability has a recorded pretest.
       */
      if (currentPercent === 0) {
        const { error } = await supabase
          .from("learning_progress")
          .upsert(
            {
              student_id: user.id,
              module_key: moduleId,
              module_name: moduleTitle,
              completed: false,
              percent_complete: 10,
              completed_at: null,
            },
            {
              onConflict:
                "student_id,module_key",
            }
          );

        if (error) throw error;
      }

      router.push(href);
    } catch (error) {
      console.error(
        "OPEN MODULE ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not open this module."
      );

      setOpeningModule(null);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        {/* HEADER */}
        <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <div className="mb-4 flex items-center gap-4">
              <Route className="h-14 w-14 text-purple-400" />

              <h1 className="text-5xl font-bold">
                Learning Paths
              </h1>
            </div>

            <p className="max-w-3xl text-lg text-slate-400">
              Progress through the probability and statistics curriculum,
              complete baseline assessments and decision labs, unlock
              resources, earn XP, and build data-science reasoning skills.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLearningProgress}
            disabled={loading}
            className="flex items-center gap-3 self-start rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                loading ? "animate-spin" : ""
              }`}
            />

            Refresh
          </button>
        </div>

        {/* ERROR */}
        {errorMessage && (
          <div className="mb-8 flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />

            <p>{errorMessage}</p>
          </div>
        )}

        {/* COURSE SUMMARY */}
        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <BarChart3 className="mb-4 h-10 w-10 text-blue-400" />

            <p className="text-slate-400">
              Overall Progress
            </p>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : `${overallProgress}%`}
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                style={{
                  width: `${overallProgress}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <CheckCircle className="mb-4 h-10 w-10 text-green-400" />

            <p className="text-slate-400">
              Modules Completed
            </p>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : `${completedModules}/${modules.length}`}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <Clock3 className="mb-4 h-10 w-10 text-yellow-400" />

            <p className="text-slate-400">
              Modules in Progress
            </p>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : activeModules}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <LoaderCircle className="h-7 w-7 animate-spin" />

              Loading your learning path...
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;

              const progress =
                progressMap.get(module.id);

              const percent =
                progress?.percent_complete ?? 0;

              const completed =
                progress?.completed ?? false;

              const started =
                percent > 0;

              const isOpening =
                openingModule === module.id;

              const requiresPretest =
                module.id === "probability";

              const pretestCompleted =
                !requiresPretest ||
                pretestModules.has(module.id);

              return (
                <div
                  key={module.id}
                  className={`rounded-3xl border bg-slate-900 p-8 transition ${
                    module.available
                      ? "border-slate-800 hover:border-purple-500"
                      : "border-slate-800/70 opacity-75"
                  }`}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <Icon
                      className={`h-12 w-12 ${module.color}`}
                    />

                    <div className="flex items-center gap-2 text-yellow-400">
                      <Trophy className="h-5 w-5" />

                      <span className="font-semibold">
                        {module.xp} XP
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 flex items-start justify-between gap-4">
                    <h2 className="text-3xl font-bold">
                      {module.title}
                    </h2>

                    {completed ? (
                      <span className="flex shrink-0 items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Completed
                      </span>
                    ) : started ? (
                      <span className="flex shrink-0 items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-400">
                        <Clock3 className="h-4 w-4" />
                        In Progress
                      </span>
                    ) : !module.available ? (
                      <span className="flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-400">
                        <Lock className="h-4 w-4" />
                        Coming Soon
                      </span>
                    ) : requiresPretest &&
                      !pretestCompleted ? (
                      <span className="flex shrink-0 items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                        <ClipboardCheck className="h-4 w-4" />
                        Pretest Required
                      </span>
                    ) : (
                      <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300">
                        Available
                      </span>
                    )}
                  </div>

                  <p className="mb-6 leading-relaxed text-slate-300">
                    {module.description}
                  </p>

                  {/* PRETEST NOTICE */}
                  {requiresPretest &&
                    module.available && (
                      <div
                        className={`mb-7 rounded-2xl border p-5 ${
                          pretestCompleted
                            ? "border-green-500/20 bg-green-500/5"
                            : "border-cyan-500/20 bg-cyan-950/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {pretestCompleted ? (
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                          ) : (
                            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
                          )}

                          <div>
                            <p
                              className={`font-semibold ${
                                pretestCompleted
                                  ? "text-green-300"
                                  : "text-cyan-300"
                              }`}
                            >
                              {pretestCompleted
                                ? "Baseline Assessment Completed"
                                : "Required Baseline Assessment"}
                            </p>

                            <p className="mt-1 text-sm leading-relaxed text-slate-400">
                              {pretestCompleted
                                ? "Your Probability pretest has been recorded. You may continue through the module."
                                : "Complete the 12-question pretest before beginning Lesson 1. The assessment gives no XP and does not affect your course grade."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* PROGRESS */}
                  <div className="mb-7">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-400">
                        Module Progress
                      </span>

                      <span className="font-semibold text-slate-300">
                        {percent}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-950">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-400 transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* BUTTON */}
                  {module.available ? (
                    <button
                      type="button"
                      onClick={() =>
                        openModule(
                          module.id,
                          module.title,
                          module.href
                        )
                      }
                      disabled={isOpening}
                      className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isOpening ? (
                        <>
                          <LoaderCircle className="h-5 w-5 animate-spin" />
                          Opening...
                        </>
                      ) : requiresPretest &&
                        !pretestCompleted ? (
                        <>
                          <ClipboardCheck className="h-5 w-5" />
                          Take Pretest
                        </>
                      ) : completed ? (
                        "Review Module"
                      ) : started ? (
                        "Resume Module"
                      ) : (
                        "Start Module"
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-2xl bg-slate-800 px-6 py-3 text-slate-400"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}