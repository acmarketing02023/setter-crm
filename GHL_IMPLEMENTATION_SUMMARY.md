# GoHighLevel Integration - Implementation Summary

## ✅ What's Been Built

### Complete Bidirectional Data Sync Architecture

#### 1. **Automatic Call Syncing** 
When a setter logs a call in Setter CRM:
- ✅ Contact is automatically created in GHL
- ✅ If outcome is "BOOKED", an Opportunity is created in your selected pipeline
- ✅ All metadata synced: setter name, call outcome, notes, date
- ✅ No blocking - happens in background

#### 2. **Automatic Booking Syncing**
When a setter creates a booking in Setter CRM:
- ✅ Contact is created/updated in GHL
- ✅ Opportunity is created in your pipeline (stage mapped to booking status)
- ✅ Calendar appointment is created in GHL
- ✅ Syncs: contractor name, phone, setter notes, closer briefing, scheduled date
- ✅ Background processing doesn't block API response

#### 3. **Webhook Receiver for GHL → Setter CRM**
Handles incoming data from GHL:
- ✅ **New Contacts from Web Forms** - Auto-creates calls in Setter CRM, assigned to first available setter
- ✅ **Pipeline Stage Changes** - Updates booking status when opportunity moves between stages
- ✅ **Appointment Status Changes** - Syncs appointment confirmations/completions back to bookings

### Database Schema Updates
Added GHL tracking fields to both Call and Booking models:
```
ghlContactId    String?      # GHL Contact ID
ghlOpportunityId String?     # GHL Deal/Opportunity ID
ghlAppointmentId String?     # GHL Calendar Appointment ID
ghlSyncedAt      DateTime?   # Last sync timestamp
```

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ghl/sync/call` | POST | Manually sync an existing call to GHL |
| `/api/ghl/sync/booking` | POST | Manually sync an existing booking to GHL |
| `/api/ghl/webhooks` | POST | Receive webhooks from GHL |
| `/api/ghl/config` | GET | View available pipelines (owner only) |

### Configuration Files
- ✅ `src/lib/ghl.ts` - GHL API client with all integration methods
- ✅ `src/lib/ghl-sync.ts` - Auto-sync helper functions for background processing
- ✅ `GHL_INTEGRATION_SETUP.md` - Complete setup guide

## 📋 Next Steps for You (To Complete Setup)

### Step 1: Verify Credentials (Already Set)
Your GHL API credentials are configured:
- ✅ API Key: `pit-a4fd26c5-bb41-4e97-96f1-76492e47ab71`
- ✅ Account ID: `iH9D0GQBU9VU7Xwald6j`

### Step 2: Identify Your Pipeline and Stages
1. Log into GoHighLevel
2. Go to **Pipelines** (usually under Contacts or Settings)
3. Choose the pipeline you want for Setter CRM bookings
4. Get the pipeline ID and note the stage IDs for:
   - **SCHEDULED** - For new/pending appointments (e.g., "New Lead", "Scheduled")
   - **WON** - For completed/successful bookings (e.g., "Closed/Won")
   - **LOST** - For lost/declined prospects (e.g., "Lost", "Not Interested")
   - **CANCELED** - For cancelled appointments (e.g., "Canceled", "No Show")

### Step 3: Configure Environment Variables in Vercel
1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. Add these variables:

```
GHL_DEFAULT_PIPELINE_ID=<your_pipeline_id>
GHL_SCHEDULED_STAGE_ID=<stage_id_for_scheduled>
GHL_WON_STAGE_ID=<stage_id_for_won>
GHL_LOST_STAGE_ID=<stage_id_for_lost>
GHL_CANCELED_STAGE_ID=<stage_id_for_canceled>
```

### Step 4: Set Up Webhooks in GHL
1. In GHL, go to **Settings** → **Integrations** → **Webhooks**
2. Create a new webhook:
   - **URL**: `https://your-domain.vercel.app/api/ghl/webhooks`
   - **Secret**: Can be any string (update `GHL_WEBHOOK_SECRET` in Vercel env vars if different)
   - **Events**: Select these:
     - `contact.created`
     - `contact.updated`
     - `opportunity.stage.changed`
     - `appointment.status.changed`

3. Test the webhook to confirm connection

### Step 5: Deploy & Test
1. Your code is already pushed to GitHub
2. Vercel will auto-deploy when you add environment variables
3. Test with the procedures below

## 🧪 Testing the Integration

### Test 1: Log a Call and Verify GHL Sync
```bash
# Your setters can log a call normally in the UI
# Or test via API:
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

**Expected Results:**
- Call appears in Setter CRM ✓
- Contact created in GHL ✓
- Opportunity created in your pipeline (since outcome is BOOKED) ✓

### Test 2: Create a Booking and Verify GHL Sync
Log in as a setter and create a booking through the UI.

**Expected Results:**
- Booking appears in Setter CRM ✓
- Contact created in GHL ✓
- Opportunity created in correct pipeline stage ✓
- Appointment appears in GHL Calendar ✓

### Test 3: Change Pipeline Stage in GHL
1. Log into GHL
2. Find the opportunity for your test booking
3. Move it to a different stage (e.g., from "Scheduled" to "Won")

**Expected Results:**
- Booking status updates in Setter CRM ✓
- Happens within seconds ✓

### Test 4: Submit a Web Form in GHL
If you have a landing page form in GHL:
1. Submit a form
2. Check Setter CRM's calls list

**Expected Results:**
- New call created automatically ✓
- Assigned to first available setter ✓
- Shows as "CALLBACK" outcome ✓

## 🔄 How the Data Flows

### Scenario 1: Setter Logs a Call
```
Setter logs call in UI
    ↓
