"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { Send, Bot, User } from "lucide-react";

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
                "max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-white border border-border rounded-bl-sm"
              )}
            >
              {msg.content}
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

      {/* Input */}
      <div className="px-4 pb-4 lg:pb-6 pt-2 border-t border-border bg-background">
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
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          AI-powered · Not a substitute for professional medical advice
        </p>
      </div>
    </div>
  );
}
