import { prisma } from "@/lib/prisma";
import {
  syncContactToGHL,
  createOpportunityInGHL,
  createAppointmentInGHL,
  updateOpportunityStageInGHL,
} from "@/lib/ghl";
import { auth } from "@/lib/auth";

/**
 * Sync a booking to GHL
 * Creates/updates a contact, opportunity, and appointment
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return Response.json({ error: "bookingId required" }, { status: 400 });
    }

    // Fetch booking from database
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { setter: true, call: true },
    });

    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if already synced
    if (booking.ghlContactId && booking.ghlOpportunityId) {
      return Response.json({
        success: true,
        message: "Booking already synced to GHL",
        ghlContactId: booking.ghlContactId,
        ghlOpportunityId: booking.ghlOpportunityId,
      });
    }

    let ghlContactId = booking.ghlContactId;

    // Create or get contact
    if (!ghlContactId) {
      const ghlContact = await syncContactToGHL({
        firstName: booking.contractorName.split(" ")[0],
        lastName: booking.contractorName.split(" ").slice(1).join(" ") || "",
        email: undefined, // Would need to add to schema
        phone: booking.phone || undefined,
        source: "Setter CRM - Booking",
        customFields: {
          "setter_name": booking.setter.name,
          "closer_briefing": booking.closerBriefing,
        },
      });

      if (!ghlContact) {
        return Response.json(
          { error: "Failed to create contact in GHL" },
          { status: 500 }
        );
      }

      ghlContactId = ghlContact.id;

      await prisma.booking.update({
        where: { id: bookingId },
        data: { ghlContactId },
      });
    }

    // Create opportunity if not already created
    let ghlOpportunityId = booking.ghlOpportunityId;

    if (!ghlOpportunityId) {
      // Map booking status to GHL pipeline stage
      const stageMapping: Record<string, string> = {
        SCHEDULED: process.env.GHL_SCHEDULED_STAGE_ID || "",
        WON: process.env.GHL_WON_STAGE_ID || "",
        LOST: process.env.GHL_LOST_STAGE_ID || "",
        CANCELED: process.env.GHL_CANCELED_STAGE_ID || "",
      };

      const pipelineStageId = stageMapping[booking.status] || "";

      const opportunityData = {
        name: `Booking - ${booking.contractorName} - ${booking.scheduledAt.toDateString()}`,
        pipelineId: process.env.GHL_DEFAULT_PIPELINE_ID || "",
        pipelineStageId,
        value: 3000, // Default booking value
        source: booking.source,
        customFields: {
          "setter_name": booking.setter.name,
          "booking_status": booking.status,
          "setter_notes": booking.setterNotes,
        },
      };

      const ghlOpportunity = await createOpportunityInGHL(
        ghlContactId,
        opportunityData
      );

      if (!ghlOpportunity) {
        return Response.json(
          { error: "Failed to create opportunity in GHL" },
          { status: 500 }
        );
      }

      ghlOpportunityId = ghlOpportunity.id;

      await prisma.booking.update({
        where: { id: bookingId },
        data: { ghlOpportunityId },
      });
    }

    // Create appointment in GHL
    let ghlAppointmentId = booking.ghlAppointmentId;

    if (!ghlAppointmentId) {
      const startTime = new Date(booking.scheduledAt);
      const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min appointment

      const appointmentData = {
        title: `Meeting - ${booking.contractorName}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: booking.setterNotes || "",
        customerId: ghlContactId,
        customFields: {
          "booking_id": bookingId,
          "setter_name": booking.setter.name,
        },
      };

      const ghlAppointment = await createAppointmentInGHL(appointmentData);

      if (ghlAppointment) {
        ghlAppointmentId = ghlAppointment.id;

        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            ghlAppointmentId,
            ghlSyncedAt: new Date(),
          },
        });
      }
    }

    return Response.json({
      success: true,
      message: "Booking synced to GHL",
      ghlContactId,
      ghlOpportunityId,
      ghlAppointmentId,
    });
  } catch (error) {
    console.error("Error syncing booking to GHL:", error);
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
    message: "POST a booking ID to sync it to GHL",
    example: { bookingId: "booking_123" },
  });
}
