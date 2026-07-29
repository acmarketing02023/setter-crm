import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { contractorName, phone } = body as { contractorName?: string; phone?: string | null };

  const call = await prisma.call.findUnique({ where: { id } });
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "OWNER" && call.setterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: { contractorName?: string; phone?: string | null } = {};
  if (contractorName !== undefined) {
    if (!contractorName.trim()) {
      return NextResponse.json({ error: "Contractor name can't be empty" }, { status: 400 });
    }
    data.contractorName = contractorName;
  }
  if (phone !== undefined) data.phone = phone || null;

  const updated = await prisma.call.update({ where: { id }, data });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const call = await prisma.call.findUnique({ where: { id } });
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "OWNER" && call.setterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // A call that's linked to a booking should be deleted via the booking
  // (deleting the booking first) to avoid orphaning booking data silently.
  const linkedBooking = await prisma.booking.findUnique({ where: { callId: id } });
  if (linkedBooking) {
    return NextResponse.json(
      { error: "This call has a linked booking. Delete the booking first." },
      { status: 409 }
    );
  }

  await prisma.call.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
