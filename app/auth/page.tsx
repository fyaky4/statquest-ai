"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bot,
  Mail,
  Lock,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleAuth() {
    if (loading) return;

    setMessage("");
    setSuccess(false);

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (!isValidEmail(cleanedEmail)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (mode === "signup") {
      if (!fullName.trim()) {
        setMessage("Please enter your full name.");
        return;
      }

      if (password.length < 6) {
        setMessage("Password must contain at least 6 characters.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              display_name:
                displayName.trim() || fullName.trim(),
            },
          },
        });

        if (error) throw error;

        /*
         * With email confirmation disabled in Supabase,
         * signUp normally returns an active session immediately.
         */
        if (data.session) {
          setSuccess(true);
          setMessage(
            "Account created successfully. Taking you to your dashboard..."
          );

          window.location.href = "/dashboard";
          return;
        }

        /*
         * This fallback supports email confirmation later
         * if you decide to enable it in Supabase.
         */
        setSuccess(true);
        setMessage(
          "Account created successfully. Please check your email to confirm your account before signing in."
        );
      }

      if (mode === "login") {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: cleanedEmail,
            password,
          });

        if (error) throw error;

        window.location.href = "/dashboard";
      }
    } catch (error: unknown) {
      console.error("AUTH ERROR:", error);

      setSuccess(false);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: "login" | "signup") {
    setMode(newMode);
    setMessage("");
    setSuccess(false);
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-purple-900/20">

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-4 rounded-2xl">
            <Bot className="w-8 h-8 text-white" />
          </div>

          <div>
            <h1 className="text-3xl font-bold">
              StatQuest AI
            </h1>

            <p className="text-slate-400">
              {mode === "login"
                ? "Log in to continue"
                : "Create your student account"}
            </p>
          </div>
        </div>

        {/* MODE SWITCH */}
        <div className="flex bg-slate-950 border border-slate-800 rounded-2xl p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              mode === "login"
                ? "bg-purple-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              mode === "signup"
                ? "bg-purple-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* SIGNUP FIELDS */}
        {mode === "signup" && (
          <>
            <div className="mb-4">
              <label className="text-slate-300 mb-2 block">
                Full Name
              </label>

              <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-2xl px-4">
                <User className="w-5 h-5 text-slate-400" />

                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  className="w-full bg-transparent py-4 outline-none"
                  placeholder="Full name"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-slate-300 mb-2 block">
                Display Name
              </label>

              <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-2xl px-4">
                <User className="w-5 h-5 text-slate-400" />

                <input
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  className="w-full bg-transparent py-4 outline-none"
                  placeholder="Leaderboard name (optional)"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                This name will appear on the leaderboard.
              </p>
            </div>
          </>
        )}

        {/* EMAIL */}
        <div className="mb-4">
          <label className="text-slate-300 mb-2 block">
            Email
          </label>

          <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-2xl px-4">
            <Mail className="w-5 h-5 text-slate-400" />

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAuth();
                }
              }}
              className="w-full bg-transparent py-4 outline-none"
              placeholder="student@email.com"
            />
          </div>
        </div>

        {/* PASSWORD */}
        <div className="mb-6">
          <label className="text-slate-300 mb-2 block">
            Password
          </label>

          <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-2xl px-4">
            <Lock className="w-5 h-5 text-slate-400" />

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAuth();
                }
              }}
              className="w-full bg-transparent py-4 outline-none"
              placeholder={
                mode === "signup"
                  ? "At least 6 characters"
                  : "Password"
              }
            />
          </div>
        </div>

        {/* SUBMIT */}
        <button
          type="button"
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-500 py-4 rounded-2xl font-semibold hover:scale-[1.02] transition-transform disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Create Account"}
        </button>

        {/* MESSAGE */}
        {message && (
          <div
            className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
              success
                ? "border-green-500/30 bg-green-950/30 text-green-300"
                : "border-red-500/30 bg-red-950/30 text-red-300"
            }`}
          >
            {success ? (
              <CheckCircle className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}

            <p>{message}</p>
          </div>
        )}
      </div>
    </main>
  );
}