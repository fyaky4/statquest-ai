"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  CheckCircle,
  Lock,
  PlayCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
  FlaskConical,
  Brain,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";

type Lesson = {
  id: string;
  module_key: string;
  lesson_key: string;
  title: string;
  description: string | null;
  lesson_type: string;
  position: number;
  xp_reward: number;
};

type LessonProgress = {
  lesson_id: string;
  status: string;
  percent_complete: number;
  started_at: string | null;
  completed_at: string | null;
};

export default function ProbabilityModulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressRecords, setProgressRecords] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadModule = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setErrorMessage("Please sign in to access this module.");
        return;
      }

      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select(
          "id, module_key, lesson_key, title, description, lesson_type, position, xp_reward"
        )
        .eq("module_key", "probability")
        .order("position", { ascending: true });

      if (lessonError) throw lessonError;

      const moduleLessons = (lessonData ?? []) as Lesson[];

      const { data: progressData, error: progressError } = await supabase
        .from("student_lesson_progress")
        .select(
          "lesson_id, status, percent_complete, started_at, completed_at"
        )
        .eq("student_id", user.id);

      if (progressError) throw progressError;

      const existingProgress = (progressData ?? []) as LessonProgress[];
      const existingLessonIds = new Set(
        existingProgress.map((item) => item.lesson_id)
      );

      const missing = moduleLessons.filter(
        (lesson) => !existingLessonIds.has(lesson.id)
      );

     if (missing.length > 0) {
  const rows = missing.map((lesson) => ({
    student_id: user.id,
    lesson_id: lesson.id,
    status:
      lesson.position === 1 ? "available" : "locked",
    percent_complete: 0,
    started_at: null,
    completed_at: null,
  }));

  const { error: insertError } = await supabase
    .from("student_lesson_progress")
    .upsert(rows, {
      onConflict: "student_id,lesson_id",
      ignoreDuplicates: true,
    });

  if (insertError) throw insertError;

        const { data: refreshedProgress, error: refreshedError } =
          await supabase
            .from("student_lesson_progress")
            .select(
              "lesson_id, status, percent_complete, started_at, completed_at"
            )
            .eq("student_id", user.id);

        if (refreshedError) throw refreshedError;

        setProgressRecords(
          (refreshedProgress ?? []) as LessonProgress[]
        );
      } else {
        setProgressRecords(existingProgress);
      }

      setLessons(moduleLessons);
    } catch (error) {
      console.error("PROBABILITY MODULE ERROR:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load the Probability module."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadModule();
    };

    void run();
  }, [loadModule]);

  const progressMap = useMemo(
    () =>
      new Map(
        progressRecords.map((item) => [
          item.lesson_id,
          item,
        ])
      ),
    [progressRecords]
  );

  const overallProgress = useMemo(() => {
    if (lessons.length === 0) return 0;

    const total = lessons.reduce((sum, lesson) => {
      return (
        sum +
        (progressMap.get(lesson.id)?.percent_complete ?? 0)
      );
    }, 0);

    return Math.round(total / lessons.length);
  }, [lessons, progressMap]);

  function getLessonIcon(type: string) {
    switch (type) {
      case "reading":
        return BookOpen;
      case "practice":
        return ClipboardCheck;
      case "simulation":
        return FlaskConical;
      case "ai-critique":
        return Brain;
      case "lab":
        return Sparkles;
      case "quiz":
        return CheckCircle;
      default:
        return BookOpen;
    }
  }

  function getLessonHref(lessonKey: string) {
    switch (lessonKey) {
      case "concept-overview":
        return "/lessons/probability/concept-overview";

      case "sample-spaces":
        return "/lessons/probability/sample-spaces";

      case "simulation":
        return "/lessons/probability/simulation";

      case "ai-critique":
        return "/lessons/probability/ai-critique";

      case "decision-lab":
        return "/lessons/probability/decision-lab";

      case "module-quiz":
        return "/lessons/probability/module-quiz";

      default:
        return "#";
    }
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <h1 className="mb-4 text-5xl font-bold">
              Module 3: Probability
            </h1>

            <p className="max-w-3xl text-lg text-slate-400">
              Build a strong foundation in probability through
              guided lessons, simulation, AI critique, decision
              making, and mastery assessment.
            </p>
          </div>

          <button
            type="button"
            onClick={loadModule}
            disabled={loading}
            className="flex items-center gap-3 self-start rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold transition hover:scale-105 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                loading ? "animate-spin" : ""
              }`}
            />

            Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="mb-8 flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wider text-purple-400">
                Module Progress
              </p>

              <h2 className="mt-1 text-3xl font-bold">
                {overallProgress}%
              </h2>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-400">
                Total Lessons
              </p>

              <p className="text-2xl font-bold">
                {lessons.length}
              </p>
            </div>
          </div>

          <div className="h-4 overflow-hidden rounded-full bg-slate-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-400 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-7 w-7 animate-spin" />
              Loading lessons...
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {lessons.map((lesson) => {
              const progress = progressMap.get(lesson.id);

              const status = progress?.status ?? "locked";
              const percent =
                progress?.percent_complete ?? 0;

              const locked = status === "locked";
              const completed =
                status === "completed" ||
                percent === 100;

              const Icon = getLessonIcon(
                lesson.lesson_type
              );

              return (
                <div
                  key={lesson.id}
                  className={`rounded-3xl border p-7 transition ${
                    locked
                      ? "border-slate-800 bg-slate-900/60 opacity-70"
                      : completed
                        ? "border-green-500/30 bg-green-950/10"
                        : "border-slate-800 bg-slate-900 hover:border-purple-500"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-5">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                          completed
                            ? "border-green-500/30 bg-green-500/10"
                            : locked
                              ? "border-slate-700 bg-slate-950"
                              : "border-purple-500/30 bg-purple-500/10"
                        }`}
                      >
                        {locked ? (
                          <Lock className="h-6 w-6 text-slate-400" />
                        ) : completed ? (
                          <CheckCircle className="h-7 w-7 text-green-400" />
                        ) : (
                          <Icon className="h-7 w-7 text-purple-400" />
                        )}
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold">
                            {lesson.position}. {lesson.title}
                          </h2>

                          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-400">
                            {lesson.xp_reward} XP
                          </span>
                        </div>

                        <p className="max-w-3xl text-slate-300">
                          {lesson.description}
                        </p>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center gap-3 text-sm">
                            <span className="text-slate-400">
                              Progress
                            </span>

                            <span className="font-semibold text-cyan-400">
                              {percent}%
                            </span>
                          </div>

                          <div className="h-2 w-full max-w-xl overflow-hidden rounded-full bg-slate-950">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-400"
                              style={{
                                width: `${percent}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {locked ? (
                        <button
                          type="button"
                          disabled
                          className="flex cursor-not-allowed items-center gap-2 rounded-2xl bg-slate-800 px-6 py-3 text-slate-400"
                        >
                          <Lock className="h-5 w-5" />
                          Locked
                        </button>
                      ) : (
                        <Link
                          href={getLessonHref(
                            lesson.lesson_key
                          )}
                          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold transition hover:scale-105"
                        >
                          <PlayCircle className="h-5 w-5" />

                          {completed
                            ? "Review"
                            : percent > 0
                              ? "Resume"
                              : "Start"}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}