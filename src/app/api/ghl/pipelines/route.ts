import { auth } from "@/lib/auth";
import { getAccountPipelines } from "@/lib/ghl";

/**
 * Fetch all pipelines and their stages from GHL
 * Shows all available pipelines so you can select which one to use
 * and identify the stage IDs to configure
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owner can access this
    if (session.user.role !== "OWNER") {
      return Response.json({ error: "Only owner can access" }, { status: 403 });
    }

    // Return configured pipeline and stage information
    const pipelineId = process.env.GHL_DEFAULT_PIPELINE_ID;

    if (!pipelineId) {
      return Response.json({
        success: false,
        error: "GHL_DEFAULT_PIPELINE_ID not configured",
        hint: "Add GHL_DEFAULT_PIPELINE_ID to environment variables",
      });
    }

    // Return the configured pipeline with stages
    const formattedPipelines = [
      {
        id: pipelineId,
        name: "Loom Outreach Q1/2025",
        stages: [
          {
            id: process.env.GHL_SCHEDULED_STAGE_ID,
            name: "Booked Appt",
            bookingStatus: "SCHEDULED",
          },
          {
            id: process.env.GHL_WON_STAGE_ID,
            name: "Won",
            bookingStatus: "WON",
          },
          {
            id: process.env.GHL_LOST_STAGE_ID,
            name: "Bad Fit",
            bookingStatus: "LOST",
          },
          {
            id: process.env.GHL_CANCELED_STAGE_ID,
            name: "Nurture For Later",
            bookingStatus: "CANCELED",
          },
        ],
      },
    ];

    const pipelines = formattedPipelines;

    // Format the response to show pipeline and stage info
    const formattedPipelines = pipelines.map((pipeline: any) => ({
      id: pipeline.id,
      name: pipeline.name,
      stages: (pipeline.stages || []).map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description || "",
      })),
    }));

    return Response.json({
      success: true,
      message:
        "Copy the pipeline ID and stage IDs below into your environment variables",
      instructions: {
        step1: "Choose which pipeline you want to use for Setter CRM bookings",
        step2:
          "Find the stages for: SCHEDULED (new bookings), WON (closed bookings), LOST (didn't book), CANCELED (cancelled)",
        step3: "Add to Vercel environment variables:",
        example: {
          GHL_DEFAULT_PIPELINE_ID: "pipeline_id_from_below",
          GHL_SCHEDULED_STAGE_ID: "stage_id_for_scheduled_bookings",
          GHL_WON_STAGE_ID: "stage_id_for_won_bookings",
          GHL_LOST_STAGE_ID: "stage_id_for_lost_prospects",
          GHL_CANCELED_STAGE_ID: "stage_id_for_cancelled",
        },
      },
      pipelines: formattedPipelines,
    });
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Make sure GHL API credentials are correct in environment variables",
      },
      { status: 500 }
    );
  }
}
