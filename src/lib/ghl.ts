// GoHighLevel API Integration
const GHL_API_BASE_URL = "https://rest.gohighlevel.com/v1";
const GHL_API_KEY = process.env.GHL_API_KEY || "";
const GHL_ACCOUNT_ID = process.env.GHL_ACCOUNT_ID || "";

export interface GHLContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  customFields?: Record<string, any>;
}

export interface GHLOpportunity {
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  value?: number;
  source?: string;
  customFields?: Record<string, any>;
}

export interface GHLAppointment {
  title: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  description?: string;
  customerId: string; // Contact ID in GHL
  customFields?: Record<string, any>;
}

/**
 * Create or update a contact in GHL
 */
export async function syncContactToGHL(
  data: GHLContact
): Promise<{ id: string } | null> {
  if (!GHL_API_KEY || !GHL_ACCOUNT_ID) {
    console.warn("GHL API credentials not configured");
    return null;
  }

  try {
    const response = await fetch(`${GHL_API_BASE_URL}/contacts/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GHL_API_KEY}`,
      },
      body: JSON.stringify({
        ...data,
        source: data.source || "Setter CRM",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to sync contact to GHL:", error);
      return null;
    }

    const result = await response.json();
    return { id: result.contact?.id || result.id };
  } catch (error) {
    console.error("Error syncing contact to GHL:", error);
    return null;
  }
}

/**
 * Create an opportunity (deal) in GHL
 */
export async function createOpportunityInGHL(
  contactId: string,
  data: GHLOpportunity
): Promise<{ id: string } | null> {
  if (!GHL_API_KEY || !GHL_ACCOUNT_ID) {
    console.warn("GHL API credentials not configured");
    return null;
  }

  try {
    const response = await fetch(`${GHL_API_BASE_URL}/opportunities/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GHL_API_KEY}`,
      },
      body: JSON.stringify({
        ...data,
        contactId,
        source: data.source || "Setter CRM",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create opportunity in GHL:", error);
      return null;
    }

    const result = await response.json();
    return { id: result.opportunity?.id || result.id };
  } catch (error) {
    console.error("Error creating opportunity in GHL:", error);
    return null;
  }
}

/**
 * Create an appointment in GHL
 */
export async function createAppointmentInGHL(
  data: GHLAppointment
): Promise<{ id: string } | null> {
  if (!GHL_API_KEY || !GHL_ACCOUNT_ID) {
    console.warn("GHL API credentials not configured");
    return null;
  }

  try {
    const response = await fetch(`${GHL_API_BASE_URL}/calendars/events/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GHL_API_KEY}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create appointment in GHL:", error);
      return null;
    }

    const result = await response.json();
    return { id: result.event?.id || result.id };
  } catch (error) {
    console.error("Error creating appointment in GHL:", error);
    return null;
  }
}

/**
 * Update opportunity stage in GHL
 */
export async function updateOpportunityStageInGHL(
  opportunityId: string,
  pipelineStageId: string
): Promise<boolean> {
  if (!GHL_API_KEY || !GHL_ACCOUNT_ID) {
    console.warn("GHL API credentials not configured");
    return false;
  }

  try {
    const response = await fetch(
      `${GHL_API_BASE_URL}/opportunities/${opportunityId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GHL_API_KEY}`,
        },
        body: JSON.stringify({
          pipelineStageId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to update opportunity in GHL:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating opportunity in GHL:", error);
    return false;
  }
}

/**
 * Get account pipelines for mapping booking stages
 */
export async function getAccountPipelines(): Promise<any[] | null> {
  if (!GHL_API_KEY || !GHL_ACCOUNT_ID) {
    console.warn("GHL API credentials not configured");
    return null;
  }

  try {
    console.log("Calling GHL API:", `${GHL_API_BASE_URL}/pipelines/`);
    const response = await fetch(`${GHL_API_BASE_URL}/pipelines/`, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
      },
    });

    console.log("GHL API Response status:", response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to fetch pipelines from GHL. Status:", response.status, "Error:", error);
      return null;
    }

    const result = await response.json();
    console.log("GHL API Response body:", JSON.stringify(result));
    return result.pipelines || [];
  } catch (error) {
    console.error("Error fetching pipelines from GHL:", error);
    return null;
  }
}
