"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn, formatCurrency } from "@/lib/utils";
import { CheckCircle2, Circle, ShoppingCart, ExternalLink } from "lucide-react";
import type { ShoppingList, ShoppingListItem } from "@/lib/db/shopping";

const STORE_KEYS: { key: keyof ShoppingListItem; label: string; color: string }[] = [
  { key: "tescoUrl", label: "Tesco", color: "text-blue-400" },
  { key: "asdaUrl", label: "Asda", color: "text-green-400" },
  { key: "morrisonsUrl", label: "Morrisons", color: "text-amber-400" },
  { key: "waitroseUrl", label: "Waitrose", color: "text-emerald-400" },
];

const CATEGORIES = ["Proteins", "Dairy", "Produce", "Grains", "Condiments", "Supplements"];

function ShoppingItem({
  item,
  onToggle,
}: {
  item: ShoppingListItem;
  onToggle: (id: string, bought: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("rounded-xl border transition-all", item.bought ? "opacity-60 border-border" : "border-border bg-muted")}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id, !item.bought);
          }}
        >
          {item.bought ? (
            <CheckCircle2 size={22} className="text-primary" />
          ) : (
            <Circle size={22} className="text-muted-foreground" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", item.bought && "line-through text-muted-foreground")}>
            {item.name}
          </p>
          <p className="text-xs text-muted-foreground">{item.quantity}</p>
        </div>
        <span className="text-xs text-accent shrink-0">
          {formatCurrency(item.estimatedCostGbp)}
        </span>
      </div>

      {open && (
        <div className="px-3 pb-3 border-t border-border flex flex-wrap gap-2 pt-2">
          {STORE_KEYS.filter((s) => item[s.key]).map(({ key, label, color }) => (
            <a
              key={key}
              href={item[key] as string}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-background border border-border",
                color
              )}
            >
              {label} <ExternalLink size={10} />
            </a>
          ))}
          {item.buyByDate && (
            <span className="text-xs text-muted-foreground px-2 py-1">
              Buy by: {item.buyByDate}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShoppingPage() {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shopping")
      .then((r) => r.json())
      .then((data) => {
        setList(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleToggle(itemId: string, bought: boolean) {
    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, bought }),
    });
    setList((l) =>
      l
        ? {
            ...l,
            items: l.items.map((i) => (i.id === itemId ? { ...i, bought } : i)),
          }
        : null
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = list?.items ?? [];
  const categories = CATEGORIES.filter((c) => items.some((i) => i.category === c));
  const filtered = activeCategory
    ? items.filter((i) => i.category === activeCategory)
    : items;
  const boughtCount = items.filter((i) => i.bought).length;
  const remaining = items.filter((i) => !i.bought);
  const remainingCost = remaining.reduce((s, i) => s + i.estimatedCostGbp, 0);

  return (
    <div>
      <Header title="Shopping" subtitle="Your weekly list" />

      <div className="px-4 flex flex-col gap-4">
        {!list ? (
          <Card className="text-center py-8">
            <ShoppingCart size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Complete onboarding to get your shopping list.
            </p>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <div className="flex gap-3">
              <Card className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Items left</p>
                <p className="text-2xl font-bold">{items.length - boughtCount}</p>
              </Card>
              <Card className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Est. cost left</p>
                <p className="text-2xl font-bold text-accent">
                  {formatCurrency(remainingCost)}
                </p>
              </Card>
              <Card className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total est.</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(list.totalEstimatedCostGbp)}
                </p>
              </Card>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(boughtCount / items.length) * 100}%` }}
              />
            </div>

            {/* Category filter */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all",
                    !activeCategory
                      ? "bg-primary border-primary text-white"
                      : "bg-muted border-border text-muted-foreground"
                  )}
                >
                  All ({items.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all",
                      activeCategory === cat
                        ? "bg-primary border-primary text-white"
                        : "bg-muted border-border text-muted-foreground"
                    )}
                  >
                    {cat} ({items.filter((i) => i.category === cat).length})
                  </button>
                ))}
              </div>
            )}

            {/* Items */}
            <div className="flex flex-col gap-2">
              {filtered.map((item) => (
                <ShoppingItem key={item.id} item={item} onToggle={handleToggle} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
