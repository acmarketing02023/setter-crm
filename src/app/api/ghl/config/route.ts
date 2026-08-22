import { auth } from "@/lib/auth";
import { getAccountPipelines } from "@/lib/ghl";

/**
 * Get GHL configuration and pipelines
 * Allows owner to configure which pipeline stages map to booking statuses
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owner can access this
    if (session.user.role !== "OWNER") {
      return Response.json({ error: "Only owner can access" }, { status: 403 });
    }

    // Fetch available pipelines from GHL
    const pipelines = await getAccountPipelines();

    return Response.json({
      success: true,
      configured: {
        defaultPipelineId: process.env.GHL_DEFAULT_PIPELINE_ID || null,
        stageIds: {
          scheduled: process.env.GHL_SCHEDULED_STAGE_ID || null,
          won: process.env.GHL_WON_STAGE_ID || null,
          lost: process.env.GHL_LOST_STAGE_ID || null,
          canceled: process.env.GHL_CANCELED_STAGE_ID || null,
        },
      },
      availablePipelines: pipelines || [],
      instructions: {
        1: "Choose a pipeline from availablePipelines",
        2: "Find the stage IDs for each booking status (SCHEDULED, WON, LOST, CANCELED)",
        3: "Add these environment variables to your .env or Vercel settings:",
        4: "GHL_DEFAULT_PIPELINE_ID, GHL_SCHEDULED_STAGE_ID, GHL_WON_STAGE_ID, GHL_LOST_STAGE_ID, GHL_CANCELED_STAGE_ID",
      },
    });
  } catch (error) {
    console.error("Error fetching GHL config:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
