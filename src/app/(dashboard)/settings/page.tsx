"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { LogOut, RotateCcw, Trash2, ChevronRight, User, Shield, Crown, Check } from "lucide-react";
import type { UserProfile } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [upgradingBilling, setUpgradingBilling] = useState(false);
  const [justUpgraded, setJustUpgraded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setJustUpgraded(params.get("upgraded") === "1");
  }, []);

  useEffect(() => {
    fetch("/api/user").then((r) => r.json()).then(setUser).catch(() => {});
  }, []);

  async function handleUpgrade() {
    setUpgradingBilling(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setUpgradingBilling(false);
  }

  async function handleManageBilling() {
    setUpgradingBilling(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setUpgradingBilling(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/login");
  }

  async function handleResetOnboarding() {
    setResetting(true);
    setError("");
    try {
      const res = await fetch("/api/user/reset", { method: "DELETE" });
      if (!res.ok) throw new Error("Reset failed");
      setShowResetConfirm(false);
      router.push("/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  async function handleDeleteAccount() {
    setResetting(true);
    setError("");
    try {
      const res = await fetch("/api/user/reset?deleteAccount=1", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await signOut();
      router.push("/signup");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <Header title="Account" subtitle="Manage your account and plan" />
      <div className="px-4 flex flex-col gap-4">

        {/* Premium / plan */}
        {justUpgraded && (
          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Check size={16} className="text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-700">Welcome to Premium! Your account has been upgraded.</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown size={16} className="text-primary" /> Plan
            </CardTitle>
          </CardHeader>
          {user?.plan === "premium" ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-full">Premium</span>
                <span className="text-sm text-muted-foreground">50 AI coach messages/month</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleManageBilling} loading={upgradingBilling}>
                Manage billing
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs font-bold rounded-full">Free</span>
                <span className="text-sm text-muted-foreground">5 AI coach messages/month</span>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex flex-col gap-2">
                <p className="text-xs font-semibold">Premium includes:</p>
                {["50 coach messages/month", "Progress photo storage", "Advanced body composition tracking", "Priority support"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Check size={12} className="text-primary shrink-0" />
                    <p className="text-xs">{f}</p>
                  </div>
                ))}
              </div>
              <Button size="md" onClick={handleUpgrade} loading={upgradingBilling} className="w-full">
                Upgrade to Premium — £6.99/month
              </Button>
            </div>
          )}
        </Card>

        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={16} className="text-primary" /> Account
            </CardTitle>
          </CardHeader>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-between w-full py-2.5 text-sm hover:text-primary transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut size={16} className="text-muted-foreground" />
              <span>Sign out</span>
            </div>
            {signingOut ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground" />
            )}
          </button>
        </Card>

        {/* Danger zone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={16} className="text-destructive" /> Danger zone
            </CardTitle>
          </CardHeader>

          {/* Reset onboarding */}
          <div className="flex flex-col gap-1 py-1 border-b border-border pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reset onboarding</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clears your plan and lets you start the setup again
                </p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="shrink-0 ml-4 p-2 rounded-xl hover:bg-orange-50 text-primary transition-colors"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {showResetConfirm && (
              <div className="mt-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-sm font-medium mb-3">
                  This will delete your workout plan, meal plan, and shopping list. Your weight logs will be kept.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleResetOnboarding}
                    loading={resetting}
                    className="flex-1"
                  >
                    Yes, reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Delete account */}
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Delete account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes your account and all data
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="shrink-0 ml-4 p-2 rounded-xl hover:bg-red-50 text-destructive transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {showDeleteConfirm && (
              <div className="mt-3 p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-medium mb-3">
                  This cannot be undone. Your account and all associated data will be permanently deleted.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    loading={resetting}
                    className="flex-1"
                  >
                    Delete forever
                  </Button>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive mt-3">{error}</p>}
        </Card>
      </div>
    </div>
  );
}
