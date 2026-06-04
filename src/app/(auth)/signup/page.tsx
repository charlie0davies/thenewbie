"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "aws-amplify/auth";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp({
        username: form.email,
        password: form.password,
        options: { userAttributes: { name: form.name, email: form.email } },
      });
      // Store credentials temporarily so verify page can auto-login
      sessionStorage.setItem("pending_email", form.email);
      sessionStorage.setItem("pending_pw", form.password);
      router.push(`/verify?email=${encodeURIComponent(form.email)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="mb-8 text-center">
            <Image src="/NewbieLogo.png" alt="The Newbie" width={56} height={56} className="mx-auto mb-4 rounded-2xl object-contain" />
            <h1 className="text-2xl font-bold">Create account</h1>
            <p className="text-muted-foreground text-sm mt-1">Start your fitness journey today.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Charlie Davies"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" loading={loading} className="mt-2">
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
