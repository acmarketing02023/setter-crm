"use client";

interface StatCardProProps {
  label: string;
  value: number;
  subtext?: string;
  icon?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCardPro({
  label,
  value,
  subtext,
  icon,
  trend = "neutral",
}: StatCardProProps) {
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-6 hover:border-red-500 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-400">{label}</p>
          <p className="mt-2 text-4xl font-bold text-white">{value}</p>
          {subtext && <p className="mt-1 text-sm text-neutral-400">{subtext}</p>}
        </div>
        {icon && (
          <div
            className={`text-2xl ${
              trend === "up"
                ? "text-red-500"
                : trend === "down"
                ? "text-neutral-500"
                : "text-neutral-600"
            }`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
