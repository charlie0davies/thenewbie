"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmSignUp, resendSignUpCode, signIn } from "aws-amplify/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });

      // Auto-login using credentials stored during signup
      const pw = sessionStorage.getItem("pending_pw");
      if (pw) {
        await signIn({ username: email, password: pw });
        sessionStorage.removeItem("pending_pw");
        sessionStorage.removeItem("pending_email");
        router.push("/onboarding");
      } else {
        router.push("/login?verified=1");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await resendSignUpCode({ username: email });
      setResent(true);
    } catch {
      setError("Could not resend code");
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="text-4xl mb-3">📬</div>
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground text-sm mt-1">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Verification code"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoComplete="one-time-code"
              className="text-center text-2xl tracking-widest"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" loading={loading} disabled={code.length !== 6}>
              Verify &amp; continue
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {resent ? (
              <span className="text-primary font-medium">Code resent!</span>
            ) : (
              <>
                Didn&apos;t get it?{" "}
                <button onClick={handleResend} className="text-primary font-semibold">
                  Resend code
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
