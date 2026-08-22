import { prisma } from "@/lib/prisma";
import { syncContactToGHL, createOpportunityInGHL } from "@/lib/ghl";
import { auth } from "@/lib/auth";

/**
 * Sync a call to GHL
 * Creates a contact in GHL and optionally creates an opportunity
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { callId } = body;

    if (!callId) {
      return Response.json({ error: "callId required" }, { status: 400 });
    }

    // Fetch call from database
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { setter: true, booking: true },
    });

    if (!call) {
      return Response.json({ error: "Call not found" }, { status: 404 });
    }

    // Check if already synced
    if (call.ghlContactId) {
      return Response.json({
        success: true,
        message: "Call already synced to GHL",
        ghlContactId: call.ghlContactId,
      });
    }

    // Create contact in GHL
    const ghlContact = await syncContactToGHL({
      firstName: call.contractorName.split(" ")[0],
      lastName: call.contractorName.split(" ").slice(1).join(" ") || "",
      phone: call.phone || undefined,
      source: "Setter CRM - Cold Call",
      customFields: {
        "setter_name": call.setter?.name || "Unknown Setter",
        "call_outcome": call.outcome,
        "call_notes": call.note || "",
        "call_date": call.createdAt.toISOString(),
      },
    });

    if (!ghlContact) {
      return Response.json(
        { error: "Failed to sync contact to GHL" },
        { status: 500 }
      );
    }

    // Update call with GHL contact ID
    await prisma.call.update({
      where: { id: callId },
      data: {
        ghlContactId: ghlContact.id,
        ghlSyncedAt: new Date(),
      },
    });

    // If call resulted in a booking, create opportunity
    if (call.outcome === "BOOKED" && call.booking) {
      // Get pipeline info (for now, using default values - user should set these up in GHL)
      const opportunityData = {
        name: `Booking - ${call.contractorName}`,
        pipelineId: process.env.GHL_DEFAULT_PIPELINE_ID || "", // User needs to set this
        pipelineStageId: process.env.GHL_BOOKED_STAGE_ID || "", // User needs to set this
        value: 3000, // Default value per booking
        source: "Setter CRM",
        customFields: {
          "setter_name": call.setter?.name || "Unknown Setter",
          "booking_date": call.booking.scheduledAt.toISOString(),
          "setter_notes": call.booking.setterNotes,
        },
      };

      const ghlOpportunity = await createOpportunityInGHL(
        ghlContact.id,
        opportunityData
      );

      if (ghlOpportunity) {
        await prisma.call.update({
          where: { id: callId },
          data: {
            ghlOpporturityId: ghlOpportunity.id,
          },
        });
      }
    }

    return Response.json({
      success: true,
      message: "Call synced to GHL",
      ghlContactId: ghlContact.id,
    });
  } catch (error) {
    console.error("Error syncing call to GHL:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing
 */
export async function GET() {
  return Response.json({
    message: "POST a call ID to sync it to GHL",
    example: { callId: "call_123" },
  });
}
