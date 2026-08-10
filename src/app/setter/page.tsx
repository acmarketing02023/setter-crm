import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeCallStats } from "@/lib/stats";
import { Header } from "@/components/Header";
import { SetterDashboard } from "@/components/SetterDashboard";

export default async function SetterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SETTER") redirect("/owner");

  const CALLS_PAGE_SIZE = 50;

  const [callsPage, bookings] = await Promise.all([
    prisma.call.findMany({
      where: { setterId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { booking: true },
      take: CALLS_PAGE_SIZE + 1,
    }),
    prisma.booking.findMany({
      where: { setterId: session.user.id },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const hasMoreCalls = callsPage.length > CALLS_PAGE_SIZE;
  const calls = callsPage.slice(0, CALLS_PAGE_SIZE);

  const stats = computeCallStats(calls);

  return (
    <div className="flex min-h-screen flex-col">
      <Header name={session.user.name ?? "Setter"} role={session.user.role} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <SetterDashboard
          stats={stats}
          initialCalls={calls.map((c) => ({ ...c, setterId: c.setterId!, createdAt: c.createdAt.toISOString() }))}
          hasMoreCalls={hasMoreCalls}
          initialBookings={bookings.map((b) => ({
            ...b,
            scheduledAt: b.scheduledAt.toISOString(),
            createdAt: b.createdAt.toISOString(),
            viewedAt: b.viewedAt ? b.viewedAt.toISOString() : null,
          }))}
        />
      </main>
    </div>
  );
}
