"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  User,
  Trophy,
  Flame,
  Brain,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock3,
  Loader2,
  AlertCircle,
  CalendarDays,
  BookOpen,
  Target,
  ClipboardCheck,
  TrendingUp,
  GraduationCap,
  Save,
  Pencil,
  Trash2,
  PlusCircle,
  FileText,
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
  role: string | null;
};

type Lesson = {
  id: string;
  lesson_key: string;
  title: string | null;
  position: number | null;
  xp_reward: number | null;
};

type LessonProgress = {
  lesson_id: string;
  status: string;
  percent_complete: number | null;
  started_at: string | null;
  completed_at: string | null;
};

type QuizAttempt = {
  id: string;
  score: number;
  total_questions: number;
  percent_score: number;
  passed: boolean;
  xp_earned: number;
  created_at: string;
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
  notes: string | null;
  created_at: string;
};

type DailyQuest = {
  quest_date: string;
  score: number;
  xp_earned: number;
};

type XPTransaction = {
  id: string;
  source_type: string;
  source_key: string;
  xp_amount: number;
  description: string | null;
  created_at: string;
};

type HelpQuestion = {
  id: string;
  category: string;
  priority: string;
  question: string;
  status: string;
  created_at: string;
};

type LessonSummary = {
  id: string;
  lessonKey: string;
  title: string;
  position: number;
  xpReward: number;
  status: string;
  percentComplete: number;
  startedAt: string | null;
  completedAt: string | null;
};

