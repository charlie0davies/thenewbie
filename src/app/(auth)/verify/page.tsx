"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
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
      router.push("/login?verified=1");
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
    <main className="flex flex-col min-h-screen px-6 bg-background">
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto gap-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a 6-digit code to <span className="text-foreground">{email}</span>
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
            Verify email
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {resent ? (
            <span className="text-primary">Code resent!</span>
          ) : (
            <>
              Didn&apos;t get it?{" "}
              <button onClick={handleResend} className="text-primary font-medium">
                Resend code
              </button>
            </>
          )}
        </p>
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
