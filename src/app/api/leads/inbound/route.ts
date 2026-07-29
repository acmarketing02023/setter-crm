import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifySlack, sendLeadConfirmationEmail } from "@/lib/notify";

// ── Public webhook: receives lead submissions from the marketing landing
// page (ac-marketing-landing) and turns them straight into a Booking.
// The booking is auto-assigned to whichever SETTER currently has the
// fewest open (SCHEDULED) bookings, so inbound leads get spread across
// the team instead of piling up under one person. Falls back to the
// OWNER account if there are no setters yet. Owners can always manually
// reassign a booking to a different setter from the dashboard.
//
// Auth model: a shared secret sent in the `x-webhook-secret` header. This
// is NOT a strong security boundary — since the landing page is a static
// site with no server, the secret has to ship in its client-side JS, so
// anyone who views source can read it. It only filters out drive-by/bot
// spam, not a motivated attacker. Once the landing page is deployed on
// Netlify, prefer switching to Netlify's server-side "outgoing webhook"
// form notification (Site settings → Forms → Form notifications), which
// never exposes the secret to the browser, and dropping the client-side
// fetch in script.js.

const ALLOWED_ORIGIN = process.env.LANDING_PAGE_ORIGIN ?? "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// Combine a "YYYY-MM-DD" date with a "h:mm AM/PM" time into a local Date.
function combineDateAndTime(day: string, time: string): Date | null {
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!dayMatch || !timeMatch) return null;

  const [, year, month, date] = dayMatch;
  let [, hourStr, minuteStr, meridiem] = timeMatch;
  let hour = parseInt(hourStr, 10) % 12;
  if (meridiem.toUpperCase() === "PM") hour += 12;

  const result = new Date(
    Number(year),
    Number(month) - 1,
    Number(date),
    hour,
    Number(minuteStr),
    0,
    0
  );
  return Number.isNaN(result.getTime()) ? null : result;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!process.env.LANDING_PAGE_WEBHOOK_SECRET || secret !== process.env.LANDING_PAGE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders() });
  }

  const { name, email, phone, niche, preferred_day, preferred_time } = body as {
    name?: string;
    email?: string;
    phone?: string;
    niche?: string;
    preferred_day?: string;
    preferred_time?: string;
  };

  if (!name || !phone || !preferred_day || !preferred_time) {
    return NextResponse.json(
      { error: "name, phone, preferred_day, and preferred_time are required" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const scheduledAt = combineDateAndTime(preferred_day, preferred_time);
  if (!scheduledAt) {
    return NextResponse.json(
      { error: "Could not parse preferred_day / preferred_time" },
      { status: 400, headers: corsHeaders() }
    );
  }

  // Duplicate guard: if this phone number already has an open (SCHEDULED)
  // booking created in the last 24h, treat this as a re-submit rather than
  // creating a second appointment for the same lead.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.booking.findFirst({
    where: { phone, status: "SCHEDULED", createdAt: { gte: dayAgo } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return NextResponse.json(
      { id: existing.id, duplicate: true },
      { status: 200, headers: corsHeaders() }
    );
  }

  // Round-robin: assign to whichever setter currently has the fewest open
  // bookings. Falls back to the Owner account if no setters exist yet.
  const setters = await prisma.user.findMany({ where: { role: "SETTER" } });
  let assigneeId: string;
  if (setters.length > 0) {
    const loads = await Promise.all(
      setters.map((s) => prisma.booking.count({ where: { setterId: s.id, status: "SCHEDULED" } }))
    );
    let minIndex = 0;
    for (let i = 1; i < loads.length; i++) {
      if (loads[i] < loads[minIndex]) minIndex = i;
    }
    assigneeId = setters[minIndex].id;
  } else {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    if (!owner) {
      return NextResponse.json({ error: "No owner account found" }, { status: 500, headers: corsHeaders() });
    }
    assigneeId = owner.id;
  }

  const booking = await prisma.booking.create({
    data: {
      setterId: assigneeId,
      contractorName: niche ? `${name} (${niche})` : name,
      phone,
      scheduledAt,
      setterNotes: `Inbound lead from the website booking form.${email ? ` Email: ${email}.` : ""}${
        niche ? ` Niche: ${niche}.` : ""
      }`,
      closerBriefing: "New inbound lead from the landing page — qualify the business and confirm the appointment before the call.",
      status: "SCHEDULED",
      source: "LANDING_PAGE",
    },
  });

  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  await notifySlack(
    `:bell: New landing page lead: *${booking.contractorName}* (${phone}) — assigned to ${
      assignee?.name ?? "Owner"
    }, scheduled ${scheduledAt.toLocaleString()}`
  );

  if (email) {
    await sendLeadConfirmationEmail(email, { name, scheduledAt });
  }

  return NextResponse.json({ id: booking.id }, { status: 201, headers: corsHeaders() });
}
