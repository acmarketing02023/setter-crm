"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"setter" | "owner" | null>(null);

  async function handleLogin(role: "setter" | "owner") {
    setLoading(role);
    setError(null);

    const credentials = {
      setter: {
        email: "angelcruzgabriel44@gmail.com",
        password: "15598654Aa",
      },
      owner: {
        email: "acmarketing02023@gmail.com",
        password: "64186418Am",
      },
    };

    const creds = credentials[role];

    const res = await signIn("credentials", {
      email: creds.email,
      password: creds.password,
      redirect: false,
    });

    setLoading(null);

    if (res?.error) {
      setError(`Failed to sign in as ${role}. Please check database connection.`);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Setter CRM</h1>
          <p className="text-sm text-neutral-400">Choose your role to continue</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={() => handleLogin("setter")}
          disabled={loading !== null}
          className="w-full rounded-md bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading === "setter" ? "Signing in..." : "Login as Setter"}
        </button>

        <button
          onClick={() => handleLogin("owner")}
          disabled={loading !== null}
          className="w-full rounded-md bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition"
        >
          {loading === "owner" ? "Signing in..." : "Login as Owner"}
        </button>
      </div>
    </div>
  );
}
