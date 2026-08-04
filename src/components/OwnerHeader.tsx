"use client";

export function OwnerHeader({ name, email }: { name: string; email?: string }) {
  const displayName = email ? email.split("@")[0] : name;

  return (
    <div className="border-b border-neutral-800 bg-black px-6 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-4xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-lg text-neutral-300">
          Welcome back, <span className="font-semibold text-red-500">{displayName}</span>
        </p>
      </div>
    </div>
  );
}
