"use client";

import { useState, useRef, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock,
  Terminal,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "BLOCKED" | "LEAKED" | "SAFE" | "ERROR";
  leaked?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to the VinBank Guardrail Red-Teaming Lab! I am protected by VinBank Input & Output Guardrails. Try your best prompt injection attack to leak the system secrets!",
      status: "SAFE",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, leaked: 0, blocked: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        status: data.status,
        leaked: data.leaked,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Update statistics
      setStats((prev) => ({
        total: prev.total + 1,
        leaked: prev.leaked + (data.leaked ? 1 : 0),
        blocked: prev.blocked + (data.status === "BLOCKED" ? 1 : 0),
      }));
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "⚠️ Error connecting to Guardrail API server.",
          status: "BLOCKED",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading) {
        handleSubmit(e);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 sm:p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 flex-shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              VinBank Guardrail Red-Teaming Arena
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400">
              Target Model: <span className="font-mono text-indigo-300">gemini-3.5-flash-lite</span>
            </p>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 text-[11px] sm:text-xs font-medium">
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-800/80 border border-slate-700/50 rounded-full">
            <Terminal className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            <span className="text-slate-400">Attacks:</span>
            <span className="text-slate-200 font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-full">
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Blocked:</span>
            <span className="font-semibold">{stats.blocked}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-rose-950/40 border border-rose-500/30 text-rose-400 rounded-full">
            <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Leaked:</span>
            <span className="font-semibold">{stats.leaked}</span>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl w-full mx-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 sm:gap-4 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}

            <div className={`space-y-1.5 sm:space-y-2 max-w-[88%] sm:max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {/* Status Badge */}
              {msg.role === "assistant" && msg.status && (
                <div className="flex items-center gap-2">
                  {msg.status === "LEAKED" && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse">
                      <Unlock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> GUARDRAIL BYPASSED (LEAKED)
                    </span>
                  )}
                  {msg.status === "BLOCKED" && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> BLOCKED BY GUARDRAIL
                    </span>
                  )}
                  {msg.status === "SAFE" && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                      <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> SAFE RESPONSE
                    </span>
                  )}
                  {msg.status === "ERROR" && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                      <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" /> API NETWORK ERROR
                    </span>
                  )}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`p-3 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-600/10"
                    : msg.status === "LEAKED"
                    ? "bg-rose-950/30 border border-rose-500/40 text-rose-100 rounded-bl-none shadow-lg shadow-rose-950/20"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md"
                }`}
              >
                <p className="whitespace-pre-wrap font-mono text-xs sm:text-sm">{msg.content}</p>
              </div>
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-1">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 sm:gap-4 justify-start">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl rounded-bl-none flex items-center gap-2.5 sm:gap-3">
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 animate-spin" />
              <span className="text-[11px] sm:text-xs text-slate-400 font-mono">Evaluating Guardrails & AI Agent...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-md p-3 sm:p-4 sticky bottom-0 z-20 relative">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2 sm:gap-3 items-end">
          <div className="relative flex-1">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter attack prompt... (Enter to send, Shift+Enter for new line)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono resize-none"
              disabled={loading}
            />
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500/50 absolute right-3 sm:right-4 top-3 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium px-3.5 sm:px-5 py-3 sm:py-3.5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/20 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed mb-0.5 min-h-[44px]"
          >
            <span>Attack</span>
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
