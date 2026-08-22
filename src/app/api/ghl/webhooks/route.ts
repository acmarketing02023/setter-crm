import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import crypto from "crypto";

/**
 * Verify GHL webhook signature
 */
function verifyGHLSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return hash === signature;
}

/**
 * Handle incoming webhooks from GHL
 * - New contacts from web forms
 * - Pipeline stage changes
 * - Appointment status changes
 */
export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("X-GHL-Signature") || "";
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET || "";

    // Verify webhook signature
    if (webhookSecret && !verifyGHLSignature(payload, signature, webhookSecret)) {
      console.warn("Invalid GHL webhook signature");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = JSON.parse(payload);
    const { type, body } = data;

    console.log("Received GHL webhook:", type);

    switch (type) {
      case "contact.created":
      case "contact.updated":
        await handleContactWebhook(body);
        break;

      case "opportunity.stage.changed":
        await handleOpportunityStageChange(body);
        break;

      case "appointment.status.changed":
        await handleAppointmentStatusChange(body);
        break;

      default:
        console.log("Unknown webhook type:", type);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error processing GHL webhook:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Handle new/updated contacts from GHL
 * Maps to creating calls in our system
 */
async function handleContactWebhook(body: any) {
  const {
    id: ghlContactId,
    firstName,
    lastName,
    phone,
    email,
    source,
    customFields,
  } = body;

  if (!ghlContactId) return;

  // Check if this contact already exists in our system
  const existingCall = await prisma.call.findFirst({
    where: { ghlContactId },
  });

  if (existingCall) {
    console.log("Contact already synced:", ghlContactId);
    return;
  }

  // For web form submissions, we want to create a call
  // Assign to the first available setter (Angel Cruz)
  const defaultSetter = await prisma.user.findFirst({
    where: { role: "SETTER" },
  });

  if (!defaultSetter) {
    console.warn("No setter found to assign contact");
    return;
  }

  // Create a call record for this contact
  await prisma.call.create({
    data: {
      setterId: defaultSetter.id,
      contractorName: `${firstName} ${lastName}`.trim(),
      phone: phone || null,
      outcome: "CALLBACK", // Default for new contacts from web forms
      note: `Web form submission - ${source || ""}`,
      ghlContactId,
      ghlSyncedAt: new Date(),
    },
  });

  console.log("Created call from GHL contact:", ghlContactId);
}

/**
 * Handle opportunity stage changes from GHL
 * Updates booking status based on pipeline stage
 */
async function handleOpportunityStageChange(body: any) {
  const { id: ghlOpportunityId, pipelineStageId, name } = body;

  if (!ghlOpportunityId) return;

  // Find booking with this opportunity ID
  const booking = await prisma.booking.findFirst({
    where: { ghlOpportunityId },
  });

  if (!booking) {
    console.log("Booking not found for opportunity:", ghlOpportunityId);
    return;
  }

  // Map GHL pipeline stages to our booking status
  // User needs to set these environment variables:
  // GHL_SCHEDULED_STAGE_ID, GHL_WON_STAGE_ID, GHL_LOST_STAGE_ID, GHL_CANCELED_STAGE_ID
  const stageToStatus: Record<string, any> = {
    [process.env.GHL_SCHEDULED_STAGE_ID || ""]: "SCHEDULED",
    [process.env.GHL_WON_STAGE_ID || ""]: "WON",
    [process.env.GHL_LOST_STAGE_ID || ""]: "LOST",
    [process.env.GHL_CANCELED_STAGE_ID || ""]: "CANCELED",
  };

  const newStatus = stageToStatus[pipelineStageId];

  if (newStatus && newStatus !== booking.status) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: newStatus },
    });

    console.log(`Updated booking ${booking.id} to status: ${newStatus}`);
  }
}

/**
 * Handle appointment status changes from GHL
 * Updates booking status based on appointment confirmation
 */
async function handleAppointmentStatusChange(body: any) {
  const { id: ghlAppointmentId, status, customerId } = body;

  if (!ghlAppointmentId) return;

  // Find booking with this appointment ID
  const booking = await prisma.booking.findFirst({
    where: { ghlAppointmentId },
  });

  if (!booking) {
    console.log("Booking not found for appointment:", ghlAppointmentId);
    return;
  }

  // Map appointment status to booking status
  const statusMapping: Record<string, BookingStatus> = {
    confirmed: "SCHEDULED",
    completed: "WON",
    cancelled: "CANCELED",
    no_show: "LOST",
  };

  const newStatus = statusMapping[status?.toLowerCase()];

  if (newStatus && newStatus !== booking.status) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: newStatus as BookingStatus },
    });

    console.log(`Updated booking ${booking.id} to status: ${newStatus}`);
  }
}

/**
 * GET endpoint for testing
 */
export async function GET() {
  return Response.json({
    message: "GHL Webhook endpoint",
    expectedHeaders: {
      "X-GHL-Signature": "HMAC-SHA256 signature",
    },
    supportedWebhooks: [
      "contact.created",
      "contact.updated",
      "opportunity.stage.changed",
      "appointment.status.changed",
    ],
  });
}
