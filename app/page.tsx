"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import {
  Brain,
  Trophy,
  FlaskConical,
  Sparkles,
  BarChart3,
  Bot,
  LogOut,
} from "lucide-react";

export default function HomePage() {
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();

    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white overflow-hidden">

      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#6d28d9_0%,transparent_30%)] opacity-20"></div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,#2563eb_0%,transparent_25%)] opacity-20"></div>

      {/* NAVBAR */}
      <nav className="relative z-10 flex items-center justify-between px-10 py-6 border-b border-slate-800">

        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
            StatQuest AI
          </h1>

          <p className="text-sm text-slate-400">
            Interactive Statistical Learning for the AI Era
          </p>
        </div>

        <div className="hidden md:flex items-center gap-8 text-slate-300">

          <Link href="/" className="hover:text-purple-400 transition">
            Home
          </Link>

          <Link href="/leaderboard" className="hover:text-purple-400 transition">
            Leaderboard
          </Link>

          <Link href="/ai-tutor" className="hover:text-purple-400 transition">
            AI Tutor
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-2 rounded-xl font-semibold"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 border border-slate-700 hover:border-red-500 px-4 py-2 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="border border-slate-700 hover:border-purple-500 px-5 py-2 rounded-xl transition"
              >
                Login
              </Link>

              <Link
                href="/auth"
                className="bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-2 rounded-xl font-semibold"
              >
                Get Started
              </Link>
            </>
          )}

        </div>

      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 grid lg:grid-cols-2 gap-12 items-center px-10 lg:px-20 py-24">

        {/* LEFT SIDE */}
        <div>

          <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />

            <span className="text-sm text-slate-300">
              AI-Powered • Simulation-Driven • Gamified
            </span>
          </div>

          <h1 className="text-6xl lg:text-7xl font-extrabold leading-tight mb-6">

            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">
              StatQuest AI
            </span>

          </h1>

          <p className="text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed">
            Master probability and statistics through AI tutoring,
            interactive simulations, gamified challenges,
            and real-world statistical decision making.
          </p>

          <div className="flex flex-wrap gap-4">

            {user ? (
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 transition-transform px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-purple-900/30"
              >
                Enter Dashboard
              </Link>
            ) : (
              <Link
                href="/auth"
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 transition-transform px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-purple-900/30"
              >
                Create Free Account
              </Link>
            )}

            <Link
              href="/leaderboard"
              className="border border-slate-700 hover:border-purple-500 hover:bg-slate-900 transition px-8 py-4 rounded-2xl font-semibold"
            >
              View Leaderboard
            </Link>

          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="relative">

          <div className="bg-slate-900/70 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-purple-900/20">

            <div className="grid grid-cols-2 gap-6">

              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
                <BarChart3 className="w-10 h-10 text-blue-400 mb-4" />

                <h3 className="font-bold text-lg mb-2">
                  Your Progress
                </h3>

                <p className="text-4xl font-bold text-purple-400">
                  72%
                </p>
              </div>

              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
                <Trophy className="w-10 h-10 text-yellow-400 mb-4" />

                <h3 className="font-bold text-lg mb-2">
                  XP Earned
                </h3>

                <p className="text-4xl font-bold text-cyan-400">
                  1,250
                </p>
              </div>

              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
                <Brain className="w-10 h-10 text-pink-400 mb-4" />

                <h3 className="font-bold text-lg mb-2">
                  AI Critiques
                </h3>

                <p className="text-4xl font-bold text-pink-400">
                  18
                </p>
              </div>

              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
                <FlaskConical className="w-10 h-10 text-green-400 mb-4" />

                <h3 className="font-bold text-lg mb-2">
                  Simulations
                </h3>

                <p className="text-4xl font-bold text-green-400">
                  34
                </p>
              </div>

            </div>

            {/* AI ASSISTANT */}
            <div className="mt-8 bg-gradient-to-r from-purple-900/40 to-blue-900/30 border border-purple-800 rounded-2xl p-6 flex items-center gap-4">

              <div className="bg-slate-950 p-4 rounded-2xl">
                <Bot className="w-10 h-10 text-cyan-400" />
              </div>

              <div>
                <h3 className="font-bold text-lg">
                  AI Tutor Online
                </h3>

                <p className="text-slate-300">
                  Ask questions, get hints, and learn step-by-step.
                </p>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* FEATURES */}
      <section className="relative z-10 grid md:grid-cols-3 gap-8 px-10 lg:px-20 pb-24">

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 hover:border-purple-500 transition">

          <Brain className="w-12 h-12 text-purple-400 mb-6" />

          <h2 className="text-2xl font-bold mb-4">
            AI Tutor
          </h2>

          <p className="text-slate-300 leading-relaxed">
            Get personalized guidance using Socratic questioning,
            statistical reasoning, and AI-assisted explanations.
          </p>

        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 hover:border-cyan-500 transition">

          <Trophy className="w-12 h-12 text-yellow-400 mb-6" />

          <h2 className="text-2xl font-bold mb-4">
            Gamified Challenges
          </h2>

          <p className="text-slate-300 leading-relaxed">
            Earn XP, unlock badges, maintain streaks, and climb
            the leaderboard while mastering statistics.
          </p>

        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 hover:border-green-500 transition">

          <FlaskConical className="w-12 h-12 text-green-400 mb-6" />

          <h2 className="text-2xl font-bold mb-4">
            Simulation Arena
          </h2>

          <p className="text-slate-300 leading-relaxed">
            Visualize probability, sampling variability,
            inference, and real-world randomness interactively.
          </p>

        </div>

      </section>

    </main>
  );
}