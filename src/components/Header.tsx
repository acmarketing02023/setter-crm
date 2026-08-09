"use client";

import { signOut } from "next-auth/react";

export function Header({ name, role }: { name: string; role: string }) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
      <div>
        <p className="font-semibold text-white">Setter CRM</p>
        <p className="text-xs text-neutral-400">
          {name} {role === "SETTER" ? "(Setter)" : "(Owner)"}
        </p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
      >
        Sign out
      </button>
    </header>
  );
}
