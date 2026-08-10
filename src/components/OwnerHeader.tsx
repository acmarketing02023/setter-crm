"use client";

import { signOut } from "next-auth/react";

export function OwnerHeader({ name, email }: { name: string; email?: string | null }) {
  const displayName = "acmarketing";

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-6 shadow-sm">
      <div className="mx-auto w-full max-w-6xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* AC Marketing Logo */}
          <div className="h-14 w-14 rounded-lg bg-black flex items-center justify-center flex-shrink-0 shadow-md border-2 border-red-600">
            <div className="text-center">
              <div className="text-red-600 font-black text-lg leading-none">AC</div>
              <div className="text-white text-[8px] font-bold tracking-wider">MARKETING</div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome back, <span className="font-semibold text-red-600">{displayName.toUpperCase()}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
