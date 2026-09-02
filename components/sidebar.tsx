"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Home,
  LayoutDashboard,
  Trophy,
  Brain,
  ShieldCheck,
  Award,
  Dice5,
  CalendarDays,
  LifeBuoy,
  Route,
  LogOut,
  Loader2,
  MessageSquareText,
} from "lucide-react";

type UserRole = "student" | "instructor" | null;

const baseLinks = [
  {
    name: "Home",
    href: "/",
    icon: Home,
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Learning Paths",
    href: "/learning-paths",
    icon: Route,
  },
  {
    name: "Simulation Arena",
    href: "/simulations",
    icon: Dice5,
  },
  {
    name: "Daily Quest",
    href: "/daily-quest",
    icon: CalendarDays,
  },
  {
    name: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
  },
  {
    name: "Badges",
    href: "/badges",
    icon: Award,
  },
  {
    name: "AI Tutor",
    href: "/ai-tutor",
    icon: Brain,
  },
  {
    name: "Instructor Help",
    href: "/instructor-help",
    icon: LifeBuoy,
  },
  {
  name: "Pilot Feedback",
  href: "/feedback",
  icon: MessageSquareText,
},
];

export default function Sidebar() {
  const router = useRouter();

  const [signingOut, setSigningOut] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    async function loadRole() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setRole(null);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        if (data?.role === "instructor") {
          setRole("instructor");
        } else {
          setRole("student");
        }
      } catch (error) {
        console.error("SIDEBAR ROLE ERROR:", error);

        // Safe default:
        // if role cannot be loaded, do not expose instructor navigation.
        setRole("student");
      } finally {
        setLoadingRole(false);
      }
    }

    loadRole();
  }, []);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("SIGN OUT ERROR:", error);

      alert("Could not sign out. Please try again.");

      setSigningOut(false);
    }
  }

  return (
    <aside className="w-72 min-h-screen bg-slate-950 border-r border-slate-800 p-6 hidden lg:flex flex-col">
      {/* LOGO */}
      <div className="mb-8">
        <Link href="/">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">
            StatQuest AI
          </h1>
        </Link>

        <p className="text-slate-400 mt-2">
          Interactive Statistical Learning
        </p>
      </div>

      {/* NAVIGATION */}
      <nav className="flex flex-col gap-2 overflow-y-auto pr-1">
        {baseLinks.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-900/40 hover:bg-slate-800 transition border border-transparent hover:border-purple-500"
            >
              <Icon className="w-5 h-5 text-purple-400" />

              <span className="text-base text-slate-200">
                {link.name}
              </span>
            </Link>
          );
        })}

        {/* INSTRUCTOR-ONLY NAVIGATION */}
        {!loadingRole && role === "instructor" && (
          <Link
            href="/instructor"
            className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-purple-950/30 hover:bg-purple-900/40 transition border border-purple-500/20 hover:border-purple-400"
          >
            <ShieldCheck className="w-5 h-5 text-purple-400" />

            <span className="text-base text-slate-200">
              Instructor
            </span>
          </Link>
        )}
      </nav>

      {/* HELP */}
      <div className="mt-6">
        <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/30 border border-slate-800 rounded-2xl p-4">
          <h3 className="font-bold text-base mb-2">
            Need More Help?
          </h3>

          <p className="text-xs text-slate-300">
            Contact your instructor or TA during office hours for personalized
            assistance.
          </p>
        </div>
      </div>

      {/* SIGN OUT */}
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-950/40 hover:border-red-400 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5" />
          )}

          <span className="font-semibold">
            {signingOut ? "Signing Out..." : "Sign Out"}
          </span>
        </button>
      </div>
    </aside>
  );
}