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
      <section className="grid grid-cols-3 gap-6">
        {/* Box 1: Cold Calls */}
        <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Cold Calls Made</p>
              <div className="mt-6 space-y-3">
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold text-gray-900">{stats.today.calls}</p>
                  <p className="text-xs text-gray-500">Today</p>
                </div>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold text-gray-900">{stats.week.calls}</p>
                  <p className="text-xs text-gray-500">This Week</p>
                </div>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold text-gray-900">{stats.month.calls}</p>
                  <p className="text-xs text-gray-500">This Month</p>
                </div>
              </div>
            </div>
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center group-hover:from-red-100 group-hover:to-red-200 transition-colors flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2a1 1 0 01-1 1H4a1 1 0 01-1-1V5z M3 15a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Box 2: Bookings This Week */}
        <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Bookings This Week</p>
              <p className="mt-6 text-6xl font-bold text-gray-900">{stats.week.booked}</p>
              <p className="mt-3 text-sm text-blue-600 font-semibold">Scheduled bookings</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Box 3: Expected Bookings This Month */}
        <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Expected This Month</p>
              <p className="mt-6 text-6xl font-bold text-gray-900">{(() => {
                const today = new Date();
                const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const dayOfMonth = today.getDate();
                const daysRemaining = daysInMonth - dayOfMonth;
                const currentBookings = stats.month.booked;

                if (dayOfMonth === 1) return currentBookings;
                const avgPerDay = currentBookings / dayOfMonth;
                const projected = Math.round(currentBookings + (avgPerDay * daysRemaining));
                return projected;
              })()}</p>
              <p className="mt-3 text-sm text-purple-600 font-semibold">{stats.month.booked} booked so far</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center group-hover:from-purple-100 group-hover:to-purple-200 transition-colors">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                <polyline points="13 2 13 9 20 9" />
                <path d="M9 15h2m-2 4h6" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 text-sm text-red-700">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {error}
        </div>
      )}

      <BookingCalendar bookings={bookings} />

      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-6-7h-2v5h2zm0-9h-2v2h2z" />
                </svg>
              </div>
              Upcoming Bookings
              {newCount > 0 && (
                <span className="ml-auto rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                  {newCount} new
                </span>
              )}
            </h2>
          </div>
          <input
            placeholder="Search contractor…"
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
            className="w-56 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>

        {Object.keys(grouped).length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 font-medium">No upcoming bookings</p>
            <p className="text-sm text-gray-500 mt-1">Bookings will appear here once they're scheduled</p>
          </div>
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
                                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 hover:shadow-md transition-all disabled:opacity-50"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditForm(null);
                                }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
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
                            <div className="flex flex-wrap gap-3 pt-2">
                              <button
                                disabled={updating === b.id}
                                onClick={() => updateStatus(b.id, "WON")}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 hover:shadow-md transition-all disabled:opacity-50"
                              >
                                ✓ Won
                              </button>
                              <button
                                disabled={updating === b.id}
                                onClick={() => updateStatus(b.id, "LOST")}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                Lost
                              </button>
                              <button
                                disabled={updating === b.id}
                                onClick={() => updateStatus(b.id, "CANCELED")}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                ✕ Cancel
                              </button>
                              <button
                                disabled={updating === b.id}
                                onClick={() => startEdit(b)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                ✎ Edit
                              </button>
                              <button
                                disabled={updating === b.id}
                                onClick={() => deleteBooking(b.id)}
                                className="rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                🗑 Delete
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

      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 21H7v-5H4v5H2v-7h7v7zm8 0h-2v-5h-3v5h-2v-7h7v7zm4-10V9h-2V7h2V5h2v2h2v2h-2v2h-2z" />
            </svg>
          </div>
          Setter Leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-600 font-medium">No leaderboard data yet</p>
            <p className="text-sm text-gray-500 mt-1">Leaderboard will update as bookings are won or lost</p>
          </div>
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

      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </div>
            Recent Calls (All Setters)
          </h2>
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Search contractor…"
              value={callSearch}
              onChange={(e) => setCallSearch(e.target.value)}
              className="w-40 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            <select
              value={setterFilter}
              onChange={(e) => setSetterFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100"
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
              className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100"
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
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2a1 1 0 01-1 1H4a1 1 0 01-1-1V5z" />
            </svg>
            <p className="text-gray-600 font-medium">No calls match your filters</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
        <ul className="space-y-3">
          {filteredCalls.slice(0, 20).map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 p-4 text-sm transition-colors group"
            >
              <span className="flex-1 font-semibold text-gray-900">{c.contractorName}</span>
              <div className="flex items-center gap-4 text-gray-600">
                <span className="text-xs">{c.setterName}</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-white border border-gray-300">{OUTCOME_LABELS[c.outcome]}</span>
                <span className="text-xs whitespace-nowrap">{format(new Date(c.createdAt), "MMM d, h:mm a")}</span>
              </div>
              <button
                disabled={updating === c.id}
                onClick={() => deleteCall(c.id)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
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
