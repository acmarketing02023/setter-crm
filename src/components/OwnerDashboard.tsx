"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CallOutcome, OUTCOME_LABELS, BookingStatus, BookingSource, SOURCE_LABELS } from "@/lib/types";
import { computeLeaderboard } from "@/lib/stats";
import { BookingCalendar } from "./BookingCalendar";

type CallRow = {
  id: string;
  contractorName: string;
  outcome: CallOutcome;
  createdAt: string;
  setterName: string;
};

type BookingRow = {
  id: string;
  contractorName: string;
  phone: string | null;
  scheduledAt: string;
  setterNotes: string;
  closerBriefing: string;
  status: BookingStatus;
  source: BookingSource;
  viewedAt: string | null;
  setterId: string;
  setter: { name: string };
};

type SetterOption = { id: string; name: string };

type Stats = {
  today: { calls: number; booked: number };
  week: { calls: number; booked: number };
  month: { calls: number; booked: number };
};

type EditForm = {
  contractorName: string;
  phone: string;
  scheduledAt: string;
  setterNotes: string;
  closerBriefing: string;
};

export function OwnerDashboard({
  stats,
  calls,
  bookings,
  hasMoreCalls,
  setters,
}: {
  stats: Stats;
  calls: CallRow[];
  bookings: BookingRow[];
  hasMoreCalls: boolean;
  setters: SetterOption[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bookingSearch, setBookingSearch] = useState("");
  const [callSearch, setCallSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | "ALL">("ALL");
  const [setterFilter, setSetterFilter] = useState<string>("ALL");

  const [allCalls, setAllCalls] = useState<CallRow[]>(calls);
  const [hasMore, setHasMore] = useState(hasMoreCalls);
  const [loadingMore, setLoadingMore] = useState(false);

  async function updateStatus(id: string, status: BookingStatus) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setUpdating(null);
    }
  }

  async function markViewed(b: BookingRow) {
    if (b.viewedAt) return;
    await fetch(`/api/bookings/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markViewed: true }),
    });
    router.refresh();
  }

  function toggleExpand(b: BookingRow) {
    const next = expandedId === b.id ? null : b.id;
    setExpandedId(next);
    if (next) markViewed(b);
  }

  function startEdit(b: BookingRow) {
    setEditingId(b.id);
    setEditForm({
      contractorName: b.contractorName,
      phone: b.phone ?? "",
      scheduledAt: format(new Date(b.scheduledAt), "yyyy-MM-dd'T'HH:mm"),
      setterNotes: b.setterNotes,
      closerBriefing: b.closerBriefing,
    });
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    setUpdating(id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorName: editForm.contractorName,
          phone: editForm.phone,
          scheduledAt: new Date(editForm.scheduledAt).toISOString(),
          setterNotes: editForm.setterNotes,
          closerBriefing: editForm.closerBriefing,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save changes");
      setEditingId(null);
      setEditForm(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setUpdating(null);
    }
  }

  async function deleteBooking(id: string) {
    if (!window.confirm("Delete this booking? This can't be undone.")) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (expandedId === id) setExpandedId(null);
        router.refresh();
      }
    } finally {
      setUpdating(null);
    }
  }

  async function deleteCall(id: string) {
    if (!window.confirm("Delete this call log? This can't be undone.")) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/calls/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to delete call");
        return;
      }
      router.refresh();
    } finally {
      setUpdating(null);
    }
  }

  async function reassignSetter(bookingId: string, newSetterId: string) {
    setUpdating(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setterId: newSetterId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setUpdating(null);
    }
  }

  async function loadMoreCalls() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/calls?skip=${allCalls.length}&take=50`);
      if (res.ok) {
        const data: {
          calls: Array<{ id: string; contractorName: string; outcome: CallOutcome; createdAt: string; setter: { name: string } }>;
          hasMore: boolean;
        } = await res.json();
        setAllCalls((prev) => [
          ...prev,
          ...data.calls.map((c) => ({
            id: c.id,
            contractorName: c.contractorName,
            outcome: c.outcome,
            createdAt: c.createdAt,
            setterName: c.setter.name,
          })),
        ]);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const leaderboard = useMemo(
    () =>
      computeLeaderboard(
        bookings.map((b) => ({ setterId: b.setterId, setterName: b.setter.name, status: b.status }))
      ),
    [bookings]
  );

  const upcoming = bookings.filter((b) => b.status === "SCHEDULED");
  const newCount = upcoming.filter((b) => !b.viewedAt).length;

  const filteredUpcoming = upcoming.filter((b) =>
    b.contractorName.toLowerCase().includes(bookingSearch.trim().toLowerCase())
  );

  const grouped = filteredUpcoming.reduce<Record<string, BookingRow[]>>((acc, b) => {
    const key = format(new Date(b.scheduledAt), "yyyy-MM-dd");
    acc[key] = acc[key] ? [...acc[key], b] : [b];
    return acc;
  }, {});

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const setterNames = useMemo(
    () => Array.from(new Set(allCalls.map((c) => c.setterName))).sort(),
    [allCalls]
  );

  const filteredCalls = allCalls.filter((c) => {
    if (outcomeFilter !== "ALL" && c.outcome !== outcomeFilter) return false;
    if (setterFilter !== "ALL" && c.setterName !== setterFilter) return false;
    if (callSearch.trim() && !c.contractorName.toLowerCase().includes(callSearch.trim().toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Today</p>
          <p className="mt-3 text-4xl font-bold text-gray-900">{stats.today.calls}</p>
          <p className="mt-1 text-sm text-red-600 font-medium">{stats.today.booked} booked</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">This Week</p>
          <p className="mt-3 text-4xl font-bold text-gray-900">{stats.week.calls}</p>
          <p className="mt-1 text-sm text-red-600 font-medium">{stats.week.booked} booked</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">This Month</p>
          <p className="mt-3 text-4xl font-bold text-gray-900">{stats.month.calls}</p>
          <p className="mt-1 text-sm text-red-600 font-medium">{stats.month.booked} booked</p>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <BookingCalendar bookings={bookings} />

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming Bookings
            {newCount > 0 && (
              <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                {newCount} new
              </span>
            )}
          </h2>
          <input
            placeholder="Search contractor…"
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
            className="w-48 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>

        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-gray-500">No upcoming bookings.</p>
        )}
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-sm font-semibold text-gray-700">
                {day === todayKey ? "Today" : format(new Date(items[0].scheduledAt), "EEEE, MMM d")}
              </p>
              <ul className="space-y-2">
                {items.map((b) => (
                  <li key={b.id} className="rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleExpand(b)}
                      className="flex w-full items-center justify-between p-3 text-left"
                    >
                      <div>
                        <p className="flex items-center gap-2 font-medium text-gray-900">
                          {b.contractorName}
                          {!b.viewedAt && (
                            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              New
                            </span>
                          )}
                          {b.source === "LANDING_PAGE" && (
                            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Landing Page
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          Setter: {b.setter.name}
                          {b.phone ? ` · ${b.phone}` : ""}
                          {` · ${SOURCE_LABELS[b.source]}`}
                        </p>
                      </div>
                      <span className="text-sm text-gray-600">
                        {format(new Date(b.scheduledAt), "h:mm a")}
                      </span>
                    </button>

                    {expandedId === b.id && (
                      <div className="space-y-3 border-t border-gray-200 p-3">
                        {editingId === b.id && editForm ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                value={editForm.contractorName}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, contractorName: e.target.value })
                                }
                                placeholder="Contractor name"
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              />
                              <input
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                placeholder="Phone"
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              />
                            </div>
                            <input
                              type="datetime-local"
                              value={editForm.scheduledAt}
                              onChange={(e) =>
                                setEditForm({ ...editForm, scheduledAt: e.target.value })
                              }
                              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                            />
                            <textarea
                              value={editForm.setterNotes}
                              onChange={(e) =>
                                setEditForm({ ...editForm, setterNotes: e.target.value })
                              }
                              rows={2}
                              placeholder="What the setter discussed"
                              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                            />
                            <textarea
                              value={editForm.closerBriefing}
                              onChange={(e) =>
                                setEditForm({ ...editForm, closerBriefing: e.target.value })
                              }
                              rows={2}
                              placeholder="What the closer should bring up"
                              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                            />
                            <div className="flex gap-2">
                              <button
                                disabled={updating === b.id}
                                onClick={() => saveEdit(b.id)}
                                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditForm(null);
                                }}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
                                What the setter discussed
                              </p>
                              <p className="text-sm text-gray-800">{b.setterNotes}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                                What you should bring up on the call
                              </p>
                              <p className="text-sm text-gray-800">{b.closerBriefing}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium uppercase tracking-wide text-gray-600">
                                Reassign to
                              </label>
                              <select
                                value={b.setterId}
                                disabled={updating === b.id}
                                onChange={(e) => reassignSetter(b.id, e.target.value)}
                                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              >
                                {setters.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                disabled={updating === b.id}
                                onClick={() => updateStatus(b.id, "WON")}
                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Won
                              </button>
                              <button
                                disabled={updating === b.id}
                                onClick={() => updateStatus(b.id, "LOST")}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                              >
                                Lost
                              </button>
                              <button
                                disabled={updating === b.id}
                                onClick={() => updateStatus(b.id, "CANCELED")}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={updating === b.id}
                                onClick={() => startEdit(b)}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                disabled={updating === b.id}
                                onClick={() => deleteBooking(b.id)}
                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Setter Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-500">No decided bookings yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-600">
                <th className="py-2 font-medium">Setter</th>
                <th className="py-2 font-medium">Total</th>
                <th className="py-2 font-medium">Won</th>
                <th className="py-2 font-medium">Lost</th>
                <th className="py-2 font-medium">Close Rate</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.setterId} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-900">{row.setterName}</td>
                  <td className="py-2 text-gray-600">{row.total}</td>
                  <td className="py-2 font-medium text-emerald-600">{row.won}</td>
                  <td className="py-2 font-medium text-red-600">{row.lost}</td>
                  <td className="py-2 text-gray-600">{row.closeRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calls (All Setters)</h2>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Search contractor…"
              value={callSearch}
              onChange={(e) => setCallSearch(e.target.value)}
              className="w-40 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <select
              value={setterFilter}
              onChange={(e) => setSetterFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">All setters</option>
              {setterNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as CallOutcome | "ALL")}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">All outcomes</option>
              {(Object.keys(OUTCOME_LABELS) as CallOutcome[]).map((key) => (
                <option key={key} value={key}>
                  {OUTCOME_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredCalls.length === 0 && (
          <p className="text-sm text-gray-500">No calls match your filters.</p>
        )}
        <ul className="space-y-2">
          {filteredCalls.slice(0, 20).map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 p-3 text-sm transition-colors"
            >
              <span className="flex-1 font-medium text-gray-900">{c.contractorName}</span>
              <span className="text-gray-600">{c.setterName}</span>
              <span className="text-gray-600">{OUTCOME_LABELS[c.outcome]}</span>
              <span className="text-gray-600">{format(new Date(c.createdAt), "MMM d, h:mm a")}</span>
              <button
                disabled={updating === c.id}
                onClick={() => deleteCall(c.id)}
                className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              disabled={loadingMore}
              onClick={loadMoreCalls}
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more calls"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-xs text-neutral-500">{sub}</p>
    </div>
  );
}
