import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export type CallLike = { createdAt: Date; outcome: string };

export type LeaderboardBookingLike = { setterId: string; setterName: string; status: string };

export type LeaderboardRow = {
  setterId: string;
  setterName: string;
  total: number;
  won: number;
  lost: number;
  closeRate: number; // 0-100, based on decided (won+lost) bookings
};

export function computeLeaderboard(bookings: LeaderboardBookingLike[]): LeaderboardRow[] {
  const bySetterId = new Map<string, LeaderboardRow>();

  for (const b of bookings) {
    let row = bySetterId.get(b.setterId);
    if (!row) {
      row = { setterId: b.setterId, setterName: b.setterName, total: 0, won: 0, lost: 0, closeRate: 0 };
      bySetterId.set(b.setterId, row);
    }
    row.total += 1;
    if (b.status === "WON") row.won += 1;
    if (b.status === "LOST") row.lost += 1;
  }

  const rows = Array.from(bySetterId.values()).map((row) => {
    const decided = row.won + row.lost;
    return { ...row, closeRate: decided > 0 ? Math.round((row.won / decided) * 100) : 0 };
  });

  rows.sort((a, b) => b.closeRate - a.closeRate || b.won - a.won);
  return rows;
}

export function computeCallStats(calls: CallLike[], now = new Date()) {
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const count = (since: Date) => calls.filter((c) => c.createdAt >= since).length;
  const booked = (since: Date) =>
    calls.filter((c) => c.createdAt >= since && c.outcome === "BOOKED").length;

  return {
    today: { calls: count(dayStart), booked: booked(dayStart) },
    week: { calls: count(weekStart), booked: booked(weekStart) },
    month: { calls: count(monthStart), booked: booked(monthStart) },
  };
}
