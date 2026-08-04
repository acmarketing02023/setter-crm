import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifySlack } from "@/lib/notify";
import { CallOutcome } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take")) || 50, 100);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const calls = await prisma.call.findMany({
    where: session.user.role === "OWNER" ? {} : { setterId: session.user.id },
    include: { setter: { select: { name: true } }, booking: true },
    orderBy: { createdAt: "desc" },
    skip,
    take: take + 1,
  });

  const hasMore = calls.length > take;
  return NextResponse.json({ calls: calls.slice(0, take), hasMore });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SETTER") {
    return NextResponse.json({ error: "Only setters can log calls" }, { status: 403 });
  }

  const body = await request.json();
  const { contractorName, phone, outcome, note } = body as {
    contractorName?: string;
    phone?: string;
    outcome?: CallOutcome;
    note?: string;
  };

  if (!contractorName || !outcome) {
    return NextResponse.json({ error: "contractorName and outcome are required" }, { status: 400 });
  }

  if (!Object.values(CallOutcome).includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const call = await prisma.call.create({
    data: {
      setterId: session.user.id,
      contractorName,
      phone: phone || null,
      outcome,
      note: note || null,
    },
  });

  // Notify Slack of the logged call (for booked outcomes)
  if (outcome === "BOOKED") {
    await notifySlack(
      `:phone: Call logged by ${session.user.name}: *${contractorName}* (${phone || "no phone"}) — ${outcome}`
    );
  }

  return NextResponse.json(call, { status: 201 });
}
