"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Package,
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  Lock,
  Mail,
  ArrowRight
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const user = await res.json();
      if (!res.ok) throw new Error(user.error || "Invalid credentials");

      localStorage.setItem("user", JSON.stringify({ id: user.id, email: user.email, role: user.role, permissions: user.permissions }));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Package, label: "Inventory" },
    { icon: Users, label: "CRM" },
    { icon: TrendingUp, label: "Analytics" },
    { icon: DollarSign, label: "Finance" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Left: Intro / Illustration */}
      <aside className="hidden lg:flex lg:w-1/2 xl:w-3/5 p-12 flex-col justify-center gap-8 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-xl">
            <Boxes className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-white text-2xl font-bold">Al Rams ERP</h3>
            <p className="text-sm text-purple-300">Manage inventory · sales · finance · analytics</p>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-bold text-white leading-tight">Grow with clarity</h1>
          <p className="mt-4 text-lg text-purple-200 max-w-xl">A single platform to run your business — inventory control, CRM, orders and deep analytics.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {features.map((f, i) => (
            <div key={i} className="bg-white/6 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-white font-medium">{f.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Small dashboard mockup */}
        <div className="mt-6 bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-semibold">Dashboard</div>
            <BarChart3 className="h-5 w-5 text-purple-300" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
              <div className="text-white font-bold">2,847</div>
              <div className="text-xs text-blue-200">Orders</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20">
              <div className="text-white font-bold">1,234</div>
              <div className="text-xs text-purple-200">Products</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20">
              <div className="text-white font-bold">₹45.2L</div>
              <div className="text-xs text-green-200">Revenue</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right: Form */}
      <main className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-white text-xl font-bold">Al Rams ERP</h3>
              <p className="text-sm text-purple-300">Enterprise Resource Planning</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-sm text-purple-200 mb-6">Sign in to continue to your workspace</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-sm text-purple-200">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  title="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <label className="block text-sm text-purple-200">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  title="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {error && <div className="text-sm text-red-400">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-3 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 disabled:opacity-60"
              >
                {loading ? (
                  <span>Signing in…</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-purple-200">
              <span>Don’t have an account? </span>
              <a href="/signup" className="text-white font-medium hover:text-purple-300">Sign up</a>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-purple-300">© {new Date().getFullYear()} Al Rams ERP</div>
        </div>
      </main>
    </div>
  );
}