Call created in Setter CRM database
    ↓
Background GHL sync starts (non-blocking)
    ↓
Contact created in GHL
    ↓
If outcome=BOOKED: Opportunity created
    ↓
Sync marked complete with timestamp
```

### Scenario 2: Booking Created
```
Setter creates booking in UI
    ↓
Booking created in Setter CRM database
    ↓
Background GHL sync starts (non-blocking)
    ↓
Contact created (or reused if exists)
    ↓
Opportunity created with booking status → pipeline stage mapping
    ↓
Appointment created on GHL Calendar
    ↓
All GHL IDs stored for future updates
```

### Scenario 3: GHL Webhook Received
```
Contact created in GHL (from web form)
    ↓
GHL sends webhook to /api/ghl/webhooks
    ↓
Signature verified
    ↓
Call created in Setter CRM
    ↓
Assigned to first available setter
    ↓
Marked as "CALLBACK" outcome
```

## 📊 Configuration Reference

### Environment Variables (Set in Vercel)
```bash
# Already set (don't change):
GHL_API_KEY="pit-a4fd26c5-bb41-4e97-96f1-76492e47ab71"
GHL_ACCOUNT_ID="iH9D0GQBU9VU7Xwald6j"

# You need to set:
GHL_DEFAULT_PIPELINE_ID="..."
GHL_SCHEDULED_STAGE_ID="..."
GHL_WON_STAGE_ID="..."
GHL_LOST_STAGE_ID="..."
GHL_CANCELED_STAGE_ID="..."
GHL_WEBHOOK_SECRET="your-secret-key"
```

### GHL Contact Fields Mapped
When a call is synced:
```
firstName:     From contractor name (first part)
lastName:      From contractor name (remaining parts)
phone:         From call phone field
source:        "Setter CRM - Cold Call" or "Setter CRM - Booking"
customFields:
  - setter_name:       Name of setter who logged it
  - call_outcome:      NO_ANSWER, NOT_INTERESTED, CALLBACK, BOOKED
  - call_notes:        Notes from the call
  - call_date:         When the call was logged
```

### GHL Opportunity (Deal) Fields Mapped
When a booking is synced:
```
name:           "Booking - {contractor} - {date}"
value:          $3,000 (can be customized)
pipelineId:     Your selected pipeline
pipelineStageId: Mapped from booking status
source:         "Setter CRM"
customFields:
  - setter_name:       Name of setter
  - booking_status:    SCHEDULED, WON, LOST, CANCELED
  - setter_notes:      Notes from setter
```

## 🐛 Troubleshooting

### Calls/Bookings Not Syncing
1. Check Vercel logs: Dashboard → Logs
2. Verify `GHL_API_KEY` and `GHL_ACCOUNT_ID` are set
3. Verify credentials are correct in GHL

### Wrong Stage Mapping
- Ensure all stage IDs are set in Vercel environment
- Stage IDs should be from your chosen pipeline
- Verify booking status values (SCHEDULED, WON, LOST, CANCELED)

### Webhooks Not Received
- Verify webhook URL is correct and public
- Check webhook secret matches in GHL
- Review GHL webhook delivery logs

### Duplicate Contacts
- System checks `ghlContactId` to prevent duplicates
- If a contact exists, it reuses the same one

## 📚 Additional Resources

- **Setup Guide**: See `GHL_INTEGRATION_SETUP.md` for detailed instructions
- **API Documentation**: Visit `/api/ghl/config` endpoint to see available pipelines
- **Server Logs**: Check Vercel logs for detailed error messages during sync

## 🎯 What's Automated vs Manual

### Automated (Happens in Background)
- ✅ Call → GHL Contact sync
- ✅ Booking → GHL Contact + Opportunity + Appointment sync
- ✅ Webhook reception and processing
- ✅ Deduplication checks
- ✅ Status updates when pipeline stage changes

### Manual (You Configure)
- 🔧 Pipeline selection in GHL
- 🔧 Stage ID mapping in environment variables
- 🔧 Webhook URL configuration in GHL
- 🔧 Testing and verification

## 📝 Summary

You now have a fully integrated Setter CRM ↔ GoHighLevel system with:
- Automatic two-way data sync
- Zero manual data entry between systems
- Real-time updates
- Complete audit trail (ghlContactId, ghlOpportunityId, ghlSyncedAt)

The remaining work is configuration-specific to your GHL account (identifying pipeline and stage IDs) which is covered in the setup guide.

---

**Questions or Issues?**
Check the troubleshooting section or review server logs in Vercel dashboard.
