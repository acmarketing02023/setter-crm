import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeCallStats } from "@/lib/stats";
import { Header } from "@/components/Header";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import type { Call, Booking, User } from "@prisma/client";

export default async function OwnerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/setter");

  const CALLS_PAGE_SIZE = 50;

  // Fetch data sequentially to isolate any errors
  let callsPage: (Call & { setter: { name: string } })[] = [];
  let bookings: (Booking & { setter: { name: string } })[] = [];
  let setters: { id: string; name: string }[] = [];

  try {
    callsPage = await prisma.call.findMany({
      orderBy: { createdAt: "desc" },
      include: { setter: { select: { name: true } } },
      take: CALLS_PAGE_SIZE + 1,
    });
  } catch (e) {
    console.error("Error fetching calls:", e);
    callsPage = [];
  }

  try {
    bookings = await prisma.booking.findMany({
      orderBy: { scheduledAt: "asc" },
      include: { setter: { select: { name: true } } },
    });
  } catch (e) {
    console.error("Error fetching bookings:", e);
    bookings = [];
  }

  try {
    setters = await prisma.user.findMany({
      where: { role: { in: ["SETTER", "OWNER"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (e) {
    console.error("Error fetching setters:", e);
    setters = [];
  }

  const hasMoreCalls = callsPage.length > CALLS_PAGE_SIZE;
  const calls = callsPage.slice(0, CALLS_PAGE_SIZE);

  const stats = computeCallStats(calls);

  return (
    <div className="flex min-h-screen flex-col">
      <Header name={session.user.name ?? "Owner"} role={session.user.role} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <OwnerDashboard
          stats={stats}
          calls={calls.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            setterName: c.setter.name,
          }))}
          hasMoreCalls={hasMoreCalls}
          bookings={bookings.map((b) => ({
            ...b,
            scheduledAt: b.scheduledAt.toISOString(),
            createdAt: b.createdAt.toISOString(),
            viewedAt: b.viewedAt ? b.viewedAt.toISOString() : null,
            setter: { name: b.setter.name },
          }))}
          setters={setters}
        />
      </main>
    </div>
  );
}
