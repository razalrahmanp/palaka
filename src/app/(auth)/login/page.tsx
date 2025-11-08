"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
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
    <div className="h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 flex overflow-hidden">
      {/* Left: Intro / Illustration */}
      <aside 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 p-8 flex-col justify-center gap-6 overflow-hidden relative bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2574&auto=format&fit=crop')",
        }}
      >
        {/* Glassmorphism overlay on top */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/30 via-blue-800/25 to-cyan-900/30 backdrop-blur-md"></div>
        
        {/* Content with higher z-index */}
        <div className="relative z-10 flex items-center gap-4">
          <Image 
            src="/assets/logo/logo1-removebg-preview.png"
            alt="Al Rams ERP"
            width={250}
            height={90}
            className="object-contain brightness-110 drop-shadow-2xl"
            priority
          />
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight drop-shadow-lg">Grow with clarity</h1>
          <p className="mt-3 text-base text-white/95 max-w-xl drop-shadow-md">A single platform to run your business — inventory control, CRM, orders and deep analytics.</p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div key={i} className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30 hover:bg-white/25 transition-all shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gradient-to-br from-sky-400 to-blue-600 rounded-md flex items-center justify-center shadow-lg">
                  <f.icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-white font-medium text-sm drop-shadow-md">{f.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Small dashboard mockup */}
        <div className="relative z-10 bg-white/20 backdrop-blur-md rounded-2xl p-3 border border-white/30 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white font-semibold text-sm drop-shadow-md">Dashboard Preview</div>
            <BarChart3 className="h-4 w-4 text-sky-300 drop-shadow-md" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30">
              <div className="text-white font-bold text-sm drop-shadow-md">2,847</div>
              <div className="text-[10px] text-white/90 drop-shadow-md">Orders</div>
            </div>
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30">
              <div className="text-white font-bold text-sm drop-shadow-md">1,234</div>
              <div className="text-[10px] text-white/90 drop-shadow-md">Products</div>
            </div>
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30">
              <div className="text-white font-bold text-sm drop-shadow-md">₹45.2L</div>
              <div className="text-[10px] text-white/90 drop-shadow-md">Revenue</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right: Form */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center mb-4">
            <Image 
              src="/assets/logo/logo1-removebg-preview.png"
              alt="Al Rams ERP"
              width={180}
              height={65}
              className="object-contain"
              priority
            />
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/40">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-sm text-slate-600 mb-4">Sign in to continue to your workspace</p>

            <form onSubmit={handleLogin} className="space-y-3">
              <label className="block text-sm text-slate-700 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  title="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-sky-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>

              <label className="block text-sm text-slate-700 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  title="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-sky-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>

              {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-3 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold hover:from-sky-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-60 text-sm"
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

            <div className="mt-4 text-center text-sm text-slate-600">
              <span>Don&apos;t have an account? </span>
              <a href="/signup" className="text-sky-600 font-medium hover:text-sky-700">Sign up</a>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-slate-600">© {new Date().getFullYear()} Riddoff Technologies Pvt Ltd</div>
        </div>
      </main>
    </div>
  );
}
