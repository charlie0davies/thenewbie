"use client";

import { useEffect, useState, useRef } from "react";
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
import type { WeightEntry, MeasurementEntry, PhotoEntry } from "@/lib/db/progress";
import { format, parseISO } from "date-fns";

type Tab = "weight" | "nutrition" | "strength" | "body" | "projections";

const TABS: { id: Tab; label: string }[] = [
  { id: "weight", label: "Weight" },
  { id: "nutrition", label: "Nutrition" },
  { id: "strength", label: "Strength" },
  { id: "body", label: "Body" },
  { id: "projections", label: "Goals" },
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

  const chartData = weights.map((w, i) => {
    const windowStart = Math.max(0, i - 6);
    const window7 = weights.slice(windowStart, i + 1);
    const avg = window7.reduce((s, x) => s + x.weightKg, 0) / window7.length;
    const raw = w.weightKg;
    return {
      date: format(parseISO(w.date), "d MMM"),
      weight: unit === "kg" ? raw : parseFloat((raw / 6.35029).toFixed(2)),
      avg: unit === "kg" ? parseFloat(avg.toFixed(2)) : parseFloat((avg / 6.35029).toFixed(2)),
    };
  });

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
      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Log today&apos;s weight</p>
          <p className="text-xs text-muted-foreground mt-0.5">Track your progress over time</p>
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          <button
            onClick={() => setUnit("kg")}
            className={cn("px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              unit === "kg" ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
          >kg</button>
          <button
            onClick={() => setUnit("st")}
            className={cn("px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              unit === "st" ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
          >st · lbs</button>
        </div>

        <div className="flex gap-2 items-end">
          {unit === "kg" ? (
            <Input type="number" inputMode="decimal" placeholder="74.5" value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)} className="flex-1" />
          ) : (
            <div className="flex gap-2 flex-1">
              <div className="flex flex-col gap-1 flex-1">
                <p className="text-xs text-muted-foreground">Stones</p>
                <Input type="number" inputMode="numeric" placeholder="11" value={stoneInput}
                  onChange={(e) => setStoneInput(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <p className="text-xs text-muted-foreground">Pounds</p>
                <Input type="number" inputMode="numeric" placeholder="5" value={lbsInput}
                  onChange={(e) => setLbsInput(e.target.value)} />
              </div>
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
              <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 4 }} activeDot={{ r: 6 }} name="Actual" />
              {chartData.length >= 3 && <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="7-day avg" />}
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
  const [exercises, setExercises] = useState<Record<string, { date: string; maxWeightKg: number; totalVolumeKg: number }[]>>({});
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

  const selectedHistory = exercises[selected] || [];
  const chartData = selectedHistory.map((e) => ({
    date: format(parseISO(e.date), "d MMM"),
    weight: e.maxWeightKg,
    volume: e.totalVolumeKg,
  }));

  // Epley 1RM: weight × (1 + reps/30) — approximate from best set
  const bestEntry = selectedHistory.reduce<{ date: string; maxWeightKg: number; totalVolumeKg: number } | null>(
    (best, e) => (!best || e.maxWeightKg > best.maxWeightKg ? e : best), null
  );
  const estimated1RM = bestEntry ? Math.round(bestEntry.maxWeightKg * (1 + 8 / 30)) : null;

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

      {estimated1RM !== null && (
        <div className="flex gap-3">
          <Card className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Est. 1RM</p>
            <p className="text-2xl font-bold text-primary">{estimated1RM} kg</p>
            <p className="text-[10px] text-muted-foreground">Epley formula</p>
          </Card>
          <Card className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Best set</p>
            <p className="text-2xl font-bold">{bestEntry?.maxWeightKg} kg</p>
            <p className="text-[10px] text-muted-foreground">{bestEntry ? format(parseISO(bestEntry.date), "d MMM") : ""}</p>
          </Card>
        </div>
      )}

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

// ─── Measurements tab ─────────────────────────────────────────────────────────

type MKey = "waistCm" | "neckCm" | "chestCm" | "hipsCm" | "armCm" | "thighCm";

const M_FIELDS: { key: MKey; label: string }[] = [
  { key: "waistCm", label: "Waist" },
  { key: "neckCm", label: "Neck" },
  { key: "chestCm", label: "Chest" },
  { key: "hipsCm", label: "Hips" },
  { key: "armCm", label: "Arm" },
  { key: "thighCm", label: "Thigh" },
];

function calcBodyFat(m: MeasurementEntry, heightCm: number, gender: string): number | null {
  const { waistCm, neckCm, hipsCm } = m;
  if (!waistCm || !neckCm || !heightCm || waistCm <= neckCm) return null;
  let val: number;
  if (gender === "female") {
    if (!hipsCm || waistCm + hipsCm <= neckCm) return null;
    val = 163.205 * Math.log10(waistCm + hipsCm - neckCm) - 97.684 * Math.log10(heightCm) - 78.387;
    return Math.round(Math.max(10, Math.min(60, val)) * 10) / 10;
  }
  val = 86.010 * Math.log10(waistCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76;
  return Math.round(Math.max(3, Math.min(60, val)) * 10) / 10;
}

function MeasurementsTab() {
  const [history, setHistory] = useState<MeasurementEntry[]>([]);
  const [user, setUser] = useState<{ heightCm: number; gender: string; weightKg: number } | null>(null);
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [form, setForm] = useState<Record<MKey, string>>({
    waistCm: "", neckCm: "", chestCm: "", hipsCm: "", armCm: "", thighCm: "",
  });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<MKey>("waistCm");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/progress?type=measurement").then((r) => r.json()),
    ]).then(([u, m]) => {
      setUser(u);
      setHistory(Array.isArray(m) ? m.reverse() : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function toStoreCm(val: string): number | undefined {
    const n = parseFloat(val);
    if (!n) return undefined;
    return unit === "in" ? Math.round(n * 2.54 * 10) / 10 : n;
  }

  function toDisplay(cm: number): string {
    return unit === "in" ? (cm / 2.54).toFixed(1) : cm.toFixed(1);
  }

  const dispUnit = unit === "cm" ? "cm" : '"';

  async function handleLog() {
    const measurements: Partial<Record<MKey, number>> = {};
    for (const { key } of M_FIELDS) {
      const v = toStoreCm(form[key]);
      if (v) measurements[key] = v;
    }
    if (!Object.keys(measurements).length) return;
    setSaving(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "measurement", ...measurements }),
    });
    const entry: MeasurementEntry = {
      userId: "", sortKey: `MEASUREMENT#${new Date().toISOString()}`,
      type: "measurement", date: new Date().toISOString().slice(0, 10),
      ...measurements,
    };
    setHistory((prev) => [...prev, entry]);
    setForm({ waistCm: "", neckCm: "", chestCm: "", hipsCm: "", armCm: "", thighCm: "" });
    setSaving(false);
  }

  const hasAny = Object.values(form).some((v) => !!v);
  const latest = history[history.length - 1];
  const prev = history[history.length - 2];

  const bodyFat = latest && user ? calcBodyFat(latest, user.heightCm, user.gender) : null;
  const prevBodyFat = prev && user ? calcBodyFat(prev, user.heightCm, user.gender) : null;
  const fatMassKg = bodyFat !== null && user ? Math.round(user.weightKg * bodyFat / 100 * 10) / 10 : null;
  const leanMassKg = fatMassKg !== null && user ? Math.round((user.weightKg - fatMassKg) * 10) / 10 : null;

  const loggedKeys = M_FIELDS.filter((f) => history.some((h) => h[f.key] !== undefined));
  const chartData = history
    .map((h) => {
      const raw = h[selected];
      return {
        date: format(parseISO(h.date), "d MMM"),
        value: raw !== undefined ? (unit === "in" ? Math.round((raw / 2.54) * 10) / 10 : raw) : null,
      };
    })
    .filter((d) => d.value !== null);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Log form */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Log measurements</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in whichever you have</p>
          </div>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(["cm", "in"] as const).map((u) => (
              <button key={u} onClick={() => setUnit(u)}
                className={cn("px-3 py-1 rounded text-xs font-semibold transition-all",
                  unit === u ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
              >{u}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {M_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">{label} ({dispUnit})</p>
              <Input type="number" inputMode="decimal" placeholder="—"
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <Button onClick={handleLog} loading={saving} disabled={!hasAny} size="md" className="w-full">
          Log measurements
        </Button>
      </Card>

      {/* Body composition */}
      {bodyFat !== null && fatMassKg !== null && leanMassKg !== null && (
        <Card className="flex flex-col gap-3">
          <CardHeader><CardTitle>Body composition</CardTitle></CardHeader>
          <div className="flex gap-2">
            <div className="flex-1 text-center bg-orange-50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Body fat</p>
              <p className="text-xl font-bold text-primary">{bodyFat}%</p>
              {prevBodyFat !== null && (
                <p className={cn("text-[10px] mt-0.5", bodyFat < prevBodyFat ? "text-green-600" : "text-destructive")}>
                  {bodyFat < prevBodyFat ? "▼" : "▲"} {Math.abs(bodyFat - prevBodyFat).toFixed(1)}%
                </p>
              )}
            </div>
            <div className="flex-1 text-center bg-red-50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Fat mass</p>
              <p className="text-xl font-bold">{fatMassKg} kg</p>
            </div>
            <div className="flex-1 text-center bg-green-50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Lean mass</p>
              <p className="text-xl font-bold text-green-600">{leanMassKg} kg</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Fat {bodyFat}%</span>
              <span>Muscle {(100 - bodyFat).toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-orange-300 rounded-full transition-all"
                style={{ width: `${Math.min(bodyFat, 100)}%` }} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Estimated via US Navy method. For reference only.</p>
        </Card>
      )}

      {/* Latest snapshot */}
      {latest && (
        <Card className="flex flex-col gap-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Latest snapshot</CardTitle>
              <span className="text-[10px] text-muted-foreground">{format(parseISO(latest.date), "d MMM yyyy")}</span>
            </div>
          </CardHeader>
          <div className="grid grid-cols-3 gap-2">
            {M_FIELDS.map(({ key, label }) => {
              const val = latest[key];
              if (val === undefined) return null;
              const prevVal = prev?.[key];
              const diff = prevVal !== undefined ? val - prevVal : null;
              return (
                <div key={key} className="text-center bg-muted rounded-xl p-2">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="font-bold text-sm">{toDisplay(val)}{dispUnit}</p>
                  {diff !== null && (
                    <p className={cn("text-[10px]", diff < 0 ? "text-green-600" : diff > 0 ? "text-destructive" : "text-muted-foreground")}>
                      {diff > 0 ? "+" : ""}{unit === "in" ? (diff / 2.54).toFixed(1) : diff.toFixed(1)}{dispUnit}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Chart */}
      {loggedKeys.length > 0 && history.length > 1 && (
        <Card className="flex flex-col gap-3">
          <CardHeader><CardTitle>Over time</CardTitle></CardHeader>
          <div className="flex flex-wrap gap-2">
            {loggedKeys.map(({ key, label }) => (
              <button key={key} onClick={() => setSelected(key)}
                className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                  selected === key ? "bg-primary border-primary text-white" : "bg-white border-border text-muted-foreground"
                )}
              >{label}</button>
            ))}
          </div>
          {chartData.length > 1 && (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={40} unit={dispUnit} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}${dispUnit}`, M_FIELDS.find((f) => f.key === selected)?.label]} />
                <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2}
                  dot={{ fill: "#f97316", r: 4 }} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      {!latest && (
        <Card className="text-center py-8">
          <p className="text-muted-foreground text-sm">Log your first measurements to start tracking body composition.</p>
        </Card>
      )}

      <PhotosSection />
    </div>
  );
}

// ─── Photos section ───────────────────────────────────────────────────────────

function PhotosSection() {
  const [photos, setPhotos] = useState<(PhotoEntry & { url?: string })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState<[number, number] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/progress/photos")
      .then((r) => r.json())
      .then((data) => setPhotos(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch("/api/progress/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      const { uploadUrl } = await res.json();
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const updated = await fetch("/api/progress/photos").then((r) => r.json());
      setPhotos(Array.isArray(updated) ? updated : []);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Progress photos</CardTitle>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium text-primary bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100"
          >
            {uploading ? "Uploading…" : "+ Add photo"}
          </button>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </div>
      </CardHeader>

      {photos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Add your first photo to start tracking visual progress.</p>
      ) : (
        <>
          {compare !== null && (
            <div className="flex gap-2">
              {compare.map((idx) => (
                photos[idx]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={idx} src={photos[idx].url} alt="comparison" className="flex-1 rounded-xl object-cover h-48" />
                )
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              p.url && (
                <button key={p.sortKey} onClick={() => {
                  if (compare === null) setCompare([i, i]);
                  else if (compare[0] === i) setCompare(null);
                  else setCompare([compare[0], i]);
                }} className={cn("relative rounded-xl overflow-hidden aspect-square border-2 transition-all",
                  compare && compare.includes(i) ? "border-primary" : "border-transparent"
                )}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.date} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 left-0 right-0 text-[9px] bg-black/40 text-white text-center py-0.5">
                    {format(parseISO(p.date), "d MMM")}
                  </span>
                </button>
              )
            ))}
          </div>
          {photos.length >= 2 && compare === null && (
            <p className="text-[10px] text-muted-foreground text-center">Tap two photos to compare side by side</p>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Projections tab ──────────────────────────────────────────────────────────

function ProjectionsTab() {
  const [user, setUser] = useState<{ weightKg: number; targetWeightKg?: number; goal: string; workoutDays: number[] } | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [projUnit, setProjUnit] = useState<"kg" | "st">("kg");

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

  const weeklyChangeKg =
    user.goal === "lose_weight" ? -0.37 :
    user.goal === "build_muscle" ? 0.15 : 0;

  // Round to 2dp to eliminate floating-point noise (e.g. 72.59999999)
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const projections = [4, 8, 12].map((weeks) => ({
    weeks,
    weight: round2(Math.max(30, currentWeight + weeklyChangeKg * weeks)),
  }));

  const weeksToGoal =
    target && weeklyChangeKg !== 0
      ? Math.abs((target - currentWeight) / weeklyChangeKg)
      : null;

  const totalCalsBurned = weeklyWorkouts * 52 * 300;

  function toDisplayUnit(kg: number): number {
    return projUnit === "kg" ? round2(kg) : round2(kg / 6.35029);
  }

  function displayW(kg: number): string {
    return projUnit === "kg" ? formatWeight(kg) : formatWeightSt(kg);
  }

  const chartYUnit = projUnit === "kg" ? "kg" : "st";
  const chartData = [
    { label: "Now", weight: toDisplayUnit(currentWeight) },
    ...projections.map((p) => ({ label: `${p.weeks}w`, weight: toDisplayUnit(p.weight) })),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Projections chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target size={16} className="text-primary" /> Weight projections
            </CardTitle>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setProjUnit("kg")}
                className={cn("px-2.5 py-1 rounded text-xs font-semibold transition-all",
                  projUnit === "kg" ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
              >kg</button>
              <button
                onClick={() => setProjUnit("st")}
                className={cn("px-2.5 py-1 rounded text-xs font-semibold transition-all",
                  projUnit === "st" ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
              >st</button>
            </div>
          </div>
        </CardHeader>
        {weeklyChangeKg !== 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  axisLine={false} tickLine={false} width={40}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  unit={chartYUnit}
                />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => {
                    const n = typeof v === "number" ? v : Number(v);
                    const kg = projUnit === "kg" ? n : n * 6.35029;
                    return [displayW(kg), "Weight"];
                  }}
                />
                <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: "#f97316", r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-2 mt-3">
              {projections.map((p) => (
                <div key={p.weeks} className="flex-1 text-center bg-muted rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">{p.weeks} weeks</p>
                  <p className="font-bold text-sm">{displayW(p.weight)}</p>
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
          <p className="text-xs text-muted-foreground mb-1">Estimated time to reach {displayW(target)}</p>
          <p className="text-3xl font-bold text-primary">{Math.ceil(weeksToGoal)}</p>
          <p className="text-xs text-muted-foreground">weeks at current pace</p>
        </Card>
      )}

      {/* Stats */}
      <div className="flex gap-3">
        <Card className="flex-1 text-center">
          <p className="text-xs text-muted-foreground mb-1">Weekly change</p>
          <p className="text-xl font-bold">
            {projUnit === "kg"
              ? `${weeklyChangeKg > 0 ? "+" : ""}${weeklyChangeKg.toFixed(2)} kg`
              : `${(weeklyChangeKg * 2.20462) > 0 ? "+" : ""}${(weeklyChangeKg * 2.20462).toFixed(1)} lb`}
          </p>
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
      <div className="grid grid-cols-5 gap-1 px-4 pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "py-2 rounded-xl text-[10px] font-medium border transition-all",
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
        {tab === "body" && <MeasurementsTab />}
        {tab === "projections" && <ProjectionsTab />}
      </div>
    </div>
  );
}
