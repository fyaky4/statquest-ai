"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
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
  created_at: string | null;
};

type LearningProgress = {
  student_id: string;
  module_key: string;
  percent_complete: number | null;
  completed: boolean | null;
};

type QuizAttempt = {
  id?: string;
  student_id: string;
  module_key?: string | null;
  lesson_key?: string | null;
  percent_score: number;
  passed: boolean;
  created_at: string;
};

type HelpRequest = {
  id: string;
  student_id: string;
  question: string;
  status: string | null;
  created_at: string;
};

type DailyQuestSubmission = {
  id?: string;
  student_id: string;
  quest_date: string;
  score?: number | null;
  xp_earned?: number | null;
};

type PilotFeedback = {
  id?: string;
  student_id: string;

  ease_of_use: number | null;
  learning_helpfulness: number | null;
  ai_critique_helpfulness: number | null;
  simulation_helpfulness: number | null;
  motivation_rating: number | null;

  improvement_feedback: string | null;

  submitted_at: string | null;
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

type ExternalAssessment = {
  id: string;
  student_id: string;
  module_key: string;

  assessment_name: string;

  score: number;
  total_points: number;

  percent_score: number | null;

  assessment_date: string | null;

  created_at: string;
};

type StudentSummary = {
  id: string;
  name: string;

  totalXP: number;
  streak: number;
  aiCritiques: number;

  probabilityProgress: number;
  probabilityCompleted: boolean;

  masteryScore: number | null;
  masteryPassed: boolean;

  pretestScore: number | null;

  learningGain: number | null;

  externalAssessmentName: string | null;
  externalScore: number | null;

  externalGain: number | null;

  masteryExternalDifference: number | null;

  dailyQuestCount: number;

  status:
    | "completed"
    | "mastery-support"
    | "behind"
    | "not-started"
    | "in-progress";
};

// =========================================================
// PAGE
// =========================================================

export default function InstructorDashboardPage() {
  const router = useRouter();

  const [authorized, setAuthorized] =
    useState(false);

  const [checkingAccess, setCheckingAccess] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [students, setStudents] =
    useState<StudentProfile[]>([]);

  const [progress, setProgress] =
    useState<LearningProgress[]>([]);

  const [quizAttempts, setQuizAttempts] =
    useState<QuizAttempt[]>([]);

  const [helpRequests, setHelpRequests] =
    useState<HelpRequest[]>([]);

  const [
    dailyQuestSubmissions,
    setDailyQuestSubmissions,
  ] = useState<DailyQuestSubmission[]>([]);

  const [feedback, setFeedback] =
    useState<PilotFeedback[]>([]);

  const [pretestAttempts, setPretestAttempts] =
    useState<PretestAttempt[]>([]);

  const [
    externalAssessments,
    setExternalAssessments,
  ] = useState<ExternalAssessment[]>([]);

  // =========================================================
  // ACCESS CHECK
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

        if (profile?.role !== "instructor") {
          router.replace("/dashboard");
          return false;
        }

        setAuthorized(true);

        return true;
      } catch (error) {
        console.error(
          "INSTRUCTOR ACCESS ERROR:",
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

  const loadInstructorData =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const [
          studentsResponse,
          progressResponse,
          quizResponse,
          helpResponse,
          dailyQuestResponse,
          feedbackResponse,
          pretestResponse,
          externalResponse,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, display_name, total_xp, streak, ai_critiques, created_at"
            )
            .eq("role", "student")
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("learning_progress")
            .select(
              "student_id, module_key, percent_complete, completed"
            )
            .eq("module_key", "probability"),

          supabase
            .from("quiz_attempts")
            .select(
              "id, student_id, module_key, lesson_key, percent_score, passed, created_at"
            )
            .eq("module_key", "probability")
            .eq("lesson_key", "module-quiz")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("instructor_questions")
            .select(
              "id, student_id, question, status, created_at"
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("daily_quest_submissions")
            .select(
              "id, student_id, quest_date, score, xp_earned"
            )
            .order("quest_date", {
              ascending: false,
            }),

          supabase
            .from("pilot_feedback")
            .select(
              "id, student_id, ease_of_use, learning_helpfulness, ai_critique_helpfulness, simulation_helpfulness, motivation_rating, improvement_feedback, submitted_at"
            )
            .order("submitted_at", {
              ascending: false,
            }),

          supabase
            .from("module_pretest_attempts")
            .select("*")
            .eq("module_key", "probability"),

          supabase
            .from("external_assessment_scores")
            .select(
              "id, student_id, module_key, assessment_name, score, total_points, percent_score, assessment_date, created_at"
            )
            .eq("module_key", "probability")
            .order("assessment_date", {
              ascending: false,
              nullsFirst: false,
            })
            .order("created_at", {
              ascending: false,
            }),
        ]);

        if (studentsResponse.error) {
          throw studentsResponse.error;
        }

        if (progressResponse.error) {
          throw progressResponse.error;
        }

        if (quizResponse.error) {
          throw quizResponse.error;
        }

        if (helpResponse.error) {
          throw helpResponse.error;
        }

        if (dailyQuestResponse.error) {
          throw dailyQuestResponse.error;
        }

        if (feedbackResponse.error) {
          throw feedbackResponse.error;
        }

        if (pretestResponse.error) {
          throw pretestResponse.error;
        }

        if (externalResponse.error) {
          throw externalResponse.error;
        }

        setStudents(
          (studentsResponse.data ??
            []) as StudentProfile[]
        );

        setProgress(
          (progressResponse.data ??
            []) as LearningProgress[]
        );

        setQuizAttempts(
          (
            quizResponse.data ??
            []
          ).map((attempt) => ({
            ...attempt,
            percent_score: Number(
              attempt.percent_score
            ),
          })) as QuizAttempt[]
        );

        setHelpRequests(
          (helpResponse.data ??
            []) as HelpRequest[]
        );

        setDailyQuestSubmissions(
          (dailyQuestResponse.data ??
            []) as DailyQuestSubmission[]
        );

        setFeedback(
          (feedbackResponse.data ??
            []) as PilotFeedback[]
        );

        setPretestAttempts(
          (pretestResponse.data ??
            []) as PretestAttempt[]
        );

        setExternalAssessments(
          (
            externalResponse.data ??
            []
          ).map((assessment) => ({
            id: assessment.id,

            student_id:
              assessment.student_id,

            module_key:
              assessment.module_key,

            assessment_name:
              assessment.assessment_name,

            score: Number(
              assessment.score
            ),

            total_points: Number(
              assessment.total_points
            ),

            percent_score:
              assessment.percent_score === null
                ? null
                : Number(
                    assessment.percent_score
                  ),

            assessment_date:
              assessment.assessment_date,

            created_at:
              assessment.created_at,
          }))
        );
      } catch (error) {
        console.error(
          "INSTRUCTOR DASHBOARD ERROR:",
          error
        );

        setErrorMessage(
          getErrorMessage(
            error,
            "Could not load instructor dashboard."
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
        await loadInstructorData();
      }
    }

    void initialize();
  }, [
    checkInstructorAccess,
    loadInstructorData,
  ]);

  // =========================================================
  // STUDENT SUMMARIES
  // =========================================================

  const studentSummaries =
    useMemo<StudentSummary[]>(() => {
      return students.map((student) => {
        const studentProgress =
          progress.find(
            (item) =>
              item.student_id === student.id
          );

        const studentQuizAttempts =
          quizAttempts.filter(
            (attempt) =>
              attempt.student_id ===
              student.id
          );

        // Quiz attempts are already newest first.
        const latestMastery =
          studentQuizAttempts[0] ?? null;

        const masteryScore =
          latestMastery?.percent_score ??
          null;

        const masteryPassed =
          studentQuizAttempts.some(
            (attempt) => attempt.passed
          );

        const pretestAttempt =
          pretestAttempts.find(
            (attempt) =>
              attempt.student_id ===
              student.id
          );

        const pretestScore =
          pretestAttempt
            ? getPretestPercent(
                pretestAttempt
              )
            : null;

        const latestExternal =
          externalAssessments.find(
            (assessment) =>
              assessment.student_id ===
              student.id
          );

        const externalScore =
          latestExternal
            ? getExternalPercent(
                latestExternal
              )
            : null;

        const learningGain =
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

        const masteryExternalDifference =
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

        const probabilityCompleted =
          studentProgress?.completed ===
            true ||
          probabilityProgress >= 100;

        const dailyQuestCount =
          dailyQuestSubmissions.filter(
            (submission) =>
              submission.student_id ===
              student.id
          ).length;

        let status: StudentSummary["status"];

        if (
          probabilityCompleted &&
          masteryPassed
        ) {
          status = "completed";
        } else if (
          probabilityProgress >= 100 &&
          !masteryPassed
        ) {
          status = "mastery-support";
        } else if (
          probabilityProgress === 0 &&
          pretestScore === null
        ) {
          status = "not-started";
        } else if (
          probabilityProgress > 0 &&
          probabilityProgress < 50
        ) {
          status = "behind";
        } else {
          status = "in-progress";
        }

        return {
          id: student.id,

          name:
            student.display_name?.trim() ||
            student.full_name?.trim() ||
            "Unnamed Student",

          totalXP:
            student.total_xp ?? 0,

          streak:
            student.streak ?? 0,

          aiCritiques:
            student.ai_critiques ?? 0,

          probabilityProgress,

          probabilityCompleted,

          masteryScore,

          masteryPassed,

          pretestScore,

          learningGain,

          externalAssessmentName:
            latestExternal
              ?.assessment_name ?? null,

          externalScore,

          externalGain,

          masteryExternalDifference,

          dailyQuestCount,

          status,
        };
      });
    }, [
      students,
      progress,
      quizAttempts,
      pretestAttempts,
      externalAssessments,
      dailyQuestSubmissions,
    ]);

  // =========================================================
  // CORE CLASS METRICS
  // =========================================================

  const studentCount =
    studentSummaries.length;

  const averageXP =
    mean(
      studentSummaries.map(
        (student) => student.totalXP
      )
    );

  const averageProbabilityProgress =
    mean(
      studentSummaries.map(
        (student) =>
          student.probabilityProgress
      )
    );

  const completedStudents =
    studentSummaries.filter(
      (student) =>
        student.probabilityCompleted
    ).length;

  const moduleCompletionRate =
    studentCount > 0
      ? roundOne(
          (completedStudents /
            studentCount) *
            100
        )
      : 0;

  const studentsWithMastery =
    studentSummaries.filter(
      (student) =>
        student.masteryScore !== null
    );

  const averageMasteryScore =
    meanNullable(
      studentsWithMastery.map(
        (student) =>
          student.masteryScore
      )
    );

  const openHelpRequests =
    helpRequests.filter(
      (request) =>
        request.status !== "resolved" &&
        request.status !== "closed"
    );

  const attentionNeeded =
    studentSummaries.filter(
      (student) =>
        student.status === "behind" ||
        student.status ===
          "mastery-support"
    ).length;

  // =========================================================
  // PRETEST ANALYTICS
  // =========================================================

  const studentsWithPretest =
    studentSummaries.filter(
      (student) =>
        student.pretestScore !== null
    );

  const pretestCompletionRate =
    studentCount > 0
      ? roundOne(
          (studentsWithPretest.length /
            studentCount) *
            100
        )
      : 0;

  const averagePretestScore =
    meanNullable(
      studentsWithPretest.map(
        (student) =>
          student.pretestScore
      )
    );

  const studentsWithPairedScores =
    studentSummaries.filter(
      (student) =>
        student.pretestScore !== null &&
        student.masteryScore !== null
    );

  const averageLearningGain =
    meanNullable(
      studentsWithPairedScores.map(
        (student) =>
          student.learningGain
      )
    );

  const studentsImproved =
    studentsWithPairedScores.filter(
      (student) =>
        student.learningGain !== null &&
        student.learningGain > 0
    ).length;

  const improvementRate =
    studentsWithPairedScores.length > 0
      ? roundOne(
          (studentsImproved /
            studentsWithPairedScores.length) *
            100
        )
      : 0;

  // =========================================================
  // EXTERNAL ASSESSMENT ANALYTICS
  // =========================================================

  const studentsWithExternalAssessment =
    studentSummaries.filter(
      (student) =>
        student.externalScore !== null
    );

  const averageExternalScore =
    meanNullable(
      studentsWithExternalAssessment.map(
        (student) =>
          student.externalScore
      )
    );

  const studentsWithExternalPairedScores =
    studentSummaries.filter(
      (student) =>
        student.pretestScore !== null &&
        student.externalScore !== null
    );

  const averageExternalGain =
    meanNullable(
      studentsWithExternalPairedScores.map(
        (student) =>
          student.externalGain
      )
    );

  const studentsImprovedExternally =
    studentsWithExternalPairedScores.filter(
      (student) =>
        student.externalGain !== null &&
        student.externalGain > 0
    ).length;

  const externalImprovementRate =
    studentsWithExternalPairedScores.length > 0
      ? roundOne(
          (studentsImprovedExternally /
            studentsWithExternalPairedScores.length) *
            100
        )
      : 0;

  const studentsWithMasteryAndExternal =
    studentSummaries.filter(
      (student) =>
        student.masteryScore !== null &&
        student.externalScore !== null
    );

  const averageMasteryExternalDifference =
    meanNullable(
      studentsWithMasteryAndExternal.map(
        (student) =>
          student.masteryExternalDifference
      )
    );

  const studentsWithAllThreeMeasures =
    studentSummaries.filter(
      (student) =>
        student.pretestScore !== null &&
        student.masteryScore !== null &&
        student.externalScore !== null
    ).length;

  // =========================================================
  // PILOT FEEDBACK
  // =========================================================

  const uniqueFeedback =
    useMemo(() => {
      const latestByStudent =
        new Map<string, PilotFeedback>();

      for (const item of feedback) {
        if (
          !latestByStudent.has(
            item.student_id
          )
        ) {
          latestByStudent.set(
            item.student_id,
            item
          );
        }
      }

      return Array.from(
        latestByStudent.values()
      );
    }, [feedback]);

  const averageEaseOfUse =
    meanNullable(
      uniqueFeedback.map(
        (item) =>
          item.ease_of_use
      )
    );

  const averageLearningHelpfulness =
    meanNullable(
      uniqueFeedback.map(
        (item) =>
          item.learning_helpfulness
      )
    );

  const averageAIHelpfulness =
    meanNullable(
      uniqueFeedback.map(
        (item) =>
          item.ai_critique_helpfulness
      )
    );

  const averageSimulationHelpfulness =
    meanNullable(
      uniqueFeedback.map(
        (item) =>
          item.simulation_helpfulness
      )
    );

  const averageMotivation =
    meanNullable(
      uniqueFeedback.map(
        (item) =>
          item.motivation_rating
      )
    );

  const feedbackComments =
    uniqueFeedback.filter(
      (item) =>
        item.improvement_feedback?.trim()
    );

  // =========================================================
  // ACCESS SCREEN
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

      <section className="flex-1 p-8 md:p-10">
        {/* HEADER */}

        <div className="mb-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
          <div>
            <div className="mb-4 flex items-center gap-4">
              <ShieldCheck className="h-12 w-12 text-purple-400" />

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400">
                  Instructor
                </p>

                <h1 className="text-4xl font-bold md:text-5xl">
                  Instructor Dashboard
                </h1>
              </div>
            </div>

            <p className="max-w-4xl text-lg text-slate-400">
              Monitor student progress, mastery,
              engagement, learning gains, external
              assessment performance, and pilot
              feedback.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/instructor/research"
              className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-3 font-semibold text-green-300 transition hover:bg-green-500/20"
            >
              <FileSpreadsheet className="h-5 w-5" />
              Research / Export
            </Link>

            <button
              type="button"
              onClick={loadInstructorData}
              disabled={loading}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
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
        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-8 flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />

            <p>{errorMessage}</p>
          </div>
        )}

        {/* TOP METRICS */}

        <div className="mb-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Users}
            label="Students"
            value={
              loading
                ? "..."
                : studentCount
            }
            subtext="Enrolled student profiles"
            iconClass="text-cyan-400"
          />

          <MetricCard
            icon={Trophy}
            label="Average XP"
            value={
              loading
                ? "..."
                : Math.round(
                    averageXP
                  )
            }
            subtext="Across all students"
            iconClass="text-yellow-400"
          />

          <MetricCard
            icon={BookOpen}
            label="Avg. Probability Progress"
            value={
              loading
                ? "..."
                : `${roundOne(
                    averageProbabilityProgress
                  )}%`
            }
            subtext="Current module progress"
            iconClass="text-purple-400"
          />

          <MetricCard
            icon={CheckCircle2}
            label="Module Completion"
            value={
              loading
                ? "..."
                : `${moduleCompletionRate}%`
            }
            subtext={`${completedStudents}/${studentCount} students`}
            iconClass="text-green-400"
          />
        </div>

        {/* SECOND METRIC ROW */}

        <div className="mb-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Target}
            label="Avg. Mastery Score"
            value={
              loading
                ? "..."
                : averageMasteryScore ===
                    null
                  ? "No scores"
                  : formatPercent(
                      averageMasteryScore
                    )
            }
            subtext={`${studentsWithMastery.length} students assessed`}
            iconClass="text-green-400"
          />

          <MetricCard
            icon={HelpCircle}
            label="Open Help Requests"
            value={
              loading
                ? "..."
                : openHelpRequests.length
            }
            subtext="Questions needing review"
            iconClass="text-blue-400"
          />

          <MetricCard
            icon={Sparkles}
            label="Daily Quest Submissions"
            value={
              loading
                ? "..."
                : dailyQuestSubmissions.length
            }
            subtext="Total recorded submissions"
            iconClass="text-orange-400"
          />

          <MetricCard
            icon={AlertTriangle}
            label="Attention Needed"
            value={
              loading
                ? "..."
                : attentionNeeded
            }
            subtext="Behind or mastery support"
            iconClass="text-red-400"
          />
        </div>

        {/* ================================================= */}
        {/* PROBABILITY LEARNING EVIDENCE */}
        {/* ================================================= */}

        <div className="mb-10 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/25 via-blue-950/20 to-purple-950/20 p-8">
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <BarChart3 className="h-9 w-9 text-cyan-400" />

              <h2 className="text-3xl font-bold">
                Probability Learning Evidence
              </h2>
            </div>

            <p className="max-w-4xl text-slate-400">
              Compare baseline knowledge, performance
              after the StatQuest AI Probability module,
              and performance on an external course
              assessment.
            </p>
          </div>

          {/* THREE MEASURES */}

          <div className="grid gap-6 md:grid-cols-3">
            <MetricCard
              icon={ClipboardCheck}
              label="Avg. Pretest"
              value={
                loading
                  ? "..."
                  : averagePretestScore ===
                      null
                    ? "No scores"
                    : formatPercent(
                        averagePretestScore
                      )
              }
              subtext={`${studentsWithPretest.length} students`}
              iconClass="text-purple-400"
            />

            <MetricCard
              icon={Target}
              label="Avg. StatQuest Mastery"
              value={
                loading
                  ? "..."
                  : averageMasteryScore ===
                      null
                    ? "No scores"
                    : formatPercent(
                        averageMasteryScore
                      )
              }
              subtext={`${studentsWithMastery.length} students`}
              iconClass="text-green-400"
            />

            <MetricCard
              icon={GraduationCap}
              label="Avg. External Assessment"
              value={
                loading
                  ? "..."
                  : averageExternalScore ===
                      null
                    ? "No scores"
                    : formatPercent(
                        averageExternalScore
                      )
              }
              subtext={`${studentsWithExternalAssessment.length} students`}
              iconClass="text-blue-400"
            />
          </div>

          {/* GAINS */}

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <MetricCard
              icon={TrendingUp}
              label="Avg. StatQuest Learning Gain"
              value={
                loading
                  ? "..."
                  : averageLearningGain ===
                      null
                    ? "No paired data"
                    : formatGain(
                        averageLearningGain
                      )
              }
              subtext={`Mastery − pretest, n=${studentsWithPairedScores.length}`}
              iconClass="text-green-400"
            />

            <MetricCard
              icon={TrendingUp}
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
              subtext={`External − pretest, n=${studentsWithExternalPairedScores.length}`}
              iconClass="text-blue-400"
            />

            <MetricCard
              icon={BarChart3}
              label="External vs. Mastery"
              value={
                loading
                  ? "..."
                  : averageMasteryExternalDifference ===
                      null
                    ? "No paired data"
                    : formatGain(
                        averageMasteryExternalDifference
                      )
              }
              subtext={`External − mastery, n=${studentsWithMasteryAndExternal.length}`}
              iconClass="text-cyan-400"
            />
          </div>

          {/* COMPLETENESS */}

          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={ClipboardCheck}
              label="Pretest Completion"
              value={
                loading
                  ? "..."
                  : `${pretestCompletionRate}%`
              }
              subtext={`${studentsWithPretest.length}/${studentCount} students`}
              iconClass="text-purple-400"
            />

            <MetricCard
              icon={Target}
              label="Pretest + Mastery"
              value={
                loading
                  ? "..."
                  : studentsWithPairedScores.length
              }
              subtext={`${improvementRate}% improved`}
              iconClass="text-green-400"
            />

            <MetricCard
              icon={GraduationCap}
              label="External Assessment"
              value={
                loading
                  ? "..."
                  : studentsWithExternalAssessment.length
              }
              subtext={`${studentsWithExternalPairedScores.length} paired with baseline`}
              iconClass="text-blue-400"
            />

            <MetricCard
              icon={FileSpreadsheet}
              label="All Three Measures"
              value={
                loading
                  ? "..."
                  : studentsWithAllThreeMeasures
              }
              subtext="Pretest + mastery + external"
              iconClass="text-cyan-400"
            />
          </div>

          {/* EXTERNAL IMPROVEMENT */}

          {studentsWithExternalPairedScores.length >
            0 && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">
              <span className="font-semibold text-slate-200">
                External improvement:
              </span>{" "}
              {studentsImprovedExternally} of{" "}
              {
                studentsWithExternalPairedScores.length
              }{" "}
              students with paired baseline/external
              scores improved (
              {externalImprovementRate}%).
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* STUDENT TABLE */}
        {/* ================================================= */}

        <div className="mb-10 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-8">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-400" />

              <div>
                <h2 className="text-3xl font-bold">
                  Student Progress
                </h2>

                <p className="mt-1 text-slate-400">
                  Individual Probability progress and
                  learning evidence.
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
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Progress
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
                    Ext. Gain
                  </th>

                  <th className="px-5 py-4">
                    XP
                  </th>

                  <th className="px-5 py-4">
                    Quests
                  </th>

                  <th className="px-5 py-4">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      Loading students...
                    </td>
                  </tr>
                ) : studentSummaries.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No student profiles found.
                    </td>
                  </tr>
                ) : (
                  studentSummaries.map(
                    (student) => (
                      <tr
                        key={student.id}
                        className="border-t border-slate-800 transition hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold">
                              {student.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Streak:{" "}
                              {student.streak} · AI
                              critiques:{" "}
                              {student.aiCritiques}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              student.status
                            }
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="min-w-[120px]">
                            <div className="mb-2 flex justify-between text-xs">
                              <span className="text-slate-400">
                                Probability
                              </span>

                              <span className="text-cyan-300">
                                {
                                  student.probabilityProgress
                                }
                                %
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      student.probabilityProgress
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-purple-300">
                          {displayPercent(
                            student.pretestScore
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <span className="text-green-300">
                              {displayPercent(
                                student.masteryScore
                              )}
                            </span>

                            {student.masteryScore !==
                              null && (
                              <p className="mt-1 text-xs">
                                {student.masteryPassed ? (
                                  <span className="text-green-400">
                                    Passed
                                  </span>
                                ) : (
                                  <span className="text-orange-400">
                                    Not yet mastered
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </td>

                        <td
                          className={`px-5 py-4 font-semibold ${gainClass(
                            student.learningGain
                          )}`}
                        >
                          {displayGain(
                            student.learningGain
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <span className="text-blue-300">
                              {displayPercent(
                                student.externalScore
                              )}
                            </span>

                            {student.externalAssessmentName && (
                              <p className="mt-1 max-w-[150px] truncate text-xs text-slate-500">
                                {
                                  student.externalAssessmentName
                                }
                              </p>
                            )}
                          </div>
                        </td>

                        <td
                          className={`px-5 py-4 font-semibold ${gainClass(
                            student.externalGain
                          )}`}
                        >
                          {displayGain(
                            student.externalGain
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold text-yellow-400">
                          {student.totalXP}
                        </td>

                        <td className="px-5 py-4">
                          {
                            student.dailyQuestCount
                          }
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/instructor/students/${student.id}`}
                            className="inline-flex whitespace-nowrap rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================================================= */}
        {/* PILOT FEEDBACK */}
        {/* ================================================= */}

        <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-7 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-pink-400" />

            <div>
              <h2 className="text-3xl font-bold">
                Pilot Feedback
              </h2>

              <p className="mt-1 text-slate-400">
                Student perceptions of the StatQuest
                AI learning experience.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
            <FeedbackMetric
              label="Ease of Use"
              value={averageEaseOfUse}
            />

            <FeedbackMetric
              label="Learning Helpfulness"
              value={
                averageLearningHelpfulness
              }
            />

            <FeedbackMetric
              label="AI Critique"
              value={
                averageAIHelpfulness
              }
            />

            <FeedbackMetric
              label="Simulation"
              value={
                averageSimulationHelpfulness
              }
            />

            <FeedbackMetric
              label="Motivation"
              value={
                averageMotivation
              }
            />
          </div>

          <div className="mt-6 text-sm text-slate-400">
            Feedback submitted by{" "}
            <span className="font-semibold text-slate-200">
              {uniqueFeedback.length}
            </span>{" "}
            students.
          </div>

          {feedbackComments.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-xl font-bold">
                Recent Comments
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                {feedbackComments
                  .slice(0, 6)
                  .map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.id ??
                          `${item.student_id}-${index}`
                        }
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                      >
                        <p className="text-sm leading-relaxed text-slate-300">
                          “
                          {
                            item.improvement_feedback
                          }
                          ”
                        </p>
                      </div>
                    )
                  )}
              </div>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* HELP REQUESTS */}
        {/* ================================================= */}

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-7 flex items-center gap-3">
            <Brain className="h-8 w-8 text-blue-400" />

            <div>
              <h2 className="text-3xl font-bold">
                Recent Help Requests
              </h2>

              <p className="mt-1 text-slate-400">
                Student questions submitted through
                instructor help.
              </p>
            </div>
          </div>

          {openHelpRequests.length ===
          0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-400">
              No open help requests.
            </div>
          ) : (
            <div className="space-y-4">
              {openHelpRequests
                .slice(0, 8)
                .map((request) => {
                  const student =
                    students.find(
                      (item) =>
                        item.id ===
                        request.student_id
                    );

                  const studentName =
                    student
                      ?.display_name?.trim() ||
                    student
                      ?.full_name?.trim() ||
                    "Student";

                  return (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <Link
                          href={`/instructor/students/${request.student_id}`}
                          className="font-semibold text-purple-300 hover:text-purple-200"
                        >
                          {studentName}
                        </Link>

                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                          {request.status ||
                            "open"}
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed text-slate-300">
                        {request.question}
                      </p>

                      <p className="mt-3 text-xs text-slate-500">
                        {formatDate(
                          request.created_at
                        )}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
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
  subtext,
  iconClass,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  subtext?: string;
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

      {subtext && (
        <p className="mt-2 text-xs text-slate-500">
          {subtext}
        </p>
      )}
    </div>
  );
}

// =========================================================
// FEEDBACK METRIC
// =========================================================

function FeedbackMetric({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value === null
          ? "—"
          : `${roundOne(value)}/5`}
      </p>
    </div>
  );
}

// =========================================================
// STATUS
// =========================================================

function StatusBadge({
  status,
}: {
  status: StudentSummary["status"];
}) {
  const config = {
    completed: {
      label: "Completed",
      className:
        "border-green-500/30 bg-green-500/10 text-green-300",
    },

    "mastery-support": {
      label: "Mastery Support",
      className:
        "border-orange-500/30 bg-orange-500/10 text-orange-300",
    },

    behind: {
      label: "Behind",
      className:
        "border-red-500/30 bg-red-500/10 text-red-300",
    },

    "not-started": {
      label: "Not Started",
      className:
        "border-slate-600 bg-slate-800 text-slate-400",
    },

    "in-progress": {
      label: "In Progress",
      className:
        "border-blue-500/30 bg-blue-500/10 text-blue-300",
    },
  };

  const selected =
    config[status];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${selected.className}`}
    >
      {selected.label}
    </span>
  );
}

// =========================================================
// PRETEST SCORE NORMALIZER
// =========================================================

function getPretestPercent(
  attempt: PretestAttempt
): number | null {
  const percentScore =
    toFiniteNumber(
      attempt.percent_score
    );

  if (percentScore !== null) {
    return roundOne(
      percentScore
    );
  }

  const percentage =
    toFiniteNumber(
      attempt.percentage
    );

  if (percentage !== null) {
    return roundOne(
      percentage
    );
  }

  const score =
    toFiniteNumber(
      attempt.score
    );

  const correctAnswers =
    toFiniteNumber(
      attempt.correct_answers
    );

  const totalQuestions =
    toFiniteNumber(
      attempt.total_questions
    );

  if (
    score !== null &&
    totalQuestions !== null &&
    totalQuestions > 0
  ) {
    return roundOne(
      (score / totalQuestions) *
        100
    );
  }

  if (
    correctAnswers !== null &&
    totalQuestions !== null &&
    totalQuestions > 0
  ) {
    return roundOne(
      (correctAnswers /
        totalQuestions) *
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

function mean(
  values: number[]
) {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

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

  if (valid.length === 0) {
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

function toFiniteNumber(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  return null;
}

// =========================================================
// FORMATTERS
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

function formatDate(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
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