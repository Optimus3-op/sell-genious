"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent, overrideEmail?: string, overridePassword?: string) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: overrideEmail ?? email,
          password: overridePassword ?? password,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        user?: { role: string };
        onboardingCompleted?: boolean;
      };
      if (!res.ok) {
        setError(data.error || "Sign in failed");
        setLoading(false);
        return;
      }
      if (data.user?.role === "platform_admin") {
        router.push("/admin");
      } else if (!data.onboardingCompleted) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error while signing in");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-navy-900">SellGenius AI</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-navy-900">Sign in to your business</h1>
          <p className="mt-1 text-sm text-slate-600">Access your Seller Dashboard, CRM, and AI Growth Advisor.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbrand.com"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
                <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* One-click Demo Logins */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quick Demo Access (Labeled Demo Data)
            </p>
            <div className="grid gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleLogin(e, "demo@urbanstyle.com", "SellerPass123!")}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100"
              >
                <span>
                  <strong className="text-navy-900">UrbanStyle Seller</strong>{" "}
                  <span className="text-slate-500">(demo@urbanstyle.com)</span>
                </span>
                <span className="font-semibold text-brand-600">Sign in →</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleLogin(e, "founder@terraroast.com", "SellerPass123!")}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100"
              >
                <span>
                  <strong className="text-navy-900">TerraRoast Seller</strong>{" "}
                  <span className="text-slate-500">(founder@terraroast.com)</span>
                </span>
                <span className="font-semibold text-brand-600">Sign in →</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleLogin(e, "admin@sellgenius.ai", "AdminPass123!")}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100"
              >
                <span>
                  <strong className="text-navy-900">Platform Admin</strong>{" "}
                  <span className="text-slate-500">(admin@sellgenius.ai)</span>
                </span>
                <span className="font-semibold text-violet-600">Admin →</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            New to SellGenius AI?{" "}
            <Link href="/register" className="font-semibold text-brand-600 hover:underline">
              Create your online business
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
