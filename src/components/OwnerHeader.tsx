"use client";

export function OwnerHeader({ name, email }: { name: string; email?: string | null }) {
  const displayName = "acmarketing";

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-8 shadow-sm">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">
          Welcome back, <span className="font-semibold text-red-600">{displayName.toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
}
