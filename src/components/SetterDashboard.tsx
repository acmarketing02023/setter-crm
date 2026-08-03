"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CallDTO, BookingDTO, CallOutcome, OUTCOME_LABELS, STATUS_LABELS } from "@/lib/types";

type Stats = {
  today: { calls: number; booked: number };
  week: { calls: number; booked: number };
  month: { calls: number; booked: number };
};

type BookingEditForm = {
  contractorName: string;
  phone: string;
  scheduledAt: string;
  setterNotes: string;
  closerBriefing: string;
};

export function SetterDashboard({
  stats,
  initialCalls,
  initialBookings,
  hasMoreCalls,
}: {
  stats: Stats;
  initialCalls: CallDTO[];
  initialBookings: BookingDTO[];
  hasMoreCalls: boolean;
}) {
  const router = useRouter();
  const [calls, setCalls] = useState<CallDTO[]>(initialCalls);
  const [hasMore, setHasMore] = useState(hasMoreCalls);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contractorName, setContractorName] = useState("");
  const [phone, setPhone] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [setterNotes, setSetterNotes] = useState("");
  const [closerBriefing, setCloserBriefing] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [callSearch, setCallSearch] = useState("");
  const [callOutcomeFilter, setCallOutcomeFilter] = useState<CallOutcome | "ALL">("ALL");
  const [bookingSearch, setBookingSearch] = useState("");

  const [editingCallId, setEditingCallId] = useState<string | null>(null);
  const [callEditForm, setCallEditForm] = useState<{ contractorName: string; phone: string } | null>(
    null
  );

  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [bookingEditForm, setBookingEditForm] = useState<BookingEditForm | null>(null);

  function resetForm() {
    setContractorName("");
    setPhone("");
    setOutcome(null);
    setScheduledAt("");
    setSetterNotes("");
    setCloserBriefing("");
  }

  async function parseErrorResponse(res: Response, fallback: string): Promise<string> {
    try {
      const data = await res.json();
      return data.error ?? fallback;
    } catch {
      return `${fallback} (${res.status})`;
    }
  }

  async function logCall(chosenOutcome: CallOutcome) {
    if (!contractorName.trim()) {
      setError("Enter the contractor's name first.");
      return;
    }

    if (chosenOutcome === "BOOKED") {
      setOutcome("BOOKED");
      setError(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorName, phone, outcome: chosenOutcome }),
      });
      if (!res.ok) {
        let errorMsg = "Failed to log call";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error ?? errorMsg;
        } catch {
          errorMsg = `Server error: ${res.status}`;
        }
        throw new Error(errorMsg);
      }
      resetForm();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBooking() {
    if (!scheduledAt) {
      setError("Pick a booking date and time — make sure you've set the date, hour, minute, and AM/PM.");
      return;
    }
    if (!setterNotes.trim()) {
      setError("Add a note on what you discussed with the contractor.");
      return;
    }
    if (!closerBriefing.trim()) {
      setError("Add what the closer should bring up on the call.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const callRes = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorName, phone, outcome: "BOOKED" }),
      });
      if (!callRes.ok) {
        throw new Error(await parseErrorResponse(callRes, "Failed to log call"));
      }
      const call = await callRes.json();

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: call.id,
          contractorName,
          phone,
          scheduledAt: new Date(scheduledAt).toISOString(),
          setterNotes,
          closerBriefing,
        }),
      });
      if (!bookingRes.ok) {
        throw new Error(await parseErrorResponse(bookingRes, "Failed to save booking"));
      }

      resetForm();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditCall(c: CallDTO) {
    setEditingCallId(c.id);
    setCallEditForm({ contractorName: c.contractorName, phone: c.phone ?? "" });
  }

  async function saveCallEdit(id: string) {
    if (!callEditForm) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callEditForm),
      });
      if (!res.ok) throw new Error(await parseErrorResponse(res, "Failed to save changes"));
      setEditingCallId(null);
      setCallEditForm(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCall(id: string) {
    if (!window.confirm("Delete this call log? This can't be undone.")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calls/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseErrorResponse(res, "Failed to delete call"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditBooking(b: BookingDTO) {
    setEditingBookingId(b.id);
    setBookingEditForm({
      contractorName: b.contractorName,
      phone: b.phone ?? "",
      scheduledAt: format(new Date(b.scheduledAt), "yyyy-MM-dd'T'HH:mm"),
      setterNotes: b.setterNotes,
      closerBriefing: b.closerBriefing,
    });
  }

  async function saveBookingEdit(id: string) {
    if (!bookingEditForm) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorName: bookingEditForm.contractorName,
          phone: bookingEditForm.phone,
          scheduledAt: new Date(bookingEditForm.scheduledAt).toISOString(),
          setterNotes: bookingEditForm.setterNotes,
          closerBriefing: bookingEditForm.closerBriefing,
        }),
      });
      if (!res.ok) throw new Error(await parseErrorResponse(res, "Failed to save changes"));
      setEditingBookingId(null);
      setBookingEditForm(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBooking(id: string) {
    if (!window.confirm("Delete this booking? This can't be undone.")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseErrorResponse(res, "Failed to delete booking"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadMoreCalls() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/calls?skip=${calls.length}&take=50`);
      if (res.ok) {
        const data: { calls: CallDTO[]; hasMore: boolean } = await res.json();
        setCalls((prev) => [...prev, ...data.calls]);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const filteredCalls = calls.filter((c) => {
    if (callOutcomeFilter !== "ALL" && c.outcome !== callOutcomeFilter) return false;
    if (
      callSearch.trim() &&
      !c.contractorName.toLowerCase().includes(callSearch.trim().toLowerCase())
    )
      return false;
    return true;
  });

  const filteredBookings = initialBookings.filter((b) =>
    b.contractorName.toLowerCase().includes(bookingSearch.trim().toLowerCase())
  );

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-3 gap-4">
        <StatCard label="Today" value={stats.today.calls} sub={`${stats.today.booked} booked`} />
        <StatCard label="This Week" value={stats.week.calls} sub={`${stats.week.booked} booked`} />
        <StatCard label="This Month" value={stats.month.calls} sub={`${stats.month.booked} booked`} />
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Log a Call</h2>

        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Contractor name"
            value={contractorName}
            onChange={(e) => setContractorName(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-500"
          />
          <input
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-500"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(OUTCOME_LABELS) as CallOutcome[]).map((key) => (
            <button
              key={key}
              type="button"
              disabled={submitting}
              onClick={() => logCall(key)}
              className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                key === "BOOKED"
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              } ${outcome === key ? "ring-2 ring-emerald-400" : ""}`}
            >
              {OUTCOME_LABELS[key]}
            </button>
          ))}
        </div>

        {outcome === "BOOKED" && (
          <div className="mt-4 space-y-3 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4">
            <div>
              <label className="text-sm text-neutral-300">Booking date & time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-300">What did you talk about?</label>
              <textarea
                value={setterNotes}
                onChange={(e) => setSetterNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-300">What should the closer know / bring up?</label>
              <textarea
                value={closerBriefing}
                onChange={(e) => setCloserBriefing(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={submitBooking}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Booking"}
              </button>
              <button
                type="button"
                onClick={() => setOutcome(null)}
                className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your Upcoming Bookings</h2>
          <input
            placeholder="Search contractor…"
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
            className="w-48 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        {filteredBookings.length === 0 && (
          <p className="text-sm text-neutral-400">No bookings yet.</p>
        )}
        <ul className="space-y-2">
          {filteredBookings.map((b) => (
            <li key={b.id} className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
              {editingBookingId === b.id && bookingEditForm ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={bookingEditForm.contractorName}
                      onChange={(e) =>
                        setBookingEditForm({ ...bookingEditForm, contractorName: e.target.value })
                      }
                      className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                    />
                    <input
                      value={bookingEditForm.phone}
                      onChange={(e) =>
                        setBookingEditForm({ ...bookingEditForm, phone: e.target.value })
                      }
                      placeholder="Phone"
                      className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                    />
                  </div>
                  <input
                    type="datetime-local"
                    value={bookingEditForm.scheduledAt}
                    onChange={(e) =>
                      setBookingEditForm({ ...bookingEditForm, scheduledAt: e.target.value })
                    }
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  />
                  <textarea
                    value={bookingEditForm.setterNotes}
                    onChange={(e) =>
                      setBookingEditForm({ ...bookingEditForm, setterNotes: e.target.value })
                    }
                    rows={2}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  />
                  <textarea
                    value={bookingEditForm.closerBriefing}
                    onChange={(e) =>
                      setBookingEditForm({ ...bookingEditForm, closerBriefing: e.target.value })
                    }
                    rows={2}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={submitting}
                      onClick={() => saveBookingEdit(b.id)}
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditingBookingId(null);
                        setBookingEditForm(null);
                      }}
                      className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{b.contractorName}</span>
                    <span className="text-sm text-neutral-400">
                      {format(new Date(b.scheduledAt), "EEE MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-neutral-500">
                      {STATUS_LABELS[b.status]}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditBooking(b)}
                        className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                      >
                        Edit
                      </button>
                      <button
                        disabled={submitting}
                        onClick={() => deleteBooking(b.id)}
                        className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Recent Calls</h2>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Search contractor…"
              value={callSearch}
              onChange={(e) => setCallSearch(e.target.value)}
              className="w-40 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
            />
            <select
              value={callOutcomeFilter}
              onChange={(e) => setCallOutcomeFilter(e.target.value as CallOutcome | "ALL")}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
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
          <p className="text-sm text-neutral-400">No calls match your filters.</p>
        )}
        <ul className="space-y-2">
          {filteredCalls.slice(0, 15).map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-neutral-800 bg-neutral-950 p-3 text-sm"
            >
              {editingCallId === c.id && callEditForm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={callEditForm.contractorName}
                    onChange={(e) =>
                      setCallEditForm({ ...callEditForm, contractorName: e.target.value })
                    }
                    className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
                  />
                  <input
                    value={callEditForm.phone}
                    onChange={(e) => setCallEditForm({ ...callEditForm, phone: e.target.value })}
                    placeholder="Phone"
                    className="w-32 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
                  />
                  <button
                    disabled={submitting}
                    onClick={() => saveCallEdit(c.id)}
                    className="rounded-md bg-white px-2 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingCallId(null);
                      setCallEditForm(null);
                    }}
                    className="rounded-md border border-neutral-700 px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex-1">{c.contractorName}</span>
                  <span className="text-neutral-400">{OUTCOME_LABELS[c.outcome]}</span>
                  <span className="text-neutral-500">{format(new Date(c.createdAt), "MMM d, h:mm a")}</span>
                  <button
                    onClick={() => startEditCall(c)}
                    className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                  >
                    Edit
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => deleteCall(c.id)}
                    className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
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
