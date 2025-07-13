'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        // Call your custom login API endpoint
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const user = await response.json();

        if (!response.ok) {
            throw new Error(user.error || "Invalid email or password");
        }

        // --- This is the corrected part ---
        // Ensure the full user object, including the 'permissions' array from the API,
        // is saved to localStorage.
        localStorage.setItem(
            "user",
            JSON.stringify({
                id: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions, // This line is crucial
            })
        );

        // Redirect by role
        const map: Record<string, string> = {
            "System Administrator": "/dashboard",
            "Executive": "/dashboard",
            "Sales Representative": "/sales",
            "Sales Manager": "/sales",
            "Procurement Manager": "/procurement",
            "Warehouse Manager": "/inventory",
            "Warehouse Staff": "/inventory",
            "Production Manager": "/manufacturing",
            "Production Staff": "/manufacturing",
            "Delivery Driver": "/logistics",
            "Logistics Coordinator": "/logistics",
            "Finance Manager": "/finance",
            "HR Manager": "/hr",
            "Employee": "/hr/performance",
        };

        router.push(map[user.role] || "/unauthorized");

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <p className="text-sm text-center">
          Don’t have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
