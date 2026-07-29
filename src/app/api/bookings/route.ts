import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: session.user.role === "OWNER" ? {} : { setterId: session.user.id },
    include: { setter: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(bookings);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SETTER") {
    return NextResponse.json({ error: "Only setters can create bookings" }, { status: 403 });
  }

  const body = await request.json();
  const { callId, contractorName, phone, scheduledAt, setterNotes, closerBriefing } = body as {
    callId?: string;
    contractorName?: string;
    phone?: string;
    scheduledAt?: string;
    setterNotes?: string;
    closerBriefing?: string;
  };

  if (!contractorName || !scheduledAt || !setterNotes || !closerBriefing) {
    return NextResponse.json(
      { error: "contractorName, scheduledAt, setterNotes, and closerBriefing are required" },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.create({
    data: {
      callId: callId || null,
      setterId: session.user.id,
      contractorName,
      phone: phone || null,
      scheduledAt: new Date(scheduledAt),
      setterNotes,
      closerBriefing,
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
