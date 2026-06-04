"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn, formatWeight, formatWeightSt, stoneLbsToKg, formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Scale, Flame, Dumbbell, Target } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { WeightEntry } from "@/lib/db/progress";
import { format, parseISO } from "date-fns";

type Tab = "weight" | "nutrition" | "strength" | "projections";

const TABS: { id: Tab; label: string }[] = [
  { id: "weight", label: "Weight" },
  { id: "nutrition", label: "Nutrition" },
  { id: "strength", label: "Strength" },
  { id: "projections", label: "Projections" },
];

// ─── Weight tab ───────────────────────────────────────────────────────────────

function WeightTab() {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [unit, setUnit] = useState<"kg" | "st">("kg");
  const [newWeight, setNewWeight] = useState("");
  const [stoneInput, setStoneInput] = useState("");
  const [lbsInput, setLbsInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/progress?type=weight")
      .then((r) => r.json())
      .then((d: WeightEntry[]) => setWeights(Array.isArray(d) ? d.reverse() : []));
  }, []);

  async function handleLog() {
    const weightKg =
      unit === "kg"
        ? Number(newWeight)
        : stoneLbsToKg(Number(stoneInput), Number(lbsInput || 0));
    if (!weightKg) return;
    setSaving(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "weight", weightKg }),
    });
    const entry: WeightEntry = {
      userId: "", sortKey: `WEIGHT#${new Date().toISOString()}`,
      type: "weight", date: new Date().toISOString().slice(0, 10), weightKg,
    };
    setWeights((p) => [...p, entry]);
    setNewWeight("");
    setStoneInput("");
    setLbsInput("");
    setSaving(false);
  }

  const canLog = unit === "kg" ? !!newWeight : !!stoneInput;
  const latest = weights[weights.length - 1];
  const previous = weights[weights.length - 2];
  const diff = latest && previous ? latest.weightKg - previous.weightKg : null;

  const chartData = weights.map((w) => ({
    date: format(parseISO(w.date), "d MMM"),
    weight: unit === "kg" ? w.weightKg : parseFloat((w.weightKg / 6.35029).toFixed(2)),
  }));

  const chartUnit = unit === "kg" ? "kg" : "st";

  function displayWeight(kg: number) {
    return unit === "kg" ? formatWeight(kg) : formatWeightSt(kg);
  }

  function displayDiff(diffKg: number) {
    if (unit === "kg") return `${diffKg > 0 ? "+" : ""}${diffKg.toFixed(1)} kg`;
    const diffLbs = diffKg * 2.20462;
    return `${diffLbs > 0 ? "+" : ""}${diffLbs.toFixed(1)} lb`;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Log today&apos;s weight</CardTitle>
            <div className="flex gap-1">
              <button
                onClick={() => setUnit("kg")}
                className={cn("px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                  unit === "kg" ? "bg-primary border-primary text-white" : "border-border text-muted-foreground")}
              >kg</button>
              <button
                onClick={() => setUnit("st")}
                className={cn("px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                  unit === "st" ? "bg-primary border-primary text-white" : "border-border text-muted-foreground")}
              >st·lbs</button>
            </div>
          </div>
        </CardHeader>
        <div className="flex gap-3">
          {unit === "kg" ? (
            <Input type="number" inputMode="decimal" placeholder="e.g. 74.5" value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)} hint="kg" className="flex-1" />
          ) : (
            <div className="flex gap-2 flex-1">
              <Input type="number" inputMode="numeric" placeholder="11" value={stoneInput}
                onChange={(e) => setStoneInput(e.target.value)} hint="st" className="flex-1" />
              <Input type="number" inputMode="numeric" placeholder="5" value={lbsInput}
                onChange={(e) => setLbsInput(e.target.value)} hint="lb" className="flex-1" />
            </div>
          )}
          <Button onClick={handleLog} loading={saving} disabled={!canLog} size="md" className="shrink-0">Log</Button>
        </div>
      </Card>

      {latest && (
        <div className="flex gap-3">
          <Card className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1 mb-1"><Scale size={14} className="text-primary" /><span className="text-xs text-muted-foreground">Current</span></div>
            <p className="text-2xl font-bold">{displayWeight(latest.weightKg)}</p>
          </Card>
          {diff !== null && (
            <Card className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {diff < 0 ? <TrendingDown size={14} className="text-green-500" /> : diff > 0 ? <TrendingUp size={14} className="text-destructive" /> : <Minus size={14} />}
                <span className="text-xs text-muted-foreground">Change</span>
              </div>
              <p className={cn("text-2xl font-bold", diff < 0 ? "text-green-500" : diff > 0 ? "text-destructive" : "")}>
                {displayDiff(diff)}
              </p>
            </Card>
          )}
        </div>
      )}

      {chartData.length > 1 ? (
        <Card>
          <CardHeader><CardTitle>Weight over time</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} unit={chartUnit} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v} ${chartUnit}`, "Weight"]} />
              <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      ) : (
        <Card className="text-center py-6"><p className="text-muted-foreground text-sm">Log at least 2 weights to see your chart.</p></Card>
      )}
    </div>
  );
}

// ─── Nutrition tab ────────────────────────────────────────────────────────────

interface NutritionDay { date: string; calories: number; proteinG: number; carbsG: number; fatG: number; }

function NutritionTab() {
  const [data, setData] = useState<NutritionDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress/summary")
      .then((r) => r.json())
      .then((d) => { setData(d.nutrition || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!data.length) return (
    <Card className="text-center py-8">
      <Flame size={32} className="text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">Tick off meals on your Today page to start tracking nutrition.</p>
    </Card>
  );

  const chartData = data.map((d) => ({ date: format(parseISO(d.date), "d MMM"), calories: d.calories, protein: d.proteinG, carbs: d.carbsG, fat: d.fatG }));
  const avgCals = Math.round(data.reduce((s, d) => s + d.calories, 0) / data.length);

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <p className="text-xs text-muted-foreground mb-1">Avg daily calories (logged)</p>
        <p className="text-3xl font-bold text-primary">{avgCals}</p>
        <p className="text-xs text-muted-foreground mt-0.5">kcal</p>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily calories</CardTitle></CardHeader>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="calories" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardHeader><CardTitle>Macros over time</CardTitle></CardHeader>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="protein" stroke="#22c55e" strokeWidth={2} dot={false} name="Protein (g)" />
            <Line type="monotone" dataKey="carbs" stroke="#f59e0b" strokeWidth={2} dot={false} name="Carbs (g)" />
            <Line type="monotone" dataKey="fat" stroke="#3b82f6" strokeWidth={2} dot={false} name="Fat (g)" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── Strength tab ─────────────────────────────────────────────────────────────

function StrengthTab() {
  const [exercises, setExercises] = useState<Record<string, { date: string; maxWeightKg: number }[]>>({});
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress/summary")
      .then((r) => r.json())
      .then((d) => {
        setExercises(d.exercises || {});
        const keys = Object.keys(d.exercises || {});
        if (keys.length) setSelected(keys[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const exerciseNames = Object.keys(exercises);
  if (!exerciseNames.length) return (
    <Card className="text-center py-8">
      <Dumbbell size={32} className="text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">Log sets on the Workout page to track your strength progress.</p>
    </Card>
  );

  const chartData = (exercises[selected] || []).map((e) => ({
    date: format(parseISO(e.date), "d MMM"),
    weight: e.maxWeightKg,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {exerciseNames.map((name) => (
          <button key={name} onClick={() => setSelected(name)}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
              selected === name ? "bg-primary border-primary text-white" : "bg-white border-border text-muted-foreground"
            )}
          >{name}</button>
        ))}
      </div>

      {chartData.length > 1 ? (
        <Card>
          <CardHeader><CardTitle>{selected} — max weight</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={35} unit="kg" />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      ) : (
        <Card className="text-center py-6"><p className="text-muted-foreground text-sm">Log at least 2 sessions to see a chart.</p></Card>
      )}
    </div>
  );
}

// ─── Projections tab ──────────────────────────────────────────────────────────

function ProjectionsTab() {
  const [user, setUser] = useState<{ weightKg: number; targetWeightKg?: number; goal: string; workoutDays: number[] } | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/progress?type=weight").then((r) => r.json()),
    ]).then(([u, w]) => {
      setUser(u);
      setWeights(Array.isArray(w) ? w.reverse() : []);
    });
  }, []);

  if (!user) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const currentWeight = weights.length ? weights[weights.length - 1].weightKg : user.weightKg;
  const target = user.targetWeightKg;
  const weeklyWorkouts = user.workoutDays?.length || 3;

  // Simple projection: ~400 kcal deficit/surplus → ~0.37 kg/week
  const weeklyChangeKg =
    user.goal === "lose_weight" ? -0.37 :
    user.goal === "build_muscle" ? 0.15 : 0;

  const projections = [4, 8, 12].map((weeks) => ({
    weeks,
    weight: Math.max(30, currentWeight + weeklyChangeKg * weeks),
  }));

  const weeksToGoal =
    target && weeklyChangeKg !== 0
      ? Math.abs((target - currentWeight) / weeklyChangeKg)
      : null;

  const totalCalsBurned = weeklyWorkouts * 52 * 300; // ~300 kcal per session estimate

  return (
    <div className="flex flex-col gap-4">
      {/* Projections chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target size={16} className="text-primary" /> Weight projections</CardTitle>
        </CardHeader>
        {weeklyChangeKg !== 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={[{ label: "Now", weight: currentWeight }, ...projections.map((p) => ({ label: `${p.weeks}w`, weight: p.weight }))]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={35} unit="kg" />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: "#f97316", r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-2 mt-3">
              {projections.map((p) => (
                <div key={p.weeks} className="flex-1 text-center bg-muted rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">{p.weeks} weeks</p>
                  <p className="font-bold text-sm">{p.weight.toFixed(1)} kg</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Projections available for weight loss and muscle building goals.</p>
        )}
      </Card>

      {/* Target */}
      {target && weeksToGoal && (
        <Card className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Estimated time to reach {formatWeight(target)}</p>
          <p className="text-3xl font-bold text-primary">{Math.ceil(weeksToGoal)}</p>
          <p className="text-xs text-muted-foreground">weeks at current pace</p>
        </Card>
      )}

      {/* Stats */}
      <div className="flex gap-3">
        <Card className="flex-1 text-center">
          <p className="text-xs text-muted-foreground mb-1">Weekly change</p>
          <p className="text-xl font-bold">{weeklyChangeKg > 0 ? "+" : ""}{weeklyChangeKg.toFixed(2)} kg</p>
        </Card>
        <Card className="flex-1 text-center">
          <p className="text-xs text-muted-foreground mb-1">Annual cal burn</p>
          <p className="text-xl font-bold">{(totalCalsBurned / 1000).toFixed(0)}k</p>
          <p className="text-xs text-muted-foreground">kcal (est.)</p>
        </Card>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [tab, setTab] = useState<Tab>("weight");

  return (
    <div>
      <Header title="Progress" />

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 px-4 pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "py-2 rounded-xl text-xs font-medium border transition-all",
              tab === t.id ? "bg-primary border-primary text-white" : "bg-white border-border text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {tab === "weight" && <WeightTab />}
        {tab === "nutrition" && <NutritionTab />}
        {tab === "strength" && <StrengthTab />}
        {tab === "projections" && <ProjectionsTab />}
      </div>
    </div>
  );
}