// =========================================================
// PAGE
// =========================================================

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();

  const studentId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [authorized, setAuthorized] =
    useState(false);

  const [checkingAccess, setCheckingAccess] =
    useState(true);

  const [student, setStudent] =
    useState<StudentProfile | null>(null);

  const [lessons, setLessons] =
    useState<Lesson[]>([]);

  const [lessonProgress, setLessonProgress] =
    useState<LessonProgress[]>([]);

  const [pretestAttempts, setPretestAttempts] =
    useState<PretestAttempt[]>([]);

  const [quizAttempts, setQuizAttempts] =
    useState<QuizAttempt[]>([]);

  const [
    externalAssessments,
    setExternalAssessments,
  ] = useState<ExternalAssessment[]>([]);

  const [dailyQuests, setDailyQuests] =
    useState<DailyQuest[]>([]);

  const [xpTransactions, setXPTransactions] =
    useState<XPTransaction[]>([]);

  const [helpQuestions, setHelpQuestions] =
    useState<HelpQuestion[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  // =========================================================
  // EXTERNAL ASSESSMENT FORM
  // =========================================================

  const [
    assessmentName,
    setAssessmentName,
  ] = useState("");

  const [
    assessmentScore,
    setAssessmentScore,
  ] = useState("");

  const [
    assessmentTotalPoints,
    setAssessmentTotalPoints,
  ] = useState("");

  const [
    assessmentDate,
    setAssessmentDate,
  ] = useState("");

  const [
    assessmentNotes,
    setAssessmentNotes,
  ] = useState("");

  const [
    editingAssessmentId,
    setEditingAssessmentId,
  ] = useState<string | null>(null);

  const [
    savingAssessment,
    setSavingAssessment,
  ] = useState(false);

  const [
    deletingAssessmentId,
    setDeletingAssessmentId,
  ] = useState<string | null>(null);

  const [
    assessmentMessage,
    setAssessmentMessage,
  ] = useState("");

  // =========================================================
  // ACCESS CONTROL
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
          "STUDENT DETAIL ACCESS ERROR:",
          error
        );

        router.replace("/dashboard");

        return false;
      } finally {
        setCheckingAccess(false);
      }
    }, [router]);

  // =========================================================
  // LOAD STUDENT DATA
  // =========================================================

  const loadStudentData =
    useCallback(async () => {
      if (!studentId) {
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const [
          profileResponse,
          lessonsResponse,
          progressResponse,
          pretestResponse,
          quizResponse,
          externalAssessmentResponse,
          dailyQuestResponse,
          xpResponse,
          helpResponse,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, display_name, total_xp, streak, ai_critiques, role"
            )
            .eq("id", studentId)
            .eq("role", "student")
            .single(),

          supabase
            .from("lessons")
            .select(
              "id, lesson_key, title, position, xp_reward"
            )
            .eq(
              "module_key",
              "probability"
            )
            .order("position", {
              ascending: true,
            }),

          supabase
            .from(
              "student_lesson_progress"
            )
            .select(
              "lesson_id, status, percent_complete, started_at, completed_at"
            )
            .eq(
              "student_id",
              studentId
            ),

          supabase
            .from(
              "module_pretest_attempts"
            )
            .select("*")
            .eq(
              "student_id",
              studentId
            )
            .eq(
              "module_key",
              "probability"
            ),

          supabase
            .from("quiz_attempts")
            .select(
              "id, score, total_questions, percent_score, passed, xp_earned, created_at"
            )
            .eq(
              "student_id",
              studentId
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
              "id, student_id, module_key, assessment_name, score, total_points, percent_score, assessment_date, notes, created_at"
            )
            .eq(
              "student_id",
              studentId
            )
            .eq(
              "module_key",
              "probability"
            )
            .order(
              "assessment_date",
              {
                ascending: false,
                nullsFirst: false,
              }
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from(
              "daily_quest_submissions"
            )
            .select(
              "quest_date, score, xp_earned"
            )
            .eq(
              "student_id",
              studentId
            )
            .order("quest_date", {
              ascending: false,
            }),

          supabase
            .from("xp_transactions")
            .select(
              "id, source_type, source_key, xp_amount, description, created_at"
            )
            .eq(
              "student_id",
              studentId
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from(
              "instructor_questions"
            )
            .select(
              "id, category, priority, question, status, created_at"
            )
            .eq(
              "student_id",
              studentId
            )
            .order("created_at", {
              ascending: false,
            }),
        ]);

        if (profileResponse.error) {
          throw profileResponse.error;
        }

        if (lessonsResponse.error) {
          throw lessonsResponse.error;
        }

        if (progressResponse.error) {
          throw progressResponse.error;
        }

        if (pretestResponse.error) {
          throw pretestResponse.error;
        }

        if (quizResponse.error) {
          throw quizResponse.error;
        }

        if (
          externalAssessmentResponse.error
        ) {
          throw externalAssessmentResponse.error;
        }

        if (
          dailyQuestResponse.error
        ) {
          throw dailyQuestResponse.error;
        }

        if (xpResponse.error) {
          throw xpResponse.error;
        }

        if (helpResponse.error) {
          throw helpResponse.error;
        }

        setStudent(
          profileResponse.data as StudentProfile
        );

        setLessons(
          (lessonsResponse.data ??
            []) as Lesson[]
        );

        setLessonProgress(
          (progressResponse.data ??
            []) as LessonProgress[]
        );

        setPretestAttempts(
          (pretestResponse.data ??
            []) as PretestAttempt[]
        );

        setQuizAttempts(
          (quizResponse.data ??
            []) as QuizAttempt[]
        );

        // Normalize PostgreSQL NUMERIC values.
        setExternalAssessments(
          (
            externalAssessmentResponse.data ??
            []
          ).map((item) => ({
            id: item.id,
            student_id:
              item.student_id,
            module_key:
              item.module_key,
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

            notes:
              item.notes,

            created_at:
              item.created_at,
          }))
        );

        setDailyQuests(
          (dailyQuestResponse.data ??
            []) as DailyQuest[]
        );

        setXPTransactions(
          (xpResponse.data ??
            []) as XPTransaction[]
        );

        setHelpQuestions(
          (helpResponse.data ??
            []) as HelpQuestion[]
        );
      } catch (error) {
        console.error(
          "STUDENT DETAIL ERROR:",
          error
        );

        setMessage(
          getErrorMessage(
            error,
            "Could not load student data."
          )
        );
      } finally {
        setLoading(false);
      }
    }, [studentId]);

  useEffect(() => {
    async function initializePage() {
      const allowed =
        await checkInstructorAccess();

      if (allowed) {
        await loadStudentData();
      }
    }

    void initializePage();
  }, [
    checkInstructorAccess,
    loadStudentData,
  ]);

  // =========================================================
  // LESSON SUMMARIES
  // =========================================================

  const lessonSummaries =
    useMemo<LessonSummary[]>(() => {
      return lessons.map((lesson) => {
        const progress =
          lessonProgress.find(
            (item) =>
              item.lesson_id ===
              lesson.id
          );

        return {
          id: lesson.id,

          lessonKey:
            lesson.lesson_key,

          title:
            lesson.title ||
            formatLessonKey(
              lesson.lesson_key
            ),

          position:
            lesson.position ?? 0,

          xpReward:
            lesson.xp_reward ?? 0,

          status:
            progress?.status ??
            "locked",

          percentComplete:
            progress?.percent_complete ??
            0,

          startedAt:
            progress?.started_at ??
            null,

          completedAt:
            progress?.completed_at ??
            null,
        };
      });
    }, [
      lessons,
      lessonProgress,
    ]);

  const completedLessons =
    lessonSummaries.filter(
      (lesson) =>
        lesson.status ===
          "completed" ||
        lesson.percentComplete >=
          100
    ).length;

  const moduleProgress =
    lessonSummaries.length > 0
      ? Math.round(
          (completedLessons /
            lessonSummaries.length) *
            100
        )
      : 0;

  // =========================================================
  // PRETEST + MASTERY
  // =========================================================

  const pretestAttempt =
    pretestAttempts[0] ??
    null;

  const pretestCompleted =
    Boolean(pretestAttempt);

  const pretestScore =
    pretestAttempt
      ? getPretestPercent(
          pretestAttempt
        )
      : null;

  const latestQuiz =
    quizAttempts[0] ??
    null;

  const latestMasteryScore =
    latestQuiz?.percent_score ??
    null;

  const bestQuizScore =
    quizAttempts.length > 0
      ? Math.max(
          ...quizAttempts.map(
            (attempt) =>
              attempt.percent_score
          )
        )
      : null;

  const passedMastery =
    quizAttempts.some(
      (attempt) =>
        attempt.passed
    );

  const learningGain =
    pretestScore !== null &&
    latestMasteryScore !== null
      ? roundOne(
          latestMasteryScore -
            pretestScore
        )
      : null;

  // =========================================================
  // EXTERNAL ASSESSMENT ANALYTICS
  // =========================================================

  const latestExternalAssessment =
    externalAssessments[0] ??
    null;

  const latestExternalScore =
    latestExternalAssessment
      ? getExternalPercent(
          latestExternalAssessment
        )
      : null;

  const externalGainFromBaseline =
    pretestScore !== null &&
    latestExternalScore !== null
      ? roundOne(
          latestExternalScore -
            pretestScore
        )
      : null;

  const masteryToExternalDifference =
    latestMasteryScore !== null &&
    latestExternalScore !== null
      ? roundOne(
          latestExternalScore -
            latestMasteryScore
        )
      : null;

  const studentName =
    student?.display_name?.trim() ||
    student?.full_name?.trim() ||
    "Student";

  // =========================================================
  // FORM PREVIEW
  // =========================================================

  const assessmentPreview =
    useMemo(() => {
      const score =
        Number(
          assessmentScore
        );

      const totalPoints =
        Number(
          assessmentTotalPoints
        );

      if (
        assessmentScore.trim() ===
          "" ||
        assessmentTotalPoints.trim() ===
          "" ||
        !Number.isFinite(score) ||
        !Number.isFinite(
          totalPoints
        ) ||
        totalPoints <= 0 ||
        score < 0 ||
        score > totalPoints
      ) {
        return null;
      }

      return roundTwo(
        (score / totalPoints) *
          100
      );
    }, [
      assessmentScore,
      assessmentTotalPoints,
    ]);

  // =========================================================
  // RESET FORM
  // =========================================================

  function resetAssessmentForm() {
    setAssessmentName("");
    setAssessmentScore("");
    setAssessmentTotalPoints(
      ""
    );
    setAssessmentDate("");
    setAssessmentNotes("");
    setEditingAssessmentId(
      null
    );
    setAssessmentMessage("");
  }

  // =========================================================
  // SAVE ASSESSMENT
  // =========================================================

  async function saveAssessment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setAssessmentMessage("");

    if (!studentId) {
      setAssessmentMessage(
        "Student information is missing."
      );
      return;
    }

    const cleanName =
      assessmentName.trim();

    const score =
      Number(
        assessmentScore
      );

    const totalPoints =
      Number(
        assessmentTotalPoints
      );

    if (!cleanName) {
      setAssessmentMessage(
        "Enter an assessment name."
      );
      return;
    }

    if (
      assessmentScore.trim() ===
        "" ||
      !Number.isFinite(score) ||
      score < 0
    ) {
      setAssessmentMessage(
        "Enter a valid student score."
      );
      return;
    }

    if (
      assessmentTotalPoints.trim() ===
        "" ||
      !Number.isFinite(
        totalPoints
      ) ||
      totalPoints <= 0
    ) {
      setAssessmentMessage(
        "Total points must be greater than zero."
      );
      return;
    }

    if (
      score > totalPoints
    ) {
      setAssessmentMessage(
        "The student score cannot exceed the total points."
      );
      return;
    }

    const percentScore =
      roundTwo(
        (score /
          totalPoints) *
          100
      );

    setSavingAssessment(true);

    try {
      if (
        editingAssessmentId
      ) {
        const { error } =
          await supabase
            .from(
              "external_assessment_scores"
            )
            .update({
              assessment_name:
                cleanName,

              score,

              total_points:
                totalPoints,

              percent_score:
                percentScore,

              assessment_date:
                assessmentDate ||
                null,

              notes:
                assessmentNotes.trim() ||
                null,
            })
            .eq(
              "id",
              editingAssessmentId
            );

        if (error) {
          throw error;
        }

        resetAssessmentForm();

        await loadStudentData();

        setAssessmentMessage(
          "Assessment updated successfully."
        );
      } else {
        const { error } =
          await supabase
            .from(
              "external_assessment_scores"
            )
            .insert({
              student_id:
                studentId,

              module_key:
                "probability",

              assessment_name:
                cleanName,

              score,

              total_points:
                totalPoints,

              percent_score:
                percentScore,

              assessment_date:
                assessmentDate ||
                null,

              notes:
                assessmentNotes.trim() ||
                null,
            });

        if (error) {
          throw error;
        }

        resetAssessmentForm();

        await loadStudentData();

        setAssessmentMessage(
          "Assessment saved successfully."
        );
      }
    } catch (error) {
      console.error(
        "SAVE EXTERNAL ASSESSMENT ERROR:",
        error
      );

      setAssessmentMessage(
        getErrorMessage(
          error,
          "Could not save the assessment."
        )
      );
    } finally {
      setSavingAssessment(
        false
      );
    }
  }

  // =========================================================
  // EDIT ASSESSMENT
  // =========================================================

  function beginEditingAssessment(
    assessment: ExternalAssessment
  ) {
    setEditingAssessmentId(
      assessment.id
    );

    setAssessmentName(
      assessment.assessment_name
    );

    setAssessmentScore(
      String(
        assessment.score
      )
    );

    setAssessmentTotalPoints(
      String(
        assessment.total_points
      )
    );

    setAssessmentDate(
      assessment.assessment_date ??
        ""
    );

    setAssessmentNotes(
      assessment.notes ??
        ""
    );

    setAssessmentMessage("");

    document
      .getElementById(
        "external-assessment-form"
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  // =========================================================
  // DELETE ASSESSMENT
  // =========================================================

  async function deleteAssessment(
    assessment: ExternalAssessment
  ) {
    const confirmed =
      window.confirm(
        `Delete "${assessment.assessment_name}" for ${studentName}? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingAssessmentId(
      assessment.id
    );

    setAssessmentMessage("");

    try {
      const { error } =
        await supabase
          .from(
            "external_assessment_scores"
          )
          .delete()
          .eq(
            "id",
            assessment.id
          );

      if (error) {
        throw error;
      }

      if (
        editingAssessmentId ===
        assessment.id
      ) {
        resetAssessmentForm();
      }

      await loadStudentData();

      setAssessmentMessage(
        "Assessment deleted."
      );
    } catch (error) {
      console.error(
        "DELETE EXTERNAL ASSESSMENT ERROR:",
        error
      );

      setAssessmentMessage(
        getErrorMessage(
          error,
          "Could not delete the assessment."
        )
      );
    } finally {
      setDeletingAssessmentId(
        null
      );
    }
  }

  // =========================================================
  // ACCESS LOADING
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
  // PAGE
  // =========================================================

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">

      <Sidebar />

      <section className="flex-1 p-10">

        {/* BACK */}

        <Link
          href="/instructor"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition hover:text-purple-400"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Instructor Dashboard
        </Link>

        {/* ERROR */}

        {message && (
          <div className="mb-8 flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        {loading ? (

          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-7 w-7 animate-spin" />
              Loading student analytics...
            </div>
          </div>

        ) : (

          <>

            {/* STUDENT HEADER */}

            <div className="mb-10">

              <div className="mb-4 flex items-center gap-4">

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10">
                  <User className="h-8 w-8 text-purple-400" />
                </div>

                <div>

                  <p className="text-sm font-semibold uppercase tracking-wider text-purple-400">
                    Student Analytics
                  </p>

                  <h1 className="text-5xl font-bold">
                    {studentName}
                  </h1>

                </div>

              </div>

              <p className="max-w-4xl text-lg text-slate-400">
                Review this student&apos;s baseline knowledge,
                StatQuest AI mastery, external course assessment
                performance, lesson progress, engagement, XP history,
                and support activity.
              </p>

            </div>

            {/* SUMMARY */}

            <div className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

              <SummaryCard
                icon={Trophy}
                iconClass="text-yellow-400"
                label="Total XP"
                value={
                  student?.total_xp ??
                  0
                }
              />

              <SummaryCard
                icon={BarChart3}
                iconClass="text-cyan-400"
                label="Probability Progress"
                value={`${moduleProgress}%`}
              />

              <SummaryCard
                icon={Brain}
                iconClass="text-pink-400"
                label="AI Critiques"
                value={
                  student?.ai_critiques ??
                  0
                }
              />

              <SummaryCard
                icon={Flame}
                iconClass="text-orange-400"
                label="Current Streak"
                value={`${student?.streak ?? 0} ${
                  (student?.streak ?? 0) === 1
                    ? "Day"
                    : "Days"
                }`}
              />

            </div>

            {/* THREE-MEASURE LEARNING EVIDENCE */}

            <div className="mb-10 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-blue-950/20 to-purple-950/20 p-8">

              <div className="mb-8 flex items-start gap-4">

                <TrendingUp className="h-11 w-11 shrink-0 text-cyan-400" />

                <div>

                  <h2 className="text-3xl font-bold">
                    Probability Learning Evidence
                  </h2>

                  <p className="mt-2 max-w-4xl text-slate-400">
                    Compare baseline knowledge, performance after
                    StatQuest AI instruction, and performance on an
                    external course assessment.
                  </p>

                </div>

              </div>

              <div className="grid gap-6 md:grid-cols-3">

                {/* PRETEST */}

                <div className="rounded-3xl border border-purple-500/20 bg-slate-950/60 p-7">

                  <ClipboardCheck className="mb-4 h-9 w-9 text-purple-400" />

                  <p className="text-slate-400">
                    1. Pretest Baseline
                  </p>

                  <p className="mt-2 text-3xl font-bold text-purple-300">
                    {!pretestCompleted
                      ? "Not submitted"
                      : pretestScore === null
                        ? "Completed"
                        : formatPercent(
                            pretestScore
                          )}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Knowledge before the Probability learning module.
                  </p>

                </div>

                {/* MASTERY */}

                <div className="rounded-3xl border border-green-500/20 bg-slate-950/60 p-7">

                  <Target className="mb-4 h-9 w-9 text-green-400" />

                  <p className="text-slate-400">
                    2. StatQuest Mastery
                  </p>

                  <p
                    className={`mt-2 text-3xl font-bold ${
                      latestMasteryScore === null
                        ? "text-slate-300"
                        : latestQuiz?.passed
                          ? "text-green-400"
                          : "text-red-400"
                    }`}
                  >
                    {latestMasteryScore === null
                      ? "Not attempted"
                      : formatPercent(
                          latestMasteryScore
                        )}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Most recent mastery assessment inside StatQuest AI.
                  </p>

                </div>

                {/* EXTERNAL */}

                <div className="rounded-3xl border border-blue-500/20 bg-slate-950/60 p-7">

                  <GraduationCap className="mb-4 h-9 w-9 text-blue-400" />

                  <p className="text-slate-400">
                    3. External Assessment
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-300">

                    {latestExternalScore === null
                      ? "Not recorded"
                      : formatPercent(
                          latestExternalScore
                        )}

                  </p>

                  {latestExternalAssessment ? (

                    <p className="mt-3 text-xs text-slate-500">
                      {
                        latestExternalAssessment.assessment_name
                      }
                    </p>

                  ) : (

                    <p className="mt-3 text-xs text-slate-500">
                      Independent evidence of course performance.
                    </p>

                  )}

                </div>

              </div>

              {/* GAINS */}

              <div className="mt-6 grid gap-4 md:grid-cols-3">

                <EvidenceMetric
                  label="StatQuest Learning Gain"
                  value={
                    learningGain === null
                      ? "Not available"
                      : formatGain(
                          learningGain
                        )
                  }
                  note="Mastery minus pretest"
                  valueClass={
                    gainClass(
                      learningGain
                    )
                  }
                />

                <EvidenceMetric
                  label="External Gain from Baseline"
                  value={
                    externalGainFromBaseline ===
                    null
                      ? "Not available"
                      : formatGain(
                          externalGainFromBaseline
                        )
                  }
                  note="External assessment minus pretest"
                  valueClass={
                    gainClass(
                      externalGainFromBaseline
                    )
                  }
                />

                <EvidenceMetric
                  label="External vs. Mastery"
                  value={
                    masteryToExternalDifference ===
                    null
                      ? "Not available"
                      : formatGain(
                          masteryToExternalDifference
                        )
                  }
                  note="External assessment minus StatQuest mastery"
                  valueClass={
                    gainClass(
                      masteryToExternalDifference
                    )
                  }
                />

              </div>

            </div>

            {/* EXTERNAL ASSESSMENT ENTRY */}

            <div
              id="external-assessment-form"
              className="mb-10 scroll-mt-8 rounded-3xl border border-blue-500/20 bg-slate-900 p-8"
            >

              <div className="mb-8 flex items-start gap-4">

                <GraduationCap className="h-10 w-10 shrink-0 text-blue-400" />

                <div>

                  <h2 className="text-3xl font-bold">
                    {editingAssessmentId
                      ? "Edit External Assessment"
                      : "Record External Assessment"}
                  </h2>

                  <p className="mt-2 max-w-3xl text-slate-400">
                    Enter an independent course assessment score for{" "}
                    {studentName}. The percentage is calculated
                    automatically from the raw score and total points.
                  </p>

                </div>

              </div>

              {assessmentMessage && (
                <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-cyan-200">
                  {assessmentMessage}
                </div>
              )}

              <form
                onSubmit={saveAssessment}
                className="space-y-6"
              >

                <div className="grid gap-6 lg:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Assessment Name
                    </label>

                    <input
                      type="text"
                      value={assessmentName}
                      onChange={(event) =>
                        setAssessmentName(
                          event.target.value
                        )
                      }
                      placeholder="Example: Probability Exam 1"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                      required
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Assessment Date
                    </label>

                    <input
                      type="date"
                      value={assessmentDate}
                      onChange={(event) =>
                        setAssessmentDate(
                          event.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                    />

                  </div>

                </div>

                <div className="grid gap-6 md:grid-cols-3">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Student Score
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={assessmentScore}
                      onChange={(event) =>
                        setAssessmentScore(
                          event.target.value
                        )
                      }
                      placeholder="17"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                      required
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Total Points
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        assessmentTotalPoints
                      }
                      onChange={(event) =>
                        setAssessmentTotalPoints(
                          event.target.value
                        )
                      }
                      placeholder="20"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                      required
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Calculated Percentage
                    </label>

                    <div className="flex min-h-[50px] items-center rounded-2xl border border-blue-500/20 bg-blue-950/20 px-4 py-3">

                      <span className="text-xl font-bold text-blue-300">

                        {assessmentPreview === null
                          ? "—"
                          : formatPercent(
                              assessmentPreview
                            )}

                      </span>

                    </div>

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Notes
                  </label>

                  <textarea
                    value={assessmentNotes}
                    onChange={(event) =>
                      setAssessmentNotes(
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Optional notes about the assessment or score..."
                    className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                  />

                </div>

                <div className="flex flex-wrap gap-3">

                  <button
                    type="submit"
                    disabled={savingAssessment}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {savingAssessment ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : editingAssessmentId ? (
                      <Save className="h-5 w-5" />
                    ) : (
                      <PlusCircle className="h-5 w-5" />
                    )}

                    {savingAssessment
                      ? "Saving..."
                      : editingAssessmentId
                        ? "Update Assessment"
                        : "Save Assessment"}

                  </button>

                  {editingAssessmentId && (
                    <button
                      type="button"
                      onClick={
                        resetAssessmentForm
                      }
                      className="rounded-2xl border border-slate-700 bg-slate-950 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      Cancel Edit
                    </button>
                  )}

                </div>

              </form>

            </div>

            {/* EXTERNAL ASSESSMENT HISTORY */}

            <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">

              <div className="mb-7 flex items-center gap-3">

                <FileText className="h-8 w-8 text-blue-400" />

                <div>

                  <h2 className="text-3xl font-bold">
                    External Assessment History
                  </h2>

                  <p className="mt-1 text-slate-400">
                    Course assessments recorded for the Probability module.
                  </p>

                </div>

              </div>

              {externalAssessments.length === 0 ? (

                <p className="text-slate-400">
                  No external assessment scores have been recorded yet.
                </p>

              ) : (

                <div className="overflow-x-auto">

                  <table className="min-w-full text-left">

                    <thead className="text-sm uppercase tracking-wide text-slate-500">

                      <tr>

                        <th className="px-4 py-3">
                          Assessment
                        </th>

                        <th className="px-4 py-3">
                          Raw Score
                        </th>

                        <th className="px-4 py-3">
                          Percentage
                        </th>

                        <th className="px-4 py-3">
                          Date
                        </th>

                        <th className="px-4 py-3">
                          Notes
                        </th>

                        <th className="px-4 py-3">
                          Actions
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {externalAssessments.map(
                        (assessment) => {

                          const percentage =
                            getExternalPercent(
                              assessment
                            );

                          return (
                            <tr
                              key={
                                assessment.id
                              }
                              className="border-t border-slate-800"
                            >

                              <td className="px-4 py-5">

                                <p className="font-semibold">
                                  {
                                    assessment.assessment_name
                                  }
                                </p>

                              </td>

                              <td className="px-4 py-5">

                                {assessment.score} /{" "}
                                {
                                  assessment.total_points
                                }

                              </td>

                              <td className="px-4 py-5">

                                <span className="font-bold text-blue-300">

                                  {percentage ===
                                  null
                                    ? "—"
                                    : formatPercent(
                                        percentage
                                      )}

                                </span>

                              </td>

                              <td className="px-4 py-5 text-slate-400">

                                {assessment.assessment_date
                                  ? formatShortDate(
                                      assessment.assessment_date
                                    )
                                  : "Not specified"}

                              </td>

                              <td className="max-w-sm px-4 py-5 text-slate-400">

                                {assessment.notes ||
                                  "—"}

                              </td>

                              <td className="px-4 py-5">

                                <div className="flex items-center gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      beginEditingAssessment(
                                        assessment
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void deleteAssessment(
                                        assessment
                                      )
                                    }
                                    disabled={
                                      deletingAssessmentId ===
                                      assessment.id
                                    }
                                    className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                                  >

                                    {deletingAssessmentId ===
                                    assessment.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}

                                    Delete

                                  </button>

                                </div>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

            {/* MASTERY SUMMARY */}

            <div className="mb-10 grid gap-6 lg:grid-cols-3">

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <Target className="mb-4 h-9 w-9 text-green-400" />

                <p className="text-slate-400">
                  Mastery Status
                </p>

                <p
                  className={`mt-2 text-3xl font-bold ${
                    passedMastery
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {passedMastery
                    ? "Mastered"
                    : "Not Yet Mastered"}
                </p>

              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <BarChart3 className="mb-4 h-9 w-9 text-blue-400" />

                <p className="text-slate-400">
                  Best Quiz Score
                </p>

                <p className="mt-2 text-3xl font-bold">

                  {bestQuizScore === null
                    ? "No attempts"
                    : formatPercent(
                        bestQuizScore
                      )}

                </p>

              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <Clock3 className="mb-4 h-9 w-9 text-purple-400" />

                <p className="text-slate-400">
                  Quiz Attempts
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {quizAttempts.length}
                </p>

              </div>

            </div>

            {/* LESSON PROGRESS */}

            <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">

              <div className="mb-7 flex items-center gap-3">

                <BookOpen className="h-8 w-8 text-cyan-400" />

                <h2 className="text-3xl font-bold">
                  Probability Lesson Progress
                </h2>

              </div>

              {lessonSummaries.length === 0 ? (

                <p className="text-slate-400">
                  No Probability lessons were found.
                </p>

              ) : (

                <div className="space-y-4">

                  {lessonSummaries.map(
                    (lesson) => {
                      const lessonComplete =
                        lesson.status ===
                          "completed" ||
                        lesson.percentComplete >=
                          100;

                      return (
                        <div
                          key={lesson.id}
                          className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                        >

                          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

                            <div>

                              <p className="text-sm text-slate-500">
                                Lesson{" "}
                                {lesson.position}
                              </p>

                              <h3 className="mt-1 text-lg font-semibold">
                                {lesson.title}
                              </h3>

                            </div>

                            <div className="flex items-center gap-4">

                              <span className="text-sm text-yellow-400">
                                {lesson.xpReward} XP
                              </span>

                              {lessonComplete ? (

                                <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-400">
                                  <CheckCircle className="h-4 w-4" />
                                  Completed
                                </span>

                              ) : lesson.status ===
                                "locked" ? (

                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-400">
                                  <Clock3 className="h-4 w-4" />
                                  Locked
                                </span>

                              ) : (

                                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-400">
                                  <Clock3 className="h-4 w-4" />

                                  {lesson.status ===
                                  "available"
                                    ? "Available"
                                    : "In Progress"}

                                </span>

                              )}

                            </div>

                          </div>

                          <div className="mt-5">

                            <div className="mb-2 flex justify-between text-xs">

                              <span className="text-slate-500">
                                Progress
                              </span>

                              <span className="text-cyan-400">
                                {lesson.percentComplete}%
                              </span>

                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                                style={{
                                  width: `${lesson.percentComplete}%`,
                                }}
                              />

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

            {/* QUIZ ATTEMPTS */}

            <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">

              <h2 className="mb-6 text-3xl font-bold">
                Mastery Quiz Attempts
              </h2>

              {quizAttempts.length === 0 ? (

                <p className="text-slate-400">
                  This student has not attempted the mastery quiz.
                </p>

              ) : (

                <div className="overflow-x-auto">

                  <table className="min-w-full text-left">

                    <thead className="text-sm uppercase text-slate-500">

                      <tr>

                        <th className="px-4 py-3">
                          Attempt
                        </th>

                        <th className="px-4 py-3">
                          Score
                        </th>

                        <th className="px-4 py-3">
                          Result
                        </th>

                        <th className="px-4 py-3">
                          XP
                        </th>

                        <th className="px-4 py-3">
                          Date
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {quizAttempts.map(
                        (attempt, index) => (

                          <tr
                            key={attempt.id}
                            className="border-t border-slate-800"
                          >

                            <td className="px-4 py-4">
                              {quizAttempts.length -
                                index}
                            </td>

                            <td className="px-4 py-4 font-semibold">
                              {formatPercent(
                                attempt.percent_score
                              )}
                            </td>

                            <td className="px-4 py-4">

                              {attempt.passed ? (

                                <span className="inline-flex items-center gap-2 text-green-400">
                                  <CheckCircle className="h-4 w-4" />
                                  Passed
                                </span>

                              ) : (

                                <span className="inline-flex items-center gap-2 text-red-400">
                                  <XCircle className="h-4 w-4" />
                                  Not Passed
                                </span>

                              )}

                            </td>

                            <td className="px-4 py-4 text-yellow-400">
                              {attempt.xp_earned}
                            </td>

                            <td className="px-4 py-4 text-slate-400">
                              {formatDate(
                                attempt.created_at
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

            {/* DAILY QUEST + XP */}

            <div className="mb-10 grid gap-8 xl:grid-cols-2">

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

                <div className="mb-6 flex items-center gap-3">

                  <CalendarDays className="h-8 w-8 text-cyan-400" />

                  <h2 className="text-3xl font-bold">
                    Daily Quest Activity
                  </h2>

                </div>

                {dailyQuests.length === 0 ? (

                  <p className="text-slate-400">
                    No Daily Quest submissions yet.
                  </p>

                ) : (

                  <div className="space-y-3">

                    {dailyQuests
                      .slice(0, 10)
                      .map(
                        (quest) => (

                          <div
                            key={
                              quest.quest_date
                            }
                            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4"
                          >

                            <div>

                              <p className="font-semibold">
                                {quest.quest_date}
                              </p>

                              <p className="text-sm text-slate-400">
                                Score {quest.score}/2
                              </p>

                            </div>

                            <span className="font-semibold text-yellow-400">
                              {quest.xp_earned} XP
                            </span>

                          </div>

                        )
                      )}

                  </div>

                )}

              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

                <div className="mb-6 flex items-center gap-3">

                  <Trophy className="h-8 w-8 text-yellow-400" />

                  <h2 className="text-3xl font-bold">
                    Recent XP Activity
                  </h2>

                </div>

                {xpTransactions.length ===
                0 ? (

                  <p className="text-slate-400">
                    No protected XP transactions recorded yet.
                  </p>

                ) : (

                  <div className="space-y-3">

                    {xpTransactions
                      .slice(0, 10)
                      .map(
                        (transaction) => (

                          <div
                            key={
                              transaction.id
                            }
                            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4"
                          >

                            <div>

                              <p className="font-semibold">
                                {transaction.description ||
                                  transaction.source_key}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(
                                  transaction.created_at
                                )}
                              </p>

                            </div>

                            <span className="text-lg font-bold text-yellow-400">
                              +{transaction.xp_amount}
                            </span>

                          </div>

                        )
                      )}

                  </div>

                )}

              </div>

            </div>

            {/* HELP REQUESTS */}

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

              <div className="mb-6 flex items-center gap-3">

                <AlertCircle className="h-8 w-8 text-purple-400" />

                <h2 className="text-3xl font-bold">
                  Student Help Requests
                </h2>

              </div>

              {helpQuestions.length === 0 ? (

                <p className="text-slate-400">
                  No help requests from this student.
                </p>

              ) : (

                <div className="space-y-4">

                  {helpQuestions.map(
                    (question) => (

                      <div
                        key={question.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                      >

                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

                          <span className="font-semibold text-purple-400">
                            {question.category}
                          </span>

                          <div className="flex gap-2">

                            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                              {question.priority}
                            </span>

                            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                              {question.status}
                            </span>

                          </div>

                        </div>

                        <p className="text-slate-300">
                          {question.question}
                        </p>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </>

        )}

      </section>

    </main>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

type SummaryCardProps = {
  icon: typeof Trophy;
  iconClass: string;
  label: string;
  value: string | number;
};

function SummaryCard({
  icon: Icon,
  iconClass,
  label,
  value,
}: SummaryCardProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

      <Icon
        className={`mb-4 h-10 w-10 ${iconClass}`}
      />

      <p className="text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-4xl font-bold">
        {value}
      </p>

    </div>
  );
}

// =========================================================
// EVIDENCE METRIC
// =========================================================

function EvidenceMetric({
  label,
  value,
  note,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  note: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {note}
      </p>

    </div>
  );
}

// =========================================================
// PRETEST HELPER
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
// EXTERNAL ASSESSMENT HELPER
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
// FORMATTERS
// =========================================================

function formatLessonKey(
  value: string
) {
  return value
    .split("-")
    .map(
      (word) =>
        word
          .charAt(0)
          .toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function roundOne(
  value: number
) {
  return (
    Math.round(value * 10) /
    10
  );
}

function roundTwo(
  value: number
) {
  return (
    Math.round(value * 100) /
    100
  );
}

function formatPercent(
  value: number
) {
  const rounded =
    roundOne(value);

  if (
    Number.isInteger(
      rounded
    )
  ) {
    return `${rounded}%`;
  }

  return `${rounded.toFixed(
    1
  )}%`;
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

  if (
    Number.isInteger(
      rounded
    )
  ) {
    return `${prefix}${rounded} pts`;
  }

  return `${prefix}${rounded.toFixed(
    1
  )} pts`;
}

function gainClass(
  value: number | null
) {
  if (value === null) {
    return "text-slate-300";
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
  value: string
) {
  return new Date(
    value
  ).toLocaleString();
}

function formatShortDate(
  value: string
) {
  const parts =
    value.split("-");

  if (
    parts.length === 3
  ) {
    const [
      year,
      month,
      day,
    ] = parts.map(Number);

    return new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString();
  }

  return value;
}

// =========================================================
// ERROR FORMATTER
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
        hint?: unknown;
        code?: unknown;
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