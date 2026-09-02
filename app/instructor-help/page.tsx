"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import {
  LifeBuoy,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function InstructorHelpPage() {
  const [category, setCategory] = useState("Probability");
  const [priority, setPriority] = useState("Normal");
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitQuestion() {
    setMessage("");
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Please log in before submitting a question.");
        setSaving(false);
        return;
      }

      if (!question.trim()) {
        setMessage("Please type your question before submitting.");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("instructor_questions").insert({
        student_id: user.id,
        category,
        priority,
        question,
        status: "Open",
      });

      if (error) throw error;

      setMessage("Your question has been sent to your instructor/TA.");
      setQuestion("");
      setCategory("Probability");
      setPriority("Normal");
    } catch (error: unknown) {
      console.error("INSTRUCTOR HELP ERROR:", error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong while submitting your question.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <LifeBuoy className="w-14 h-14 text-purple-400" />

            <h1 className="text-5xl font-bold">
              Instructor Help
            </h1>
          </div>

          <p className="text-slate-400 text-lg max-w-3xl">
            Submit questions to your instructor or TA when you need human
            support beyond the AI Tutor.
          </p>
        </div>

        <div className="grid xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <h2 className="text-3xl font-bold mb-6">
              Ask a Question
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-slate-300 mb-3">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500"
                >
                  <option>Probability</option>
                  <option>Random Variables</option>
                  <option>Sampling</option>
                  <option>Confidence Intervals</option>
                  <option>Hypothesis Testing</option>
                  <option>Regression</option>
                  <option>R / Simulation</option>
                  <option>Exam Review</option>
                  <option>Course Logistics</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-3">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500"
                >
                  <option>Normal</option>
                  <option>Urgent</option>
                </select>
              </div>
            </div>

            <label className="block text-slate-300 mb-3">
              Your Question
            </label>

            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Example: I do not understand why a p-value is not the probability that the null hypothesis is true."
              className="w-full h-48 bg-slate-950 border border-slate-700 rounded-2xl p-5 text-white focus:outline-none focus:border-purple-500 mb-6"
            />

            <button
              onClick={submitQuestion}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-4 rounded-2xl font-semibold hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-3"
            >
              <Send className="w-5 h-5" />
              {saving ? "Submitting..." : "Submit Question"}
            </button>

            {message && (
              <div className="mt-6 bg-slate-950 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-300">
                  {message}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/20 border border-slate-800 rounded-3xl p-6">
              <Clock className="w-10 h-10 text-cyan-400 mb-4" />

              <h3 className="text-2xl font-bold mb-3">
                Office Hours
              </h3>

              <p className="text-slate-300">
                Use this page for questions that need instructor or TA review.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <CheckCircle className="w-10 h-10 text-green-400 mb-4" />

              <h3 className="text-2xl font-bold mb-3">
                When to Use This
              </h3>

              <ul className="text-slate-300 space-y-3">
                <li>• Assignment clarification</li>
                <li>• Exam review questions</li>
                <li>• Course policy questions</li>
                <li>• Conceptual confusion after using AI Tutor</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <AlertCircle className="w-10 h-10 text-yellow-400 mb-4" />

              <h3 className="text-2xl font-bold mb-3">
                Tip
              </h3>

              <p className="text-slate-300">
                Try the AI Tutor first for quick hints. Use Instructor Help
                when you need human confirmation or course-specific guidance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}