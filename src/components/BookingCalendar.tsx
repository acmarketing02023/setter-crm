"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";

type Booking = {
  id: string;
  contractorName: string;
  phone: string | null;
  scheduledAt: string;
  status: string;
  setter: { name: string };
};

export function BookingCalendar({ bookings }: { bookings: Booking[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group bookings by day
  const bookingsByDay = new Map<string, Booking[]>();
  bookings.forEach((booking) => {
    const day = format(new Date(booking.scheduledAt), "yyyy-MM-dd");
    if (!bookingsByDay.has(day)) {
      bookingsByDay.set(day, []);
    }
    bookingsByDay.get(day)!.push(booking);
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
              )
            }
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
              )
            }
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-neutral-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for days before month starts */}
        {paddingDays.map((_, i) => (
          <div key={`padding-${i}`} className="aspect-square" />
        ))}

        {/* Days of month */}
        {daysInMonth.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDay.get(dayStr) || [];
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dayStr}
              className={`min-h-40 rounded-lg border p-2 ${
                isToday
                  ? "border-red-600 bg-red-950/20"
                  : "border-neutral-700 bg-neutral-800/40"
              } flex flex-col`}
            >
              <div
                className={`mb-1 text-xs font-semibold ${
                  isToday ? "text-red-500" : "text-neutral-400"
                }`}
              >
                {format(day, "d")}
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`rounded px-2 py-1.5 text-xs space-y-0.5 ${
                      booking.status === "SCHEDULED"
                        ? "bg-blue-900/40 text-blue-200"
                        : booking.status === "WON"
                        ? "bg-emerald-900/40 text-emerald-200"
                        : booking.status === "LOST"
                        ? "bg-red-900/40 text-red-200"
                        : "bg-neutral-700/40 text-neutral-300"
                    }`}
                    title={`${booking.contractorName} - ${booking.setter.name} - ${booking.phone || "no phone"}`}
                  >
                    <div className="font-semibold truncate text-xs leading-tight">
                      {booking.contractorName.length > 20
                        ? booking.contractorName.substring(0, 17) + "..."
                        : booking.contractorName}
                    </div>
                    <div className="text-xs opacity-90">
                      {format(new Date(booking.scheduledAt), "h:mm a")}
                    </div>
                    <div className="text-xs opacity-75">
                      {booking.setter.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-600"></div>
          <span className="text-neutral-300">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-600"></div>
          <span className="text-neutral-300">Won</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-neutral-500"></div>
          <span className="text-neutral-300">Lost</span>
        </div>
      </div>
    </div>
  );
}
