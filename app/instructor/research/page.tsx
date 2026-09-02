"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

type StudentProfile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  total_xp: number | null;
  streak: number | null;
  ai_critiques: number | null;
};

type PretestAttempt = {
  id?: string;
  student_id: string;
  module_key?: string | null;

  percent_score?: number | null;
  percentage?: number | null;
  score?: number | null;
  correct_answers?: number | null;
  total_questions?: number | null;

  created_at?: string | null;
  submitted_at?: string | null;

  [key: string]: unknown;
};

type QuizAttempt = {
  student_id: string;
  percent_score: number;
  passed: boolean;
  created_at: string;
};

type ExternalAssessment = {
  id: string;
  student_id: string;
  assessment_name: string;
  score: number;
  total_points: number;
  percent_score: number | null;
  assessment_date: string | null;
  created_at: string;
};

type LearningProgress = {
  student_id: string;
  percent_complete: number | null;
  completed: boolean | null;
};

type DailyQuest = {
  student_id: string;
  quest_date: string;
};

type PilotFeedback = {
  student_id: string;
  ease_of_use: number | null;
  learning_helpfulness: number | null;
  ai_critique_helpfulness: number | null;
  simulation_helpfulness: number | null;
  motivation_rating: number | null;
  improvement_feedback: string | null;
  submitted_at: string;
};

type ResearchRow = {
  studentId: string;
  studentName: string;

  pretestScore: number | null;

  masteryScore: number | null;
  masteryPassed: boolean | null;

  statQuestGain: number | null;

  externalAssessmentName: string | null;
  externalScore: number | null;

  externalGain: number | null;
  externalVsMastery: number | null;

  probabilityProgress: number;
  moduleCompleted: boolean;

  totalXP: number;
  aiCritiques: number;
  streak: number;
  dailyQuestCount: number;

  easeOfUse: number | null;
  learningHelpfulness: number | null;
  aiCritiqueHelpfulness: number | null;
  simulationHelpfulness: number | null;
  motivationRating: number | null;

  feedbackComment: string | null;
};

// =========================================================
// PAGE
// =========================================================

