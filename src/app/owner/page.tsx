import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeCallStats } from "@/lib/stats";
import { Header } from "@/components/Header";
import { OwnerDashboard } from "@/components/OwnerDashboard";

export default async function OwnerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/setter");

  const CALLS_PAGE_SIZE = 50;

  const [callsPage, bookings, setters] = await Promise.all([
    prisma.call.findMany({
      orderBy: { createdAt: "desc" },
      include: { setter: { select: { name: true } } },
      take: CALLS_PAGE_SIZE + 1,
    }),
    prisma.booking.findMany({
      orderBy: { scheduledAt: "asc" },
      include: { setter: { select: { name: true } } },
    }),
    prisma.user.findMany({
      // Include the Owner too — round-robin falls back to the Owner when no
      // setters exist yet, and the reassign dropdown needs every role that
      // can actually hold a booking's setterId as a selectable option.
      where: { role: { in: ["SETTER", "OWNER"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
