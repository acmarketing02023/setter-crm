"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"setter" | "owner" | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Initialize database on page load
    async function init() {
      try {
        // Try to initialize schema
        const initRes = await fetch("/api/debug/init", { method: "POST" });
        if (initRes.ok) {
          const initData = await initRes.json();
          // If no users, seed the database
          if (initData.userCount === 0) {
            const seedRes = await fetch("/api/seed", { method: "POST" });
            if (!seedRes.ok) {
              console.error("Failed to seed database");
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize database:", err);
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, []);

  async function handleLogin(email: string, password: string, name: string) {
    setLoading("setter");
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(null);

    if (res?.error) {
      setError(`Failed to sign in as ${name}. Please check database connection.`);
      return;
    }

    // Redirect to dashboard
    router.push("/setter");
    router.refresh();
  }

  async function handleOwnerLogin(email: string, password: string) {
    setLoading("owner");
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(null);

    if (res?.error) {
      setError("Failed to sign in as Owner. Please check database connection.");
      return;
    }

    // Redirect to owner dashboard
    router.push("/owner");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm space-y-8 rounded-xl border border-neutral-800 bg-neutral-900 p-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-white uppercase tracking-wider">WELCOME ACMARKETING TEAM</h1>
          <p className="text-2xl font-semibold text-white">Setter CRM</p>
          <p className="text-sm text-neutral-400">Choose your role to continue</p>
        </div>

        {initializing && (
          <p className="text-sm text-neutral-400 text-center">Initializing database...</p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-2">
          <button
            onClick={() => handleLogin("angelcruzgabriel44@gmail.com", "15598654Aa", "Angel Cruz")}
            disabled={loading !== null || initializing}
            className="w-full rounded-md bg-white py-3 font-medium text-black hover:bg-gray-200 disabled:opacity-50 transition"
          >
            {loading === "setter" ? "Signing in..." : "Login Angel Cruz (Setter)"}
          </button>

          <button
            onClick={() => handleLogin("alanortiz44@gmail.com", "26749531Bo", "Alan Ortiz")}
            disabled={loading !== null || initializing}
            className="w-full rounded-md bg-white py-3 font-medium text-black hover:bg-gray-200 disabled:opacity-50 transition"
          >
            {loading === "setter" ? "Signing in..." : "Login Alan Ortiz (Setter)"}
          </button>
        </div>

        <button
          onClick={() => handleOwnerLogin("acmarketing02023@gmail.com", "64186418Am")}
          disabled={loading !== null || initializing}
          className="w-full rounded-md bg-black py-3 font-medium text-white hover:bg-gray-900 border border-white disabled:opacity-50 transition"
        >
          {loading === "owner" ? "Signing in..." : "Login as Owner"}
        </button>
      </div>
    </div>
  );
}
