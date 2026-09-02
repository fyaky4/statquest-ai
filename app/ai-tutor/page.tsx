"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import {
  Bot,
  Send,
  Brain,
  Sparkles,
  Loader2,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I’m your StatQuest AI Tutor. Ask me about probability, confidence intervals, regression, hypothesis testing, simulations, or statistical reasoning.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const aiMessage: Message = {
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I could not connect to the AI tutor. Please check your API key, route file, and server console.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 flex flex-col">
        {/* HEADER */}
        <div className="border-b border-slate-800 px-10 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-4 rounded-2xl">
              <Bot className="w-10 h-10 text-white" />
            </div>

            <div>
              <h1 className="text-5xl font-bold">
                AI Tutor
              </h1>

              <p className="text-slate-400 text-lg mt-2">
                Ask questions, get hints, and learn statistics interactively.
              </p>
            </div>
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8">
          {messages.map((message, index) => {
            const isUser = message.role === "user";

            return (
              <div
                key={index}
                className={`flex gap-4 ${isUser ? "justify-end" : ""}`}
              >
                {!isUser && (
                  <div className="bg-slate-900 border border-slate-800 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Bot className="w-8 h-8 text-cyan-400" />
                  </div>
                )}

                <div
                  className={
                    isUser
                      ? "bg-gradient-to-r from-purple-600 to-blue-500 rounded-3xl p-6 max-w-2xl"
                      : "bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl"
                  }
                >
                  {!isUser && (
                    <div className="flex items-center gap-2 mb-4 text-purple-400">
                      <Sparkles className="w-5 h-5" />

                      <span className="font-semibold">
                        StatQuest AI
                      </span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap text-slate-200 leading-relaxed text-lg">
                    {message.content}
                  </p>
                </div>

                {isUser && (
                  <div className="bg-slate-900 border border-slate-800 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-8 h-8 text-pink-400" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-4">
              <div className="bg-slate-900 border border-slate-800 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />

                <span className="text-slate-300">
                  StatQuest AI is thinking...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="border-t border-slate-800 p-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask StatQuest AI a question..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 text-lg focus:outline-none focus:border-purple-500"
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-blue-500 px-8 rounded-2xl hover:scale-105 transition-transform flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}