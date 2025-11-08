"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserRole } from "@/types";
import { ROLES } from "@/lib/roles";
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/\d/.test(password)) return "Password must contain a number.";
  return null;
};

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Employee");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 flex overflow-hidden">
      <div 
        className="hidden lg:flex lg:w-1/2 p-8 items-center justify-center relative bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2574&auto=format&fit=crop')",
        }}
      >
        {/* Glassmorphism overlay on top */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/30 via-blue-800/25 to-cyan-900/30 backdrop-blur-md"></div>
        
        {/* Content with higher z-index */}
        <div className="text-white max-w-lg relative z-10">
          <div className="mb-6">
            <Image 
              src="/assets/logo/logo1-removebg-preview.png"
              alt="Al Rams ERP"
              width={250}
              height={90}
              className="object-contain mb-4 brightness-110 drop-shadow-2xl"
              priority
            />
          </div>
          <h2 className="text-3xl font-bold mb-3 drop-shadow-lg">Create your account</h2>
          <p className="text-white/95 mb-4 drop-shadow-md">Start using Al Rams ERP to manage sales, stock and finance — built for growing businesses.</p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-sky-300 drop-shadow-md" />
              <div>
                <div className="font-medium text-sm drop-shadow-md">Secure by design</div>
                <div className="text-xs text-white/90 drop-shadow-md">Role based access & data protection</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-sky-300 drop-shadow-md" />
              <div>
                <div className="font-medium text-sm drop-shadow-md">Integrated modules</div>
                <div className="text-xs text-white/90 drop-shadow-md">CRM, Orders, Inventory & Accounting</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/40">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Create an account</h2>
            <p className="text-sm text-slate-600 mb-4">Sign up and get access to your ERP workspace.</p>

            <form onSubmit={handleSignUp} className="space-y-3">
              <label className="block text-sm text-slate-700 font-medium">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input placeholder="Full name" title="Full name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-sky-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm" />
              </div>

              <label className="block text-sm text-slate-700 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input type="email" placeholder="you@company.com" title="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-sky-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm" />
              </div>

              <label className="block text-sm text-slate-700 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input type="password" placeholder="Create a secure password" title="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-sky-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm" />
              </div>

              <label className="block text-sm text-slate-700 font-medium">Confirm password</label>
              <input type="password" placeholder="Confirm password" title="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-sky-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm" />

              <label className="block text-sm text-slate-700 font-medium">Role</label>
              <select title="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full py-2.5 px-3 rounded-xl bg-white/70 backdrop-blur-sm border border-sky-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm">
                {Object.keys(ROLES).map((r) => (
                  <option key={r} value={r} className="text-slate-900">{r}</option>
                ))}
              </select>

              {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}

              <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-3 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold hover:from-sky-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-60 text-sm">
                {loading ? "Creating…" : <><span>Create account</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className="mt-4 text-sm text-slate-600 text-center">
              <span>Already have an account? </span>
              <a href="/login" className="text-sky-600 font-medium hover:text-sky-700">Sign in</a>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-slate-600">© {new Date().getFullYear()} Riddoff Technologies Pvt Ltd</div>
        </div>
      </main>
    </div>
  );
}
