"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Brain,
  Flame,
  BarChart3,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

type StudentProfile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  total_xp: number | null;
  streak: number | null;
  ai_critiques: number | null;
};

type ModuleProgress = {
  module_key: string;
  percent_complete: number | null;
  completed: boolean | null;
};

type LeaderboardRankResult = {
  student_rank: number;
  total_students: number;
};

export default function DashboardPage() {
  const [profile, setProfile] =
    useState<StudentProfile | null>(null);

  const [rank, setRank] =
    useState<number | null>(null);

  const [studentCount, setStudentCount] =
    useState(0);

  const [probabilityProgress, setProbabilityProgress] =
    useState(0);

  const [probabilityCompleted, setProbabilityCompleted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadDashboard() {
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
        setProfile(null);
        setRank(null);
        setStudentCount(0);
        setProbabilityProgress(0);
        setProbabilityCompleted(false);

        setErrorMessage(
          "Please sign in to view your dashboard."
        );

        return;
      }

      // --------------------------------
      // LOAD STUDENT PROFILE
      // --------------------------------

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, display_name, total_xp, streak, ai_critiques"
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      // --------------------------------
      // LOAD PRIVATE LEADERBOARD RANK
      // --------------------------------
      //
      // The student does NOT retrieve
      // other students' profile rows.
      //
      // Supabase calculates:
      //   1. this student's rank
      //   2. total number of students
      //
      // using auth.uid() inside the RPC.
      // --------------------------------

      const {
        data: rankData,
        error: rankError,
      } = await supabase.rpc(
        "get_my_leaderboard_rank"
      );

      if (rankError) {
        throw rankError;
      }

      let rankResult:
        | LeaderboardRankResult
        | null = null;

      if (
        Array.isArray(rankData) &&
        rankData.length > 0
      ) {
        rankResult =
          rankData[0] as LeaderboardRankResult;
      } else if (
        rankData &&
        typeof rankData === "object" &&
        !Array.isArray(rankData)
      ) {
        rankResult =
          rankData as LeaderboardRankResult;
      }

      // --------------------------------
      // LOAD PROBABILITY MODULE PROGRESS
      // --------------------------------

      const {
        data: moduleData,
        error: moduleError,
      } = await supabase
        .from("learning_progress")
        .select(
          "module_key, percent_complete, completed"
        )
        .eq("student_id", user.id)
        .eq("module_key", "probability")
        .maybeSingle<ModuleProgress>();

      if (moduleError) {
        throw moduleError;
      }

      const modulePercent =
        moduleData?.percent_complete ?? 0;

      const moduleCompleted =
        moduleData?.completed === true ||
        modulePercent >= 100;

      // --------------------------------
      // UPDATE STATE
      // --------------------------------

      setProfile(profileData);

      setRank(
        rankResult
          ? Number(rankResult.student_rank)
          : null
      );

      setStudentCount(
        rankResult
          ? Number(rankResult.total_students)
          : 0
      );

      setProbabilityProgress(
        modulePercent
      );

      setProbabilityCompleted(
        moduleCompleted
      );
    } catch (error) {
      console.error(
        "DASHBOARD ERROR:",
        error
      );

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Could not load your dashboard."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const studentName =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    "Learner";

  const totalXP =
    profile?.total_xp ?? 0;

  const streak =
    profile?.streak ?? 0;

  const aiCritiques =
    profile?.ai_critiques ?? 0;

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">

        {/* HEADER */}

        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-start">

          <div>
            <h1 className="mb-4 text-5xl font-bold">
              Dashboard
            </h1>

            <p className="text-lg text-slate-400">
              {loading
                ? "Loading your learning progress..."
                : `Welcome back, ${studentName}. Track your progress and continue learning.`}
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
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
                Could not load dashboard data.
              </p>

              <p className="mt-1 text-sm">
                {errorMessage}
              </p>
            </div>

          </div>
        )}

        {/* STATS */}

        <div className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          {/* XP */}

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

            <Trophy className="mb-4 h-10 w-10 text-yellow-400" />

            <h2 className="text-lg text-slate-300">
              Total XP
            </h2>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : totalXP.toLocaleString()}
            </p>

          </div>

          {/* AI CRITIQUES */}

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

            <Brain className="mb-4 h-10 w-10 text-pink-400" />

            <h2 className="text-lg text-slate-300">
              AI Critiques
            </h2>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : aiCritiques}
            </p>

          </div>

          {/* STREAK */}

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

            <Flame className="mb-4 h-10 w-10 text-orange-400" />

            <h2 className="text-lg text-slate-300">
              Current Streak
            </h2>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : `${streak} ${
                    streak === 1
                      ? "Day"
                      : "Days"
                  }`}
            </p>

          </div>

          {/* PRIVATE RANK */}

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

            <BarChart3 className="mb-4 h-10 w-10 text-blue-400" />

            <h2 className="text-lg text-slate-300">
              Leaderboard Rank
            </h2>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : rank !== null
                ? `#${rank}`
                : "Unranked"}
            </p>

            {!loading &&
              studentCount > 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  Among{" "}
                  {studentCount.toLocaleString()}{" "}
                  {studentCount === 1
                    ? "student"
                    : "students"}
                </p>
              )}

          </div>

        </div>

        {/* DYNAMIC NEXT ACTIVITY */}

        {probabilityCompleted ? (

          /* MODULE COMPLETED */

          <div className="mb-8 rounded-3xl border border-green-500/30 bg-gradient-to-r from-green-950/40 via-emerald-950/20 to-blue-950/20 p-8">

            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

              <div>

                <div className="mb-4 flex items-center gap-3">

                  <CheckCircle className="h-8 w-8 text-green-400" />

                  <p className="font-semibold uppercase tracking-wider text-green-400">
                    Module Mastered
                  </p>

                </div>

                <h2 className="mb-4 text-3xl font-bold">
                  Probability Complete!
                </h2>

                <p className="max-w-2xl text-lg text-slate-300">
                  You completed all six Probability
                  lessons and demonstrated mastery of
                  the module.
                </p>

                <div className="mt-5">

                  <div className="mb-2 flex max-w-md justify-between text-sm">

                    <span className="text-slate-400">
                      Probability Progress
                    </span>

                    <span className="font-bold text-green-400">
                      100%
                    </span>

                  </div>

                  <div className="h-3 max-w-md overflow-hidden rounded-full bg-slate-800">

                    <div className="h-full w-full rounded-full bg-gradient-to-r from-green-500 to-cyan-400" />

                  </div>

                </div>

              </div>

              <Link
                href="/learning-paths/probability"
                className="flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 font-semibold transition-transform hover:scale-105"
              >
                Review Probability

                <ArrowRight className="h-5 w-5" />

              </Link>

            </div>

          </div>

        ) : (

          /* MODULE IN PROGRESS */

          <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/40 to-blue-900/20 p-8">

            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

              <div>

                <p className="mb-3 font-semibold uppercase tracking-wider text-purple-400">
                  Recommended Next Activity
                </p>

                <h2 className="mb-4 text-3xl font-bold">
                  Continue Probability
                </h2>

                <p className="max-w-2xl text-lg text-slate-300">
                  Continue your Probability learning
                  path and complete the remaining
                  lessons.
                </p>

                <div className="mt-5">

                  <div className="mb-2 flex max-w-md justify-between text-sm">

                    <span className="text-slate-400">
                      Module Progress
                    </span>

                    <span className="font-bold text-cyan-400">
                      {probabilityProgress}%
                    </span>

                  </div>

                  <div className="h-3 max-w-md overflow-hidden rounded-full bg-slate-800">

                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                      style={{
                        width: `${probabilityProgress}%`,
                      }}
                    />

                  </div>

                </div>

              </div>

              <Link
                href="/learning-paths/probability"
                className="flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold transition-transform hover:scale-105"
              >
                Continue Learning

                <ArrowRight className="h-5 w-5" />

              </Link>

            </div>

          </div>

        )}

        {/* QUICK ACTIONS */}

        <div className="grid gap-6 md:grid-cols-3">

          <Link
            href="/daily-quest"
            className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/50"
          >

            <Flame className="mb-4 h-9 w-9 text-orange-400" />

            <h3 className="mb-2 text-xl font-bold">
              Daily Quest
            </h3>

            <p className="text-slate-400">
              Complete today&apos;s questions and
              continue your streak.
            </p>

          </Link>

          <Link
            href="/simulations"
            className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-green-500/50"
          >

            <BarChart3 className="mb-4 h-9 w-9 text-green-400" />

            <h3 className="mb-2 text-xl font-bold">
              Simulation Arena
            </h3>

            <p className="text-slate-400">
              Experiment with coin flips, dice rolls,
              and sample sizes.
            </p>

          </Link>

          <Link
            href="/leaderboard"
            className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-yellow-500/50"
          >

            <Trophy className="mb-4 h-9 w-9 text-yellow-400" />

            <h3 className="mb-2 text-xl font-bold">
              View Leaderboard
            </h3>

            <p className="text-slate-400">
              View your position in the class
              leaderboard.
            </p>

          </Link>

        </div>

      </section>
    </main>
  );
}