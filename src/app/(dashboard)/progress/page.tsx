"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { TrendingUp, TrendingDown, Minus, Scale } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeightEntry } from "@/lib/db/progress";
import { formatWeight } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function ProgressPage() {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/progress?type=weight")
      .then((r) => r.json())
      .then((data: WeightEntry[]) => {
        setWeights(Array.isArray(data) ? data.reverse() : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogWeight() {
    if (!newWeight) return;
    setSaving(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "weight",
        weightKg: Number(newWeight),
      }),
    });
    const entry: WeightEntry = {
      userId: "",
      sortKey: `WEIGHT#${new Date().toISOString()}`,
      type: "weight",
      date: new Date().toISOString().slice(0, 10),
      weightKg: Number(newWeight),
    };
    setWeights((prev) => [...prev, entry]);
    setNewWeight("");
    setSaving(false);
  }

  const chartData = weights.map((w) => ({
    date: format(parseISO(w.date), "d MMM"),
    weight: w.weightKg,
  }));

  const latest = weights[weights.length - 1];
  const previous = weights[weights.length - 2];
  const diff = latest && previous ? latest.weightKg - previous.weightKg : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Progress" subtitle="Track your body weight" />

      <div className="px-4 flex flex-col gap-4">
        {/* Log weight */}
        <Card>
          <CardHeader>
            <CardTitle>Log today&apos;s weight</CardTitle>
          </CardHeader>
          <div className="flex gap-3">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 74.5"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              hint="kg"
              className="flex-1"
            />
            <Button
              onClick={handleLogWeight}
              loading={saving}
              disabled={!newWeight}
              size="md"
              className="shrink-0"
            >
              Log
            </Button>
          </div>
        </Card>

        {/* Stats */}
        {latest && (
          <div className="flex gap-3">
            <Card className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Scale size={14} className="text-primary" />
                <span className="text-xs text-muted-foreground">Current</span>
              </div>
              <p className="text-2xl font-bold">{formatWeight(latest.weightKg)}</p>
            </Card>
            {diff !== null && (
              <Card className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {diff < 0 ? (
                    <TrendingDown size={14} className="text-primary" />
                  ) : diff > 0 ? (
                    <TrendingUp size={14} className="text-destructive" />
                  ) : (
                    <Minus size={14} className="text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">Change</span>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    diff < 0 ? "text-primary" : diff > 0 ? "text-destructive" : ""
                  }`}
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(1)} kg
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Chart */}
        {chartData.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>Weight over time</CardTitle>
            </CardHeader>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #222",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#fafafa" }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card className="text-center py-6">
            <p className="text-muted-foreground text-sm">
              Log at least 2 weights to see your chart.
            </p>
          </Card>
        )}

        {/* History */}
        {weights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-2">
              {[...weights].reverse().slice(0, 10).map((w, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {format(parseISO(w.date), "d MMM yyyy")}
                  </span>
                  <span className="font-medium">{formatWeight(w.weightKg)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
