# GoHighLevel Integration Setup Guide

This guide walks through setting up the bidirectional sync between Setter CRM and GoHighLevel (GHL).

## What's Included

The integration provides:
- ✅ Auto-sync calls to GHL (creates contacts + opportunities)
- ✅ Auto-sync bookings to GHL (creates/updates contacts + opportunities + appointments)
- ✅ Webhook handling (receives contacts from web forms, pipeline updates, appointment status changes)
- ✅ Bidirectional data flow (both directions)
- ✅ Background sync (doesn't block API responses)

## Step 1: Verify GHL API Credentials

Your GHL credentials are already configured in `.env`:
```
GHL_API_KEY="pit-a4fd26c5-bb41-4e97-96f1-76492e47ab71"
GHL_ACCOUNT_ID="iH9D0GQBU9VU7Xwald6j"
```

These are set and ready to use.

## Step 2: Identify Your Pipeline and Stages

The integration needs to know which GHL pipeline to use and which stages map to your booking statuses.

### Get Pipeline Information

Visit this endpoint to see available pipelines:
```
GET /api/ghl/config
```

This returns all pipelines in your GHL account with their stage IDs.

### Find Your Pipeline

1. Log into GoHighLevel
2. Go to **Pipelines** or **Contacts** → **Pipelines**
3. Find the pipeline you want to use for Setter CRM bookings
4. Note the pipeline ID
5. For each stage (or create stages if needed):
   - **SCHEDULED** - Appointments to come (e.g., "New Lead", "Scheduled Call", "Booked")
   - **WON** - Completed, client won (e.g., "Closed/Won")
   - **LOST** - Failed, client didn't book (e.g., "Lost", "Not Interested")
   - **CANCELED** - Canceled appointment (e.g., "Canceled")

## Step 3: Configure Environment Variables

Add these environment variables to your Vercel project settings:

```bash
GHL_DEFAULT_PIPELINE_ID="your_pipeline_id_here"
GHL_SCHEDULED_STAGE_ID="stage_id_for_scheduled"
GHL_WON_STAGE_ID="stage_id_for_won"
GHL_LOST_STAGE_ID="stage_id_for_lost"
GHL_CANCELED_STAGE_ID="stage_id_for_canceled"
```

## Step 4: Set Up Webhooks in GHL

To receive data FROM GHL (contacts from web forms, pipeline updates, appointment changes):

1. In GoHighLevel, go to **Settings** → **Integrations** → **Webhooks** (or search "Webhooks")
2. Create a new webhook with these settings:
   - **URL**: `https://your-domain.com/api/ghl/webhooks`
   - **Secret**: Use the value from `GHL_WEBHOOK_SECRET` in your env
   - **Events to trigger**:
     - `contact.created`
     - `contact.updated`
     - `opportunity.stage.changed`
     - `appointment.status.changed`

3. Test the webhook connection

## Data Flow Architecture

### 1. Calls → GHL

When a setter logs a call:
1. Call is created in Setter CRM database
2. Background sync automatically:
   - Creates a contact in GHL with contractor details
   - If outcome is "BOOKED", creates an opportunity in the pipeline

**GHL Contact Fields Synced:**
- firstName, lastName
- phone
- source: "Setter CRM - Cold Call"
- customFields: setter_name, call_outcome, call_notes, call_date

### 2. Bookings → GHL

When a setter creates a booking:
1. Booking is created in Setter CRM database
2. Background sync automatically:
   - Creates/updates contact in GHL
   - Creates opportunity in the selected pipeline (mapped to booking status)
   - Creates appointment in GHL calendar

**GHL Opportunity Fields:**
- name: "Booking - {contractor} - {date}"
- value: $3,000 (default booking value)
- pipelineStageId: Mapped from booking status
- customFields: setter_name, booking_status, setter_notes

**GHL Appointment Fields:**
- title: "Meeting - {contractor}"
- startTime: booking.scheduledAt
- endTime: 30 minutes after start
- customFields: booking_id, setter_name

### 3. GHL → Setter CRM (Webhooks)

**Web Form Submissions:**
- Webhook receives new contact from GHL
- Automatically creates a "call" record in Setter CRM
- Assigned to first available setter
- Marked as "CALLBACK" outcome

**Pipeline Stage Changes:**
- When opportunity stage changes in GHL
- Updates corresponding booking status in Setter CRM
- Maintains sync between systems

**Appointment Status Changes:**
- When appointment is confirmed/completed/cancelled in GHL
- Updates booking status accordingly

## Testing the Integration

### Test Call Sync
```bash
curl -X POST https://your-domain.com/api/calls \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{
    "contractorName": "Test Contact",
    "phone": "555-1234",
    "outcome": "BOOKED",
    "note": "Test call"
  }'
```

Monitor the call - it should automatically sync to GHL within seconds.

### Test Booking Sync
```bash
curl -X POST https://your-domain.com/api/bookings \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{
    "contractorName": "Test Client",
    "phone": "555-5678",
    "scheduledAt": "2026-08-25T14:00:00Z",
    "setterNotes": "Test booking",
    "closerBriefing": "Brief for closer"
  }'
```

Check GHL - you should see:
- New contact created
- New opportunity in your pipeline
- New appointment on calendar

### Test Webhook
```bash
curl -X POST https://your-domain.com/api/ghl/webhooks \
  -H "Content-Type: application/json" \
  -H "X-GHL-Signature: test-signature" \
  -d '{
    "type": "contact.created",
    "body": {
      "id": "test_contact_123",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "555-9999",
      "source": "Web Form"
    }
  }'
```

## Troubleshooting

### Calls/bookings not syncing to GHL
1. Check that `GHL_API_KEY` and `GHL_ACCOUNT_ID` are set in Vercel environment
2. Check server logs for sync errors
3. Verify credentials are correct

### Webhook events not received
1. Verify webhook URL is correct and public
2. Check that webhook secret matches in GHL
3. Review webhook delivery logs in GHL

### Wrong pipeline stage mapping
1. Ensure stage IDs are correct in environment variables
2. Verify stage exists in pipeline
3. Check that booking status (SCHEDULED/WON/LOST/CANCELED) matches a configured stage

### Duplicate contacts in GHL
- The system checks `ghlContactId` to avoid duplicates
- If found, will reuse existing contact

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/calls` | POST | Log a call (auto-syncs to GHL) |
| `/api/bookings` | POST | Create booking (auto-syncs to GHL) |
| `/api/ghl/sync/call` | POST | Manually sync existing call |
| `/api/ghl/sync/booking` | POST | Manually sync existing booking |
| `/api/ghl/webhooks` | POST | Receive webhooks from GHL |
| `/api/ghl/config` | GET | View available pipelines |

## Next Steps

1. ✅ Get pipeline and stage IDs from your GHL account
2. ✅ Add environment variables to Vercel
3. ✅ Set up webhooks in GHL
4. ✅ Test with sample calls and bookings
5. ✅ Monitor for successful sync

For support, check server logs in Vercel dashboard for detailed error messages.