export default function ResearchExportPage() {
  const router = useRouter();

  const [authorized, setAuthorized] =
    useState(false);

  const [checkingAccess, setCheckingAccess] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [students, setStudents] =
    useState<StudentProfile[]>([]);

  const [pretests, setPretests] =
    useState<PretestAttempt[]>([]);

  const [quizAttempts, setQuizAttempts] =
    useState<QuizAttempt[]>([]);

  const [
    externalAssessments,
    setExternalAssessments,
  ] = useState<ExternalAssessment[]>([]);

  const [progress, setProgress] =
    useState<LearningProgress[]>([]);

  const [dailyQuests, setDailyQuests] =
    useState<DailyQuest[]>([]);

  const [feedback, setFeedback] =
    useState<PilotFeedback[]>([]);

  // =========================================================
  // ACCESS
  // =========================================================

  const checkInstructorAccess =
    useCallback(async () => {
      setCheckingAccess(true);

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
          return false;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (
          profile?.role !== "instructor"
        ) {
          router.replace("/dashboard");
          return false;
        }

        setAuthorized(true);

        return true;
      } catch (error) {
        console.error(
          "RESEARCH ACCESS ERROR:",
          error
        );

        router.replace("/dashboard");

        return false;
      } finally {
        setCheckingAccess(false);
      }
    }, [router]);

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadResearchData =
    useCallback(async () => {
      setLoading(true);
      setMessage("");

      try {
        const [
          profilesResponse,
          pretestResponse,
          quizResponse,
          externalResponse,
          progressResponse,
          dailyQuestResponse,
          feedbackResponse,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, display_name, total_xp, streak, ai_critiques"
            )
            .eq("role", "student")
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from(
              "module_pretest_attempts"
            )
            .select("*")
            .eq(
              "module_key",
              "probability"
            ),

          supabase
            .from("quiz_attempts")
            .select(
              "student_id, percent_score, passed, created_at"
            )
            .eq(
              "module_key",
              "probability"
            )
            .eq(
              "lesson_key",
              "module-quiz"
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from(
              "external_assessment_scores"
            )
            .select(
              "id, student_id, assessment_name, score, total_points, percent_score, assessment_date, created_at"
            )
            .eq(
              "module_key",
              "probability"
            )
            .order("assessment_date", {
              ascending: false,
              nullsFirst: false,
            })
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("learning_progress")
            .select(
              "student_id, percent_complete, completed"
            )
            .eq(
              "module_key",
              "probability"
            ),

          supabase
            .from(
              "daily_quest_submissions"
            )
            .select(
              "student_id, quest_date"
            ),

          supabase
            .from("pilot_feedback")
            .select(
              "student_id, ease_of_use, learning_helpfulness, ai_critique_helpfulness, simulation_helpfulness, motivation_rating, improvement_feedback, submitted_at"
            )
            .order("submitted_at", {
              ascending: false,
            }),
        ]);

        if (profilesResponse.error) {
          throw profilesResponse.error;
        }

        if (pretestResponse.error) {
          throw pretestResponse.error;
        }

        if (quizResponse.error) {
          throw quizResponse.error;
        }

        if (externalResponse.error) {
          throw externalResponse.error;
        }

        if (progressResponse.error) {
          throw progressResponse.error;
        }

        if (dailyQuestResponse.error) {
          throw dailyQuestResponse.error;
        }

        if (feedbackResponse.error) {
          throw feedbackResponse.error;
        }

        setStudents(
          (profilesResponse.data ??
            []) as StudentProfile[]
        );

        setPretests(
          (pretestResponse.data ??
            []) as PretestAttempt[]
        );

        setQuizAttempts(
          (quizResponse.data ??
            []) as QuizAttempt[]
        );

        setExternalAssessments(
          (
            externalResponse.data ??
            []
          ).map((item) => ({
            id: item.id,

            student_id:
              item.student_id,

            assessment_name:
              item.assessment_name,

            score:
              Number(item.score),

            total_points:
              Number(
                item.total_points
              ),

            percent_score:
              item.percent_score ===
              null
                ? null
                : Number(
                    item.percent_score
                  ),

            assessment_date:
              item.assessment_date,

            created_at:
              item.created_at,
          }))
        );

        setProgress(
          (progressResponse.data ??
            []) as LearningProgress[]
        );

        setDailyQuests(
          (dailyQuestResponse.data ??
            []) as DailyQuest[]
        );

        setFeedback(
          (feedbackResponse.data ??
            []) as PilotFeedback[]
        );
      } catch (error) {
        console.error(
          "RESEARCH DATA ERROR:",
          error
        );

        setMessage(
          getErrorMessage(
            error,
            "Could not load research data."
          )
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    async function initialize() {
      const allowed =
        await checkInstructorAccess();

      if (allowed) {
        await loadResearchData();
      }
    }

    void initialize();
  }, [
    checkInstructorAccess,
    loadResearchData,
  ]);

  // =========================================================
  // ANALYSIS DATASET
  // =========================================================

  const researchRows =
    useMemo<ResearchRow[]>(() => {
      return students.map((student) => {
        const pretest =
          pretests.find(
            (item) =>
              item.student_id ===
              student.id
          );

        const mastery =
          quizAttempts.find(
            (item) =>
              item.student_id ===
              student.id
          );

        const external =
          externalAssessments.find(
            (item) =>
              item.student_id ===
              student.id
          );

        const studentProgress =
          progress.find(
            (item) =>
              item.student_id ===
              student.id
          );

        const studentFeedback =
          feedback.find(
            (item) =>
              item.student_id ===
              student.id
          );

        const dailyQuestCount =
          dailyQuests.filter(
            (item) =>
              item.student_id ===
              student.id
          ).length;

        const pretestScore =
          pretest
            ? getPretestPercent(
                pretest
              )
            : null;

        const masteryScore =
          mastery?.percent_score ??
          null;

        const externalScore =
          external
            ? getExternalPercent(
                external
              )
            : null;

        const statQuestGain =
          pretestScore !== null &&
          masteryScore !== null
            ? roundOne(
                masteryScore -
                  pretestScore
              )
            : null;

        const externalGain =
          pretestScore !== null &&
          externalScore !== null
            ? roundOne(
                externalScore -
                  pretestScore
              )
            : null;

        const externalVsMastery =
          masteryScore !== null &&
          externalScore !== null
            ? roundOne(
                externalScore -
                  masteryScore
              )
            : null;

        const probabilityProgress =
          studentProgress
            ?.percent_complete ?? 0;

        const moduleCompleted =
          studentProgress?.completed ===
            true ||
          probabilityProgress >= 100;

        return {
          studentId:
            student.id,

          studentName:
            student.display_name?.trim() ||
            student.full_name?.trim() ||
            "Unnamed Student",

          pretestScore,

          masteryScore,

          masteryPassed:
            mastery
              ? mastery.passed
              : null,

          statQuestGain,

          externalAssessmentName:
            external?.assessment_name ??
            null,

          externalScore,

          externalGain,

          externalVsMastery,

          probabilityProgress,

          moduleCompleted,

          totalXP:
            student.total_xp ?? 0,

          aiCritiques:
            student.ai_critiques ?? 0,

          streak:
            student.streak ?? 0,

          dailyQuestCount,

          easeOfUse:
            studentFeedback
              ?.ease_of_use ??
            null,

          learningHelpfulness:
            studentFeedback
              ?.learning_helpfulness ??
            null,

          aiCritiqueHelpfulness:
            studentFeedback
              ?.ai_critique_helpfulness ??
            null,

          simulationHelpfulness:
            studentFeedback
              ?.simulation_helpfulness ??
            null,

          motivationRating:
            studentFeedback
              ?.motivation_rating ??
            null,

          feedbackComment:
            studentFeedback
              ?.improvement_feedback ??
            null,
        };
      });
    }, [
      students,
      pretests,
      quizAttempts,
      externalAssessments,
      progress,
      dailyQuests,
      feedback,
    ]);

  // =========================================================
  // ANALYTIC GROUPS
  // =========================================================

  const pairedPretestMastery =
    researchRows.filter(
      (row) =>
        row.pretestScore !== null &&
        row.masteryScore !== null
    );

  const pairedPretestExternal =
    researchRows.filter(
      (row) =>
        row.pretestScore !== null &&
        row.externalScore !== null
    );

  const pairedMasteryExternal =
    researchRows.filter(
      (row) =>
        row.masteryScore !== null &&
        row.externalScore !== null
    );

  const completeCases =
    researchRows.filter(
      (row) =>
        row.pretestScore !== null &&
        row.masteryScore !== null &&
        row.externalScore !== null
    );

  // =========================================================
  // DESCRIPTIVE METRICS
  // =========================================================

  const averagePretest =
    meanNullable(
      researchRows.map(
        (row) =>
          row.pretestScore
      )
    );

  const averageMastery =
    meanNullable(
      researchRows.map(
        (row) =>
          row.masteryScore
      )
    );

  const averageExternal =
    meanNullable(
      researchRows.map(
        (row) =>
          row.externalScore
      )
    );

  const averageStatQuestGain =
    meanNullable(
      pairedPretestMastery.map(
        (row) =>
          row.statQuestGain
      )
    );

  const averageExternalGain =
    meanNullable(
      pairedPretestExternal.map(
        (row) =>
          row.externalGain
      )
    );

  const averageExternalVsMastery =
    meanNullable(
      pairedMasteryExternal.map(
        (row) =>
          row.externalVsMastery
      )
    );

  // =========================================================
  // CSV EXPORT
  // =========================================================

  function exportCSV() {
    if (
      researchRows.length === 0
    ) {
      return;
    }

    const headers = [
      "student_id",
      "student_name",

      "pretest_percent",

      "mastery_percent",
      "mastery_passed",

      "statquest_gain_points",

      "external_assessment_name",
      "external_percent",

      "external_gain_from_pretest_points",
      "external_minus_mastery_points",

      "probability_progress_percent",
      "module_completed",

      "total_xp",
      "ai_critiques",
      "streak",
      "daily_quest_count",

      "ease_of_use",
      "learning_helpfulness",
      "ai_critique_helpfulness",
      "simulation_helpfulness",
      "motivation_rating",

      "feedback_comment",
    ];

    const rows =
      researchRows.map(
        (row) => [
          row.studentId,
          row.studentName,

          csvNumber(
            row.pretestScore
          ),

          csvNumber(
            row.masteryScore
          ),

          row.masteryPassed ===
          null
            ? ""
            : row.masteryPassed
              ? "1"
              : "0",

          csvNumber(
            row.statQuestGain
          ),

          row.externalAssessmentName ??
            "",

          csvNumber(
            row.externalScore
          ),

          csvNumber(
            row.externalGain
          ),

          csvNumber(
            row.externalVsMastery
          ),

          row.probabilityProgress,

          row.moduleCompleted
            ? "1"
            : "0",

          row.totalXP,

          row.aiCritiques,

          row.streak,

          row.dailyQuestCount,

          csvNumber(
            row.easeOfUse
          ),

          csvNumber(
            row.learningHelpfulness
          ),

          csvNumber(
            row.aiCritiqueHelpfulness
          ),

          csvNumber(
            row.simulationHelpfulness
          ),

          csvNumber(
            row.motivationRating
          ),

          row.feedbackComment ??
            "",
        ]
      );

    const csv =
      [
        headers,
        ...rows,
      ]
        .map(
          (row) =>
            row
              .map(csvEscape)
              .join(",")
        )
        .join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    link.href = url;

    link.download =
      `statquest-probability-pilot-${date}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (
    checkingAccess ||
    !authorized
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">

        <div className="flex items-center gap-3 text-slate-300">

          <Loader2 className="h-7 w-7 animate-spin" />

          Checking instructor access...

        </div>

      </main>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">

      <Sidebar />

      <section className="flex-1 p-10">

        <Link
          href="/instructor"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition hover:text-purple-400"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Instructor Dashboard
        </Link>

        {/* HEADER */}

        <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row">

          <div>

            <div className="mb-4 flex items-center gap-4">

              <ShieldCheck className="h-12 w-12 text-purple-400" />

              <div>

                <p className="text-sm font-semibold uppercase tracking-wider text-purple-400">
                  Pilot Research
                </p>

                <h1 className="text-5xl font-bold">
                  Research Dataset
                </h1>

              </div>

            </div>

            <p className="max-w-4xl text-lg text-slate-400">
              Build an analysis-ready Probability dataset combining
              baseline knowledge, StatQuest AI mastery, independent
              course assessment performance, engagement, and pilot
              feedback.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={
                loadResearchData
              }
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 font-semibold transition hover:bg-slate-800 disabled:opacity-60"
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

            <button
              type="button"
              onClick={
                exportCSV
              }
              disabled={
                loading ||
                researchRows.length ===
                  0
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-cyan-500 px-5 py-3 font-semibold transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >

              <Download className="h-5 w-5" />

              Export CSV

            </button>

          </div>

        </div>

        {/* ERROR */}

        {message && (
          <div className="mb-8 flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">

            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />

            <p>{message}</p>

          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            icon={Users}
            label="Students"
            value={
              loading
                ? "..."
                : researchRows.length
            }
            iconClass="text-cyan-400"
          />

          <MetricCard
            icon={ClipboardCheck}
            label="Pretest + Mastery"
            value={
              loading
                ? "..."
                : `${pairedPretestMastery.length}/${researchRows.length}`
            }
            iconClass="text-purple-400"
          />

          <MetricCard
            icon={GraduationCap}
            label="Pretest + External"
            value={
              loading
                ? "..."
                : `${pairedPretestExternal.length}/${researchRows.length}`
            }
            iconClass="text-blue-400"
          />

          <MetricCard
            icon={FileSpreadsheet}
            label="All Three Measures"
            value={
              loading
                ? "..."
                : `${completeCases.length}/${researchRows.length}`
            }
            iconClass="text-green-400"
          />

        </div>

        {/* OUTCOMES */}

        <div className="mb-10 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-blue-950/20 to-purple-950/20 p-8">

          <div className="mb-7 flex items-center gap-3">

            <TrendingUp className="h-9 w-9 text-cyan-400" />

            <div>

              <h2 className="text-3xl font-bold">
                Probability Outcomes
              </h2>

              <p className="mt-1 text-slate-400">
                Descriptive pilot outcomes from the currently
                available student data.
              </p>

            </div>

          </div>

          <div className="grid gap-6 md:grid-cols-3">

            <MetricCard
              icon={ClipboardCheck}
              label="Avg. Pretest"
              value={
                loading
                  ? "..."
                  : averagePretest ===
                      null
                    ? "No scores"
                    : formatPercent(
                        averagePretest
                      )
              }
              iconClass="text-purple-400"
            />

            <MetricCard
              icon={Target}
              label="Avg. Mastery"
              value={
                loading
                  ? "..."
                  : averageMastery ===
                      null
                    ? "No scores"
                    : formatPercent(
                        averageMastery
                      )
              }
              iconClass="text-green-400"
            />

            <MetricCard
              icon={GraduationCap}
              label="Avg. External"
              value={
                loading
                  ? "..."
                  : averageExternal ===
                      null
                    ? "No scores"
                    : formatPercent(
                        averageExternal
                      )
              }
              iconClass="text-blue-400"
            />

          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">

            <MetricCard
              icon={TrendingUp}
              label="Avg. StatQuest Gain"
              value={
                loading
                  ? "..."
                  : averageStatQuestGain ===
                      null
                    ? "No paired data"
                    : formatGain(
                        averageStatQuestGain
                      )
              }
              iconClass="text-green-400"
            />

            <MetricCard
              icon={BarChart3}
              label="Avg. External Gain"
              value={
                loading
                  ? "..."
                  : averageExternalGain ===
                      null
                    ? "No paired data"
                    : formatGain(
                        averageExternalGain
                      )
              }
              iconClass="text-blue-400"
            />

            <MetricCard
              icon={Target}
              label="External vs. Mastery"
              value={
                loading
                  ? "..."
                  : averageExternalVsMastery ===
                      null
                    ? "No paired data"
                    : formatGain(
                        averageExternalVsMastery
                      )
              }
              iconClass="text-cyan-400"
            />

          </div>

        </div>

        {/* DATASET PREVIEW */}

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 p-8">

            <div className="flex items-center gap-3">

              <FileSpreadsheet className="h-8 w-8 text-green-400" />

              <div>

                <h2 className="text-3xl font-bold">
                  Dataset Preview
                </h2>

                <p className="mt-1 text-slate-400">
                  One row per student. Missing values remain blank in
                  the CSV rather than being converted to zero.
                </p>

              </div>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full text-left">

              <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-400">

                <tr>

                  <th className="px-5 py-4">
                    Student
                  </th>

                  <th className="px-5 py-4">
                    Pretest
                  </th>

                  <th className="px-5 py-4">
                    Mastery
                  </th>

                  <th className="px-5 py-4">
                    SQ Gain
                  </th>

                  <th className="px-5 py-4">
                    External
                  </th>

                  <th className="px-5 py-4">
                    External Gain
                  </th>

                  <th className="px-5 py-4">
                    External vs. Mastery
                  </th>

                  <th className="px-5 py-4">
                    XP
                  </th>

                  <th className="px-5 py-4">
                    Critiques
                  </th>

                  <th className="px-5 py-4">
                    Quests
                  </th>

                  <th className="px-5 py-4">
                    Progress
                  </th>

                </tr>

              </thead>

              <tbody>

                {researchRows.length ===
                0 ? (

                  <tr>

                    <td
                      colSpan={11}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      No student data found.
                    </td>

                  </tr>

                ) : (

                  researchRows.map(
                    (row) => (

                      <tr
                        key={
                          row.studentId
                        }
                        className="border-t border-slate-800"
                      >

                        <td className="px-5 py-4">

                          <Link
                            href={`/instructor/students/${row.studentId}`}
                            className="font-semibold text-purple-300 hover:text-purple-200"
                          >
                            {
                              row.studentName
                            }
                          </Link>

                        </td>

                        <td className="px-5 py-4 text-purple-300">
                          {displayPercent(
                            row.pretestScore
                          )}
                        </td>

                        <td className="px-5 py-4 text-green-300">
                          {displayPercent(
                            row.masteryScore
                          )}
                        </td>

                        <td
                          className={`px-5 py-4 font-semibold ${gainClass(
                            row.statQuestGain
                          )}`}
                        >
                          {displayGain(
                            row.statQuestGain
                          )}
                        </td>

                        <td className="px-5 py-4 text-blue-300">
                          {displayPercent(
                            row.externalScore
                          )}
                        </td>

                        <td
                          className={`px-5 py-4 font-semibold ${gainClass(
                            row.externalGain
                          )}`}
                        >
                          {displayGain(
                            row.externalGain
                          )}
                        </td>

                        <td
                          className={`px-5 py-4 font-semibold ${gainClass(
                            row.externalVsMastery
                          )}`}
                        >
                          {displayGain(
                            row.externalVsMastery
                          )}
                        </td>

                        <td className="px-5 py-4 text-yellow-400">
                          {row.totalXP}
                        </td>

                        <td className="px-5 py-4">
                          {row.aiCritiques}
                        </td>

                        <td className="px-5 py-4">
                          {
                            row.dailyQuestCount
                          }
                        </td>

                        <td className="px-5 py-4 text-cyan-300">
                          {
                            row.probabilityProgress
                          }
                          %
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

      </section>

    </main>
  );
}

// =========================================================
// METRIC CARD
// =========================================================

function MetricCard({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  iconClass: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

      <Icon
        className={`mb-4 h-9 w-9 ${iconClass}`}
      />

      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>

    </div>
  );
}

// =========================================================
// PRETEST NORMALIZER
// =========================================================

function getPretestPercent(
  attempt: PretestAttempt
): number | null {
  if (
    typeof attempt.percent_score ===
    "number"
  ) {
    return roundOne(
      attempt.percent_score
    );
  }

  if (
    typeof attempt.percentage ===
    "number"
  ) {
    return roundOne(
      attempt.percentage
    );
  }

  if (
    typeof attempt.score ===
      "number" &&
    typeof attempt.total_questions ===
      "number" &&
    attempt.total_questions > 0
  ) {
    return roundOne(
      (attempt.score /
        attempt.total_questions) *
        100
    );
  }

  if (
    typeof attempt.correct_answers ===
      "number" &&
    typeof attempt.total_questions ===
      "number" &&
    attempt.total_questions > 0
  ) {
    return roundOne(
      (attempt.correct_answers /
        attempt.total_questions) *
        100
    );
  }

  return null;
}

// =========================================================
// EXTERNAL SCORE NORMALIZER
// =========================================================

function getExternalPercent(
  assessment: ExternalAssessment
): number | null {
  if (
    typeof assessment.percent_score ===
      "number" &&
    Number.isFinite(
      assessment.percent_score
    )
  ) {
    return roundOne(
      assessment.percent_score
    );
  }

  if (
    Number.isFinite(
      assessment.score
    ) &&
    Number.isFinite(
      assessment.total_points
    ) &&
    assessment.total_points > 0
  ) {
    return roundOne(
      (assessment.score /
        assessment.total_points) *
        100
    );
  }

  return null;
}

// =========================================================
// STATS
// =========================================================

function meanNullable(
  values: Array<number | null>
): number | null {
  const valid =
    values.filter(
      (
        value
      ): value is number =>
        typeof value ===
          "number" &&
        Number.isFinite(value)
    );

  if (
    valid.length === 0
  ) {
    return null;
  }

  return roundOne(
    valid.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / valid.length
  );
}

// =========================================================
// CSV HELPERS
// =========================================================

function csvNumber(
  value: number | null
) {
  return value === null
    ? ""
    : String(value);
}

function csvEscape(
  value: string | number
) {
  const text =
    String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  }

  return text;
}

// =========================================================
// FORMATTING
// =========================================================

function roundOne(
  value: number
) {
  return (
    Math.round(value * 10) /
    10
  );
}

function formatPercent(
  value: number
) {
  const rounded =
    roundOne(value);

  return Number.isInteger(
    rounded
  )
    ? `${rounded}%`
    : `${rounded.toFixed(
        1
      )}%`;
}

function displayPercent(
  value: number | null
) {
  return value === null
    ? "—"
    : formatPercent(
        value
      );
}

function formatGain(
  value: number
) {
  const rounded =
    roundOne(value);

  const prefix =
    rounded > 0
      ? "+"
      : "";

  return Number.isInteger(
    rounded
  )
    ? `${prefix}${rounded} pts`
    : `${prefix}${rounded.toFixed(
        1
      )} pts`;
}

function displayGain(
  value: number | null
) {
  return value === null
    ? "—"
    : formatGain(
        value
      );
}

function gainClass(
  value: number | null
) {
  if (value === null) {
    return "text-slate-500";
  }

  if (value > 0) {
    return "text-green-400";
  }

  if (value < 0) {
    return "text-red-400";
  }

  return "text-slate-300";
}

// =========================================================
// ERROR
// =========================================================

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    error &&
    typeof error === "object"
  ) {
    const possibleError =
      error as {
        message?: unknown;
        details?: unknown;
      };

    if (
      typeof possibleError.message ===
        "string" &&
      possibleError.message
    ) {
      return possibleError.message;
    }

    if (
      typeof possibleError.details ===
        "string" &&
      possibleError.details
    ) {
      return possibleError.details;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return fallback;
}