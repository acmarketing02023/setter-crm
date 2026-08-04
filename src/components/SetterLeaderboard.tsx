"use client";

import { BookingStatus } from "@/lib/types";

type LeaderboardEntry = {
  setterId: string;
  setterName: string;
  booked: number;
  won: number;
  lost: number;
};

export function SetterLeaderboard({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Setter Performance</h2>
        <p className="text-neutral-400">No data yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-6">
      <h2 className="mb-6 text-lg font-bold text-white">Setter Performance</h2>
      <div className="space-y-3">
        {entries.map((entry, i) => {
          const total = entry.booked + entry.won + entry.lost;
          const winRate =
            total > 0 ? Math.round((entry.won / total) * 100) : 0;

          return (
            <div
              key={entry.setterId}
              className="flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 hover:border-red-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white ${
                    i === 0
                      ? "bg-red-600"
                      : i === 1
                      ? "bg-neutral-700"
                      : "bg-neutral-600"
                  }`}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {entry.setterName}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {total} bookings • {winRate}% win rate
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-right">
                  <p className="font-bold text-red-500">{entry.won}</p>
                  <p className="text-xs text-neutral-400">Won</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-neutral-300">{entry.booked}</p>
                  <p className="text-xs text-neutral-400">Booked</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-neutral-500">{entry.lost}</p>
                  <p className="text-xs text-neutral-400">Lost</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
