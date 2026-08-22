/**
 * Automatic GHL sync helper
 * Handles background syncing of calls and bookings to GHL
 */

import {
  syncContactToGHL,
  createOpportunityInGHL,
  createAppointmentInGHL,
} from "./ghl";
import { prisma } from "./prisma";

/**
 * Auto-sync a newly created call to GHL
 * Runs in background, doesn't block the response
 */
export async function autoSyncCallToGHL(callId: string) {
  try {
    // Check if GHL is configured
    if (!process.env.GHL_API_KEY) {
      console.log("GHL not configured, skipping sync");
      return;
    }

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { setter: true },
    });

    if (!call || call.ghlContactId) {
      return; // Already synced or not found
    }

    // Create contact in GHL
    const ghlContact = await syncContactToGHL({
      firstName: call.contractorName.split(" ")[0],
      lastName: call.contractorName.split(" ").slice(1).join(" ") || "",
      phone: call.phone || undefined,
      source: "Setter CRM - Cold Call",
      customFields: {
        setter_name: call.setter?.name || "Unknown Setter",
        call_outcome: call.outcome,
        call_notes: call.note || "",
        call_date: call.createdAt.toISOString(),
      },
    });

    if (ghlContact) {
      await prisma.call.update({
        where: { id: callId },
        data: {
          ghlContactId: ghlContact.id,
          ghlSyncedAt: new Date(),
        },
      });

      console.log("Auto-synced call to GHL:", callId);
    }
  } catch (error) {
    console.error("Error auto-syncing call to GHL:", error);
  }
}

/**
 * Auto-sync a newly created booking to GHL
 * Runs in background, doesn't block the response
 */
export async function autoSyncBookingToGHL(bookingId: string) {
  try {
    // Check if GHL is configured
    if (!process.env.GHL_API_KEY) {
      console.log("GHL not configured, skipping sync");
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { setter: true },
    });

    if (!booking) {
      return; // Not found
    }

    let ghlContactId = booking.ghlContactId;

    // Create contact if needed
    if (!ghlContactId) {
      const ghlContact = await syncContactToGHL({
        firstName: booking.contractorName.split(" ")[0],
        lastName: booking.contractorName.split(" ").slice(1).join(" ") || "",
        phone: booking.phone || undefined,
        source: "Setter CRM - Booking",
        customFields: {
          setter_name: booking.setter?.name || "Unknown Setter",
          closer_briefing: booking.closerBriefing,
        },
      });

      if (!ghlContact) {
        return;
      }

      ghlContactId = ghlContact.id;

      await prisma.booking.update({
        where: { id: bookingId },
        data: { ghlContactId },
      });
    }

    // Create opportunity
    if (!booking.ghlOpportunityId) {
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
        value: 3000,
        source: booking.source,
        customFields: {
          setter_name: booking.setter?.name || "Unknown Setter",
          booking_status: booking.status,
          setter_notes: booking.setterNotes,
        },
      };

      const ghlOpportunity = await createOpportunityInGHL(
        ghlContactId,
        opportunityData
      );

      if (ghlOpportunity) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { ghlOpportunityId: ghlOpportunity.id },
        });
      }
    }

    // Create appointment
    if (!booking.ghlAppointmentId) {
      const startTime = new Date(booking.scheduledAt);
      const endTime = new Date(startTime.getTime() + 30 * 60000);

      const appointmentData = {
        title: `Meeting - ${booking.contractorName}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: booking.setterNotes || "",
        customerId: ghlContactId,
        customFields: {
          booking_id: bookingId,
          setter_name: booking.setter?.name || "Unknown Setter",
        },
      };

      const ghlAppointment = await createAppointmentInGHL(appointmentData);

      if (ghlAppointment) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            ghlAppointmentId: ghlAppointment.id,
            ghlSyncedAt: new Date(),
          },
        });
      }
    }

    console.log("Auto-synced booking to GHL:", bookingId);
  } catch (error) {
    console.error("Error auto-syncing booking to GHL:", error);
  }
}
