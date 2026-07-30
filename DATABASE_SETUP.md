# Setting Up PostgreSQL for Production

SQLite doesn't work on Vercel's serverless platform. We've switched to PostgreSQL. Follow these steps to get a free database running:

## Quick Setup with Neon (Recommended - 5 minutes)

1. Go to https://neon.tech and click "Sign Up"
2. Sign up with GitHub or email
3. Create a new project (use any name, like "setter-crm")
4. You'll get a connection string that looks like:
   ```
   postgresql://username:password@host/dbname
   ```
5. Copy this entire connection string

## Add Database to Vercel

1. Go to https://vercel.com/dashboard
2. Click on the "setter-crm" project
3. Go to Settings → Environment Variables
4. Add a new variable:
   - Name: `DATABASE_URL`
   - Value: (paste your connection string from Neon)
   - Select: Production, Preview, Development (check all three)
5. Click "Save"

## Redeploy & Test

After adding the environment variable:
1. Vercel will automatically redeploy
2. Wait for "Ready" status
3. Test with: `curl -X POST "https://setter-crm-kappa.vercel.app/api/leads/inbound" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: 0bf0af92295794c8f1d1a99698cf5fa78d7bd4e1b13f5821" \
  -d '{"name":"Test","email":"test@example.com","phone":"555-1234567","preferred_day":"2026-08-05","preferred_time":"2:00 PM"}'`

That's it! Leads will now be stored and emails will be sent.
