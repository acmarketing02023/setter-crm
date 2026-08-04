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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
              )
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Today
          </button>
          <button
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
              )
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
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
            className="py-2 text-center text-xs font-semibold text-gray-600"
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
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 bg-gray-50"
              } flex flex-col`}
            >
              <div
                className={`mb-1 text-xs font-semibold ${
                  isToday ? "text-red-600" : "text-gray-600"
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
                        ? "bg-blue-100 text-blue-900"
                        : booking.status === "WON"
                        ? "bg-emerald-100 text-emerald-900"
                        : booking.status === "LOST"
                        ? "bg-red-100 text-red-900"
                        : "bg-gray-200 text-gray-900"
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
          <div className="h-3 w-3 rounded bg-blue-500"></div>
          <span className="text-gray-700">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-emerald-500"></div>
          <span className="text-gray-700">Won</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-500"></div>
          <span className="text-gray-700">Lost</span>
        </div>
      </div>
    </div>
  );
}
