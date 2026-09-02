"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Flame,
  Brain,
  RefreshCw,
  AlertCircle,
  Medal,
  User,
} from "lucide-react";

type LeaderboardStudent = {
  student_id: string;
  student_name: string;
  total_xp: number;
  streak: number;
  ai_critiques: number;
  student_rank: number;
  is_current_user: boolean;
};

export default function LeaderboardPage() {
  const [students, setStudents] =
    useState<LeaderboardStudent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadLeaderboard() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setStudents([]);
        setErrorMessage(
          "Please sign in to view the leaderboard."
        );
        return;
      }

      const {
        data,
        error,
      } = await supabase.rpc(
        "get_class_leaderboard"
      );

      if (error) {
        throw error;
      }

      setStudents(
        (data ?? []) as LeaderboardStudent[]
      );
    } catch (error) {
      console.error(
        "LEADERBOARD ERROR:",
        error
      );

      setStudents([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load the leaderboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  const topLearner =
    students.length > 0
      ? students[0]
      : null;

  const currentStudent = useMemo(
    () =>
      students.find(
        (student) =>
          student.is_current_user
      ) ?? null,
    [students]
  );

  const totalStudents =
    students.length;

  function rankIcon(rank: number) {
    if (rank === 1) {
      return (
        <Trophy className="h-7 w-7 text-yellow-400" />
      );
    }

    if (rank === 2) {
      return (
        <Medal className="h-7 w-7 text-slate-300" />
      );
    }

    if (rank === 3) {
      return (
        <Medal className="h-7 w-7 text-orange-400" />
      );
    }

    return null;
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">

        {/* HEADER */}

        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-start">

          <div>

            <div className="mb-4 flex items-center gap-4">

              <Trophy className="h-14 w-14 text-yellow-400" />

              <div>

                <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-yellow-400">
                  Class Rankings
                </p>

                <h1 className="text-5xl font-bold">
                  Leaderboard
                </h1>

              </div>

            </div>

            <p className="max-w-3xl text-lg text-slate-400">
              See how your learning activity compares
              with the class. Rankings are based on
              total XP earned through StatQuest AI
              activities.
            </p>

          </div>

          <button
            type="button"
            onClick={loadLeaderboard}
            disabled={loading}
            className="flex items-center justify-center gap-3 self-start rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          >

            <RefreshCw
              className={`h-5 w-5 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh

          </button>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-8 flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">

            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />

            <div>

              <p className="font-semibold">
                Could not load the leaderboard.
              </p>

              <p className="mt-1 text-sm">
                {errorMessage}
              </p>

            </div>

          </div>
        )}

        {/* CURRENT STUDENT POSITION */}

        {!loading &&
          currentStudent && (
            <div className="mb-8 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-blue-950/30 to-purple-950/20 p-8">

              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

                <div>

                  <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-cyan-400">
                    Your Position
                  </p>

                  <div className="flex items-center gap-4">

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">

                      <User className="h-8 w-8 text-cyan-400" />

                    </div>

                    <div>

                      <h2 className="text-4xl font-bold">
                        #{currentStudent.student_rank}
                      </h2>

                      <p className="mt-1 text-slate-400">
                        Among{" "}
                        {totalStudents}{" "}
                        {totalStudents === 1
                          ? "student"
                          : "students"}
                      </p>

                    </div>

                  </div>

                </div>

                <div className="grid grid-cols-3 gap-6 text-center">

                  <div>

                    <p className="text-2xl font-bold text-cyan-400">
                      {currentStudent.total_xp.toLocaleString()}
                    </p>

                    <p className="text-sm text-slate-500">
                      XP
                    </p>

                  </div>

                  <div>

                    <p className="text-2xl font-bold text-orange-400">
                      {currentStudent.streak}
                    </p>

                    <p className="text-sm text-slate-500">
                      Day Streak
                    </p>

                  </div>

                  <div>

                    <p className="text-2xl font-bold text-pink-400">
                      {currentStudent.ai_critiques}
                    </p>

                    <p className="text-sm text-slate-500">
                      AI Critiques
                    </p>

                  </div>

                </div>

              </div>

            </div>
          )}

        {/* TOP LEARNER */}

        <div className="mb-10 rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/20 via-orange-500/10 to-transparent p-8">

          {loading ? (

            <p className="text-slate-300">
              Loading leaderboard...
            </p>

          ) : topLearner ? (

            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

              <div>

                <p className="mb-2 font-semibold uppercase tracking-wider text-yellow-400">
                  Top Learner
                </p>

                <div className="mb-3 flex items-center gap-3">

                  <h2 className="text-4xl font-bold">
                    {topLearner.student_name}
                  </h2>

                  {topLearner.is_current_user && (
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-400">
                      You
                    </span>
                  )}

                </div>

                <p className="text-slate-300">
                  {topLearner.total_xp.toLocaleString()}{" "}
                  XP
                  {" • "}
                  {topLearner.streak}{" "}
                  {topLearner.streak === 1
                    ? "Day"
                    : "Days"}{" "}
                  Streak
                </p>

              </div>

              <Trophy className="h-24 w-24 shrink-0 text-yellow-400" />

            </div>

          ) : (

            <p className="text-slate-300">
              No student rankings are available yet.
            </p>

          )}

        </div>

        {/* LEADERBOARD TABLE */}

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">

          <div className="hidden grid-cols-5 border-b border-slate-800 bg-slate-950 px-8 py-5 text-sm font-semibold uppercase tracking-wider text-slate-500 md:grid">

            <div>Rank</div>

            <div>Student</div>

            <div>XP</div>

            <div>Streak</div>

            <div>AI Critiques</div>

          </div>

          {!loading &&
            students.length === 0 && (
              <div className="px-8 py-12 text-center text-slate-400">
                No student rankings are available yet.
              </div>
            )}

          {students.map(
            (student) => (
              <div
                key={student.student_id}
                className={`grid gap-5 border-b px-8 py-6 transition last:border-b-0 md:grid-cols-5 md:items-center ${
                  student.is_current_user
                    ? "border-cyan-500/20 bg-cyan-500/5"
                    : "border-slate-800 hover:bg-slate-800/40"
                }`}
              >

                {/* RANK */}

                <div>

                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500 md:hidden">
                    Rank
                  </p>

                  <div className="flex items-center gap-3">

                    {rankIcon(
                      Number(
                        student.student_rank
                      )
                    )}

                    <span
                      className={`text-2xl font-bold ${
                        student.student_rank <= 3
                          ? "text-yellow-400"
                          : "text-slate-200"
                      }`}
                    >
                      #
                      {
                        student.student_rank
                      }
                    </span>

                  </div>

                </div>

                {/* STUDENT */}

                <div>

                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500 md:hidden">
                    Student
                  </p>

                  <div className="flex items-center gap-2">

                    <h3 className="text-lg font-semibold">
                      {
                        student.student_name
                      }
                    </h3>

                    {student.is_current_user && (
                      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-cyan-400">
                        You
                      </span>
                    )}

                  </div>

                </div>

                {/* XP */}

                <div>

                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500 md:hidden">
                    XP
                  </p>

                  <p className="text-xl font-bold text-cyan-400">
                    {student.total_xp.toLocaleString()}
                  </p>

                </div>

                {/* STREAK */}

                <div>

                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500 md:hidden">
                    Streak
                  </p>

                  <div className="flex items-center gap-2 text-orange-400">

                    <Flame className="h-5 w-5" />

                    <span>
                      {student.streak}{" "}
                      {student.streak === 1
                        ? "Day"
                        : "Days"}
                    </span>

                  </div>

                </div>

                {/* AI CRITIQUES */}

                <div>

                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500 md:hidden">
                    AI Critiques
                  </p>

                  <div className="flex items-center gap-2 text-pink-400">

                    <Brain className="h-5 w-5" />

                    <span className="font-semibold">
                      {
                        student.ai_critiques
                      }
                    </span>

                  </div>

                </div>

              </div>
            )
          )}

        </div>

        {/* EXPLANATION */}

        <div className="mt-10 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/30 to-blue-900/20 p-8">

          <div className="mb-4 flex items-center gap-4">

            <Brain className="h-12 w-12 text-pink-400" />

            <h2 className="text-3xl font-bold">
              How Rankings Work
            </h2>

          </div>

          <p className="max-w-4xl text-lg leading-relaxed text-slate-300">
            Rankings are based on total XP earned
            through StatQuest AI learning activities.
            Students with the same XP share the same
            rank. Streaks and AI critiques are shown
            as additional indicators of learning
            engagement.
          </p>

        </div>

      </section>
    </main>
  );
}