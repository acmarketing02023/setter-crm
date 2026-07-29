import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const {
    status,
    contractorName,
    phone,
    scheduledAt,
    setterNotes,
    closerBriefing,
    markViewed,
    setterId,
  } = body as {
    status?: BookingStatus;
    contractorName?: string;
    phone?: string | null;
    scheduledAt?: string;
    setterNotes?: string;
    closerBriefing?: string;
    markViewed?: boolean;
    setterId?: string;
  };

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = session.user.role === "OWNER";
  const isOwningSetter = booking.setterId === session.user.id;
  if (!isOwner && !isOwningSetter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: {
    status?: BookingStatus;
    contractorName?: string;
    phone?: string | null;
    scheduledAt?: Date;
    setterNotes?: string;
    closerBriefing?: string;
    viewedAt?: Date;
    setterId?: string;
  } = {};

  if (status !== undefined) {
    if (!Object.values(BookingStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = status;
  }

  if (contractorName !== undefined) {
    if (!contractorName.trim()) {
      return NextResponse.json({ error: "Contractor name can't be empty" }, { status: 400 });
    }
    data.contractorName = contractorName;
  }
  if (phone !== undefined) data.phone = phone || null;
  if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt);
  if (setterNotes !== undefined) {
    if (!setterNotes.trim()) {
      return NextResponse.json({ error: "Setter notes can't be empty" }, { status: 400 });
    }
    data.setterNotes = setterNotes;
  }
  if (closerBriefing !== undefined) {
    if (!closerBriefing.trim()) {
      return NextResponse.json({ error: "Closer briefing can't be empty" }, { status: 400 });
    }
    data.closerBriefing = closerBriefing;
  }

  // Only the owner viewing a booking marks it as seen.
  if (markViewed && isOwner && !booking.viewedAt) {
    data.viewedAt = new Date();
  }

  // Only the owner can reassign a booking to a different setter.
  if (setterId !== undefined) {
    if (!isOwner) {
      return NextResponse.json({ error: "Only the owner can reassign a booking" }, { status: 403 });
    }
    const target = await prisma.user.findUnique({ where: { id: setterId } });
    if (!target) {
      return NextResponse.json({ error: "Setter not found" }, { status: 400 });
    }
    data.setterId = setterId;
  }

  const updated = await prisma.booking.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "OWNER" && booking.setterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.booking.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
