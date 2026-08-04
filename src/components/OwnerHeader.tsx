"use client";

export function OwnerHeader({ name, email }: { name: string; email?: string | null }) {
  const displayName = "acmarketing";

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-6 shadow-sm">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome back, <span className="font-semibold text-red-600">{displayName.toUpperCase()}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
