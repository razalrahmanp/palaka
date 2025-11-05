"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      <div className="hidden lg:flex lg:w-1/2 p-12 items-center justify-center">
        <div className="text-white max-w-lg">
          <h2 className="text-4xl font-bold mb-3">Create your account</h2>
          <p className="text-purple-200 mb-6">Start using Al Rams ERP to manage sales, stock and finance — built for growing businesses.</p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
              <div>
                <div className="font-medium">Secure by design</div>
                <div className="text-xs text-purple-300">Role based access & data protection</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
              <div>
                <div className="font-medium">Integrated modules</div>
                <div className="text-xs text-purple-300">CRM, Orders, Inventory & Accounting</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Create an account</h2>
            <p className="text-sm text-purple-200 mb-6">Sign up and get access to your ERP workspace.</p>

            <form onSubmit={handleSignUp} className="space-y-4">
              <label className="block text-sm text-purple-200">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                <input placeholder="Full name" title="Full name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-white" />
              </div>

              <label className="block text-sm text-purple-200">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                <input type="email" placeholder="you@company.com" title="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-white" />
              </div>

              <label className="block text-sm text-purple-200">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                <input type="password" placeholder="Create a secure password" title="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-white" />
              </div>

              <label className="block text-sm text-purple-200">Confirm password</label>
              <input type="password" placeholder="Confirm password" title="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-white" />

              <label className="block text-sm text-purple-200">Role</label>
              <select title="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full py-3 rounded-xl bg-white/6 border border-white/10 text-white">
                {Object.keys(ROLES).map((r) => (
                  <option key={r} value={r} className="text-black">{r}</option>
                ))}
              </select>

              {error && <div className="text-sm text-red-400">{error}</div>}

              <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-3 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold">
                {loading ? "Creating…" : <><span>Create account</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className="mt-4 text-sm text-purple-200 text-center">
              <span>Already have an account? </span>
              <a href="/login" className="text-white font-medium hover:text-purple-300">Sign in</a>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-purple-300">© {new Date().getFullYear()} Al Rams ERP</div>
        </div>
      </main>
    </div>
  );
}
