"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, getCurrentUser } from "aws-amplify/auth";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { LogOut, RotateCcw, Trash2, ChevronRight, User, Shield } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

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
