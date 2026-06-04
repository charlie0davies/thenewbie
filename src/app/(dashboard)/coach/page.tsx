"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { Send, Bot, User, Lock } from "lucide-react";

const FREE_LIMIT = 5;

// ─── Simple markdown renderer ─────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
}

function MarkdownText({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  const bullets: string[] = [];

  function flushBullets() {
    if (!bullets.length) return;
    nodes.push(
      <ul key={nodes.length} className="mt-1.5 space-y-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-50" />
            <span>{renderInline(b)}</span>
          </li>
        ))}
      </ul>
    );
    bullets.length = 0;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
    } else if (/^[•\-\*]\s/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[•\-\*]\s/, ""));
    } else {
      flushBullets();
      nodes.push(
        <p key={nodes.length} className={nodes.length > 0 ? "mt-2" : ""}>
          {renderInline(trimmed)}
        </p>
      );
    }
  }
  flushBullets();

  return <div className="text-sm leading-relaxed">{nodes}</div>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How do I do a Romanian deadlift?",
  "What's the best form for squats?",
  "Can I swap chicken for tofu?",
  "How much protein do I need daily?",
  "I'm feeling sore — should I still work out?",
  "How do I progress my bench press?",
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/user").then((r) => r.json()).then((u) => {
      if (!u) return;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const used = u.coachMessagesMonth === currentMonth ? (u.coachMessagesUsed ?? 0) : 0;
      setMessagesUsed(used);
      setIsPremium(u.plan === "premium");
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to get response");
      }

      if (res.status === 402) {
        setMessagesUsed(FREE_LIMIT);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't respond right now. Please try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      setMessagesUsed((prev) => Math.min(prev + 1, FREE_LIMIT));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh-3rem)]">
      <Header title="AI Coach" subtitle="Ask anything about your plan" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-6 pt-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <Bot size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Hi! I&apos;m your Coach 👋</p>
              <p className="text-sm text-muted-foreground mt-1">Ask me anything about your workouts, form, or nutrition.</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm px-4 py-3 rounded-xl bg-white border border-border hover:border-primary hover:bg-orange-50 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] px-4 py-3 rounded-2xl",
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-sm text-sm"
                  : "bg-white border border-border rounded-bl-sm"
              )}
            >
              {msg.role === "assistant" ? (
                <MarkdownText content={msg.content} />
              ) : (
                <span className="text-sm whitespace-pre-wrap">{msg.content}</span>
              )}
              {streaming && i === messages.length - 1 && msg.role === "assistant" && !msg.content && (
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <span key={j} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: `${j * 150}ms` }} />
                  ))}
                </span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input / Paywall */}
      <div className="px-4 pb-4 lg:pb-6 pt-2 border-t border-border bg-background">
        {!isPremium && messagesUsed >= FREE_LIMIT ? (
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <Lock size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">You&apos;ve used all {FREE_LIMIT} free messages</p>
              <p className="text-xs text-muted-foreground mt-0.5">Resets on the 1st of next month</p>
            </div>
            <button className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-2xl active:scale-95 transition-all">
              Upgrade to Premium — 50 messages/month
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 items-end max-w-2xl mx-auto">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your coach..."
                className="flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32 overflow-y-auto"
                style={{ minHeight: 48 }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-all active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
            {!isPremium && (
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                {messagesUsed} / {FREE_LIMIT} free messages used this month
              </p>
            )}
            <p className="text-center text-[10px] text-muted-foreground mt-1">
              AI-powered · Not a substitute for professional medical advice
            </p>
          </>
        )}
      </div>
    </div>
  );
}
