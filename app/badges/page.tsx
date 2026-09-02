"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Brain,
  FlaskConical,
  BarChart3,
  ShieldCheck,
  Star,
  Flame,
  Lock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

type StudentProfile = {
  id: string;
  total_xp: number | null;
  streak: number | null;
  ai_critiques: number | null;
};

type RankedProfile = {
  id: string;
  total_xp: number | null;
};

type EarnedBadge = {
  badge_key: string;
  badge_name: string;
  earned_at: string;
};

type BadgeDefinition = {
  key: string;
  title: string;
  description: string;
  requirement: string;
  icon: typeof Trophy;
  color: string;
  border: string;
  background: string;
  qualifies: boolean;
  progress: number;
};

export default function BadgesPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [completedQuests, setCompletedQuests] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadBadgesData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setProfile(null);
        setRank(null);
        setCompletedQuests(0);
        setEarnedBadges([]);
        setErrorMessage("Please sign in to view your badges.");
        return;
      }

      const [
        profileResponse,
        rankingResponse,
        questResponse,
        earnedResponse,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, total_xp, streak, ai_critiques")
          .eq("id", user.id)
          .single<StudentProfile>(),

        supabase
          .from("profiles")
          .select("id, total_xp")
          .eq("role", "student")
          .order("total_xp", { ascending: false }),

        supabase
          .from("daily_quest_submissions")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("student_id", user.id),

        supabase
          .from("earned_badges")
          .select("badge_key, badge_name, earned_at")
          .eq("student_id", user.id)
          .order("earned_at", { ascending: false }),
      ]);

      if (profileResponse.error) throw profileResponse.error;
      if (rankingResponse.error) throw rankingResponse.error;
      if (questResponse.error) throw questResponse.error;
      if (earnedResponse.error) throw earnedResponse.error;

      const rankedStudents =
        (rankingResponse.data ?? []) as RankedProfile[];

      const studentRank =
        rankedStudents.findIndex(
          (student) => student.id === user.id
        ) + 1;

      setProfile(profileResponse.data);
      setRank(studentRank > 0 ? studentRank : null);
      setCompletedQuests(questResponse.count ?? 0);
      setEarnedBadges(
        (earnedResponse.data ?? []) as EarnedBadge[]
      );
    } catch (error) {
      console.error("BADGES PAGE ERROR:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load badge progress."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadgesData();
  }, [loadBadgesData]);

  const totalXP = profile?.total_xp ?? 0;
  const streak = profile?.streak ?? 0;
  const aiCritiques = profile?.ai_critiques ?? 0;

  const badgeDefinitions = useMemo<BadgeDefinition[]>(
    () => [
      {
        key: "first_steps",
        title: "First Steps",
        description:
          "Earned your first meaningful XP through learning activities.",
        requirement: "Earn 25 XP",
        icon: Star,
        color: "text-cyan-400",
        border: "border-cyan-500/30",
        background: "from-cyan-500/10 to-blue-500/5",
        qualifies: totalXP >= 25,
        progress: Math.min((totalXP / 25) * 100, 100),
      },
      {
        key: "rising_statistician",
        title: "Rising Statistician",
        description:
          "Demonstrated steady progress across StatQuest AI activities.",
        requirement: "Earn 500 XP",
        icon: BarChart3,
        color: "text-blue-400",
        border: "border-blue-500/30",
        background: "from-blue-500/10 to-indigo-500/5",
        qualifies: totalXP >= 500,
        progress: Math.min((totalXP / 500) * 100, 100),
      },
      {
        key: "consistency_builder",
        title: "Consistency Builder",
        description:
          "Built a strong learning habit by maintaining a daily streak.",
        requirement: "Reach a 7-day streak",
        icon: Flame,
        color: "text-orange-400",
        border: "border-orange-500/30",
        background: "from-orange-500/10 to-red-500/5",
        qualifies: streak >= 7,
        progress: Math.min((streak / 7) * 100, 100),
      },
      {
        key: "ai_critic",
        title: "AI Critic",
        description:
          "Successfully identified misleading AI-generated interpretations.",
        requirement: "Complete 10 AI critiques",
        icon: ShieldCheck,
        color: "text-purple-400",
        border: "border-purple-500/30",
        background: "from-purple-500/10 to-pink-500/5",
        qualifies: aiCritiques >= 10,
        progress: Math.min((aiCritiques / 10) * 100, 100),
      },
      {
        key: "daily_quest_explorer",
        title: "Daily Quest Explorer",
        description:
          "Completed multiple Daily Quests and strengthened core concepts.",
        requirement: "Complete 5 Daily Quests",
        icon: Brain,
        color: "text-pink-400",
        border: "border-pink-500/30",
        background: "from-pink-500/10 to-purple-500/5",
        qualifies: completedQuests >= 5,
        progress: Math.min((completedQuests / 5) * 100, 100),
      },
      {
        key: "statquest_champion",
        title: "StatQuest Champion",
        description:
          "Reached the top five positions on the live student leaderboard.",
        requirement: "Reach the top 5",
        icon: Trophy,
        color: "text-yellow-400",
        border: "border-yellow-500/30",
        background: "from-yellow-500/10 to-orange-500/5",
        qualifies: rank !== null && rank <= 5,
        progress:
          rank !== null
            ? rank <= 5
              ? 100
              : Math.max(
                  10,
                  Math.min((5 / rank) * 100, 95)
                )
            : 0,
      },
      {
        key: "simulation_master",
        title: "Simulation Master",
        description:
          "Built strong intuition through probability simulation activities.",
        requirement: "Earn 1,000 XP",
        icon: FlaskConical,
        color: "text-green-400",
        border: "border-green-500/30",
        background: "from-green-500/10 to-emerald-500/5",
        qualifies: totalXP >= 1000,
        progress: Math.min((totalXP / 1000) * 100, 100),
      },
    ],
    [aiCritiques, completedQuests, rank, streak, totalXP]
  );

  useEffect(() => {
    async function saveNewBadges() {
      if (loading || !profile) return;

      const alreadyEarnedKeys = new Set(
        earnedBadges.map((badge) => badge.badge_key)
      );

      const newlyEarned = badgeDefinitions.filter(
        (badge) =>
          badge.qualifies &&
          !alreadyEarnedKeys.has(badge.key)
      );

      if (newlyEarned.length === 0) return;

      const rows = newlyEarned.map((badge) => ({
        student_id: profile.id,
        badge_key: badge.key,
        badge_name: badge.title,
      }));

      const { error } = await supabase
        .from("earned_badges")
        .upsert(rows, {
          onConflict: "student_id,badge_key",
          ignoreDuplicates: true,
        });

      if (error) {
        console.error("BADGE SAVE ERROR:", error);
        return;
      }

      await loadBadgesData();
    }

    saveNewBadges();
  }, [
    badgeDefinitions,
    earnedBadges,
    loadBadgesData,
    loading,
    profile,
  ]);

  const earnedBadgeMap = useMemo(
    () =>
      new Map(
        earnedBadges.map((badge) => [
          badge.badge_key,
          badge,
        ])
      ),
    [earnedBadges]
  );

  const unlockedCount = badgeDefinitions.filter((badge) =>
    earnedBadgeMap.has(badge.key)
  ).length;

  const completionPercentage =
    badgeDefinitions.length > 0
      ? Math.round(
          (unlockedCount / badgeDefinitions.length) * 100
        )
      : 0;

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <div className="mb-4 flex items-center gap-4">
              <Trophy className="h-14 w-14 text-yellow-400" />

              <h1 className="text-5xl font-bold">
                Badges & Achievements
              </h1>
            </div>

            <p className="max-w-3xl text-lg text-slate-400">
              Unlock achievements, earn recognition, and level up
              your statistical mastery.
            </p>
          </div>

          <button
            type="button"
            onClick={loadBadgesData}
            disabled={loading}
            className="flex items-center justify-center gap-3 self-start rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
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

            <div>
              <p className="font-semibold">
                Could not load badge progress.
              </p>

              <p className="mt-1 text-sm">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <Trophy className="mb-4 h-10 w-10 text-yellow-400" />

            <p className="text-slate-400">
              Badges Unlocked
            </p>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : `${unlockedCount}/${badgeDefinitions.length}`}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <Star className="mb-4 h-10 w-10 text-cyan-400" />

            <p className="text-slate-400">
              Achievement Progress
            </p>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : `${completionPercentage}%`}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <Flame className="mb-4 h-10 w-10 text-orange-400" />

            <p className="text-slate-400">
              Current Streak
            </p>

            <p className="mt-2 text-4xl font-bold">
              {loading
                ? "..."
                : `${streak} ${
                    streak === 1 ? "Day" : "Days"
                  }`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <LoaderCircle className="h-7 w-7 animate-spin" />
              Loading achievements...
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {badgeDefinitions.map((badge) => {
                const Icon = badge.icon;
                const earnedBadge = earnedBadgeMap.get(
                  badge.key
                );
                const unlocked = Boolean(earnedBadge);

                return (
                  <div
                    key={badge.key}
                    className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-8 transition ${
                      badge.border
                    } ${badge.background} ${
                      unlocked
                        ? "hover:scale-[1.02]"
                        : "opacity-75 grayscale-[35%]"
                    }`}
                  >
                    {!unlocked && (
                      <div className="absolute right-6 top-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-950">
                          <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-800 bg-slate-950">
                        <Icon
                          className={`h-10 w-10 ${badge.color}`}
                        />
                      </div>
                    </div>

                    <h2 className="mb-4 text-2xl font-bold">
                      {badge.title}
                    </h2>

                    <p className="mb-4 leading-relaxed text-slate-300">
                      {badge.description}
                    </p>

                    <p className="mb-5 text-sm font-medium text-slate-400">
                      Requirement: {badge.requirement}
                    </p>

                    <div className="mb-5">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-400">
                          Progress
                        </span>

                        <span className="font-semibold text-slate-300">
                          {Math.round(
                            unlocked ? 100 : badge.progress
                          )}
                          %
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                          style={{
                            width: `${
                              unlocked ? 100 : badge.progress
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {earnedBadge && (
                      <p className="mb-5 text-sm text-slate-400">
                        Earned{" "}
                        {new Date(
                          earnedBadge.earned_at
                        ).toLocaleDateString()}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        Achievement Badge
                      </span>

                      {unlocked ? (
                        <div className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          Unlocked
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-400">
                          <Lock className="h-4 w-4" />
                          Locked
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-900/30 to-blue-900/20 p-8">
              <h2 className="mb-4 text-3xl font-bold">
                Keep Learning • Keep Leveling Up
              </h2>

              <p className="text-lg leading-relaxed text-slate-300">
                Complete Daily Quests, critique AI explanations,
                build your streak, earn XP, and climb the
                leaderboard to unlock more achievements.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}