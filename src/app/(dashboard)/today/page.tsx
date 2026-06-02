"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Droplets,
  Dumbbell,
  Utensils,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import type { DailyRecord, DailyPlanItem } from "@/lib/db/daily";

const today = new Date().toISOString().slice(0, 10);

// ─── Celebration burst ────────────────────────────────────────────────────────

const PARTICLE_COLORS = ["#f97316","#22c55e","#3b82f6","#ec4899","#eab308","#8b5cf6"];

function CelebrationBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {PARTICLE_COLORS.map((color, i) => {
        const angle = (i / PARTICLE_COLORS.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 26;
        const tx = Math.round(Math.cos(rad) * dist);
        const ty = Math.round(Math.sin(rad) * dist);
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 6, height: 6, background: color,
              top: "50%", left: "50%",
              animationName: "particle-fly",
              animationDuration: "0.5s",
              animationTimingFunction: "ease-out",
              animationFillMode: "forwards",
              animationDelay: `${i * 15}ms`,
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </span>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onToggle,
}: {
  item: DailyPlanItem;
  onToggle: (id: string, done: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(item.partialNote || "");
  const [editing, setEditing] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.completed) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 650);
    }
    onToggle(item.id, !item.completed);
  }

  const icon =
    item.type === "exercise" ? (
      <Dumbbell size={16} className="text-accent shrink-0" />
    ) : item.type === "water" ? (
      <Droplets size={16} className="text-blue-400 shrink-0" />
    ) : (
      <Utensils size={16} className="text-primary shrink-0" />
    );

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        item.completed ? "border-green-200 bg-green-50/60" : "border-border bg-white"
      )}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <button
          type="button"
          onClick={handleCheck}
          className="shrink-0 relative"
        >
          <CelebrationBurst active={celebrating} />
          {item.completed ? (
            <CheckCircle2
              size={22}
              className={cn("text-primary transition-transform", celebrating && "animate-check-pop")}
            />
          ) : (
            <Circle size={22} className="text-muted-foreground" />
          )}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon}
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-medium truncate",
                item.completed && "line-through text-muted-foreground"
              )}
            >
              {item.label}
            </p>
            {item.detail && (
              <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
            )}
          </div>
        </div>

        {item.scheduledTime && (
          <span className="text-xs text-muted-foreground shrink-0">{item.scheduledTime}</span>
        )}
        {item.calories && (
          <span className="text-xs text-accent shrink-0">{item.calories} kcal</span>
        )}
        {expanded ? (
          <ChevronUp size={16} className="text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border mt-0 flex flex-col gap-2">
          {item.sets && (
            <p className="text-xs text-muted-foreground">
              {item.sets} sets × {item.reps}
              {item.weightKg ? ` @ ${item.weightKg}kg` : ""}
            </p>
          )}
          {!item.completed && (
            <div className="flex items-center gap-2 mt-1">
              {editing ? (
                <>
                  <input
                    className="flex-1 text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="What did you actually do?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onToggle(item.id, true);
                      setEditing(false);
                    }}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Pencil size={12} /> Mark as partial / edit
                </button>
              )}
            </div>
          )}
          {item.partialNote && (
            <p className="text-xs text-amber-400">Note: {item.partialNote}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Water tracker ────────────────────────────────────────────────────────────

function WaterTracker({
  done,
  target,
  onAdd,
}: {
  done: number;
  target: number;
  onAdd: (ml: number) => void;
}) {
  const pct = Math.min(100, Math.round((done / target) * 100));
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-blue-400" />
          <span className="font-semibold text-sm">Water</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {(done / 1000).toFixed(1)}L / {(target / 1000).toFixed(1)}L
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-blue-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-2 mb-2">
        {[200, 250, 500].map((ml) => (
          <button
            key={ml}
            onClick={() => onAdd(ml)}
            className="flex-1 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-100"
          >
            +{ml}ml
          </button>
        ))}
      </div>
      <button
        onClick={() => onAdd(-250)}
        disabled={done <= 0}
        className="w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-border disabled:opacity-40"
      >
        − 250ml
      </button>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/daily/${today}`);
        const data = await res.json();

        if (data && data.items) {
          setRecord(data);
        } else {
          // No record yet — auto-generate from saved plans
          const gen = await fetch("/api/daily/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: today }),
          });
          if (gen.ok) {
            const generated = await gen.json();
            setRecord(generated?.items ? generated : null);
          }
        }
      } catch {
        // leave record as null
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleToggle(itemId: string, completed: boolean) {
    await fetch(`/api/daily/${today}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", itemId, completed }),
    });
    setRecord((r) =>
      r
        ? {
            ...r,
            items: r.items.map((i) =>
              i.id === itemId ? { ...i, completed } : i
            ),
          }
        : null
    );
  }

  async function handleAddWater(ml: number) {
    const newAmount = (record?.waterMlDone || 0) + ml;
    await fetch(`/api/daily/${today}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "water", waterMlDone: newAmount }),
    });
    setRecord((r) => (r ? { ...r, waterMlDone: newAmount } : null));
  }

  const dateLabel = format(new Date(), "EEEE, d MMMM");
  const meals = record?.items.filter((i) => i.type === "meal") ?? [];
  const exercises = record?.items.filter((i) => i.type === "exercise") ?? [];
  const completedCount = record?.items.filter((i) => i.completed).length ?? 0;
  const totalCount = record?.items.length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <Header
        title="Today"
        subtitle={dateLabel}
        right={
          record && totalCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} done
            </span>
          ) : undefined
        }
      />

      <div className="px-4 flex flex-col gap-4">
        {!record ? (
          <Card className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-3">
              No plan for today yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Complete your onboarding to get your first plan.
            </p>
          </Card>
        ) : (
          <>
            {/* Progress ring */}
            {totalCount > 0 && (
              <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" strokeWidth="5" stroke="#e5e7eb" fill="none" />
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      strokeWidth="5"
                      stroke="#22c55e"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - completedCount / totalCount)}`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {Math.round((completedCount / totalCount) * 100)}%
                  </span>
                </div>
                <div>
                  <p className="font-semibold">Today&apos;s progress</p>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} of {totalCount} tasks complete
                  </p>
                </div>
              </div>
            )}

            {/* Meals */}
            {meals.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Meals
                </h2>
                {meals.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={handleToggle} />
                ))}
              </div>
            )}

            {/* Workout */}
            {exercises.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Workout
                </h2>
                {exercises.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={handleToggle} />
                ))}
              </div>
            )}

            {/* Water */}
            <WaterTracker
              done={record.waterMlDone}
              target={record.waterMlTarget}
              onAdd={handleAddWater}
            />
          </>
        )}
      </div>
    </div>
  );
}
