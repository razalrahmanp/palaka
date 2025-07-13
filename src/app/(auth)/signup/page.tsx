'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types";
import { ROLES } from "@/lib/roles";

// Password validation function (remains the same)
const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
        return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
        return "Password must contain at least one lowercase letter.";
    }
    if (!/\d/.test(password)) {
        return "Password must contain at least one number.";
    }
    return null; // Password is valid
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

    // --- Frontend Validation ---
    if (!email || !password || !name || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
        setError(passwordError);
        return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    // --- End Validation ---

    setLoading(true);

    // Call your new custom signup API endpoint
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, role }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An unknown error occurred.');
        }

        alert("Signup successful! You can now log in.");
        router.push("/login");

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
        <h2 className="text-2xl font-bold text-center">Create an account</h2>
        <form onSubmit={handleSignUp} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full px-4 py-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
           <input
            type="password"
            placeholder="Confirm Password"
            className="w-full px-4 py-2 border rounded"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <label
            htmlFor="role-select"
            className="block text-sm font-medium text-gray-700"
          >
            Role
          </label>
          <select
            id="role-select"
            className="w-full px-4 py-2 border rounded"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {Object.keys(ROLES).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
          <p className="text-sm text-center">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Login here
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
