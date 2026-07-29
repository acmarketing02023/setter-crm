# Database Connection Fix - ACTION REQUIRED

## The Problem
The deployed application (`setter-crm-kappa.vercel.app`) cannot connect to the PostgreSQL database because the `DATABASE_URL` environment variable in Vercel is set to Railway's **internal** address (`postgres.railway.internal`), which is only accessible from within Railway's network. Vercel, being an external service, cannot reach this address.

## Evidence
✅ PostgreSQL schema is working correctly (confirmed by endpoint errors showing PostgreSQL connection attempts, not SQLite validation errors)
❌ Database connectivity failing with: "Can't reach database server at `postgres.railway.internal:5432`"

## The Solution - THREE STEPS

### Step 1: Get the PUBLIC Railway Database URL
1. Go to https://railway.app/dashboard
2. Click on your project
3. Click on the PostgreSQL database
4. Click "Connect" tab
5. Copy the connection string that looks like ONE of these:
   - `postgresql://user:password@gateway.railway.app:5432/railway`
   - `postgresql://user:password@rail.proxy.rlwy.net:5432/railway`
   
   **NOT** the one with `postgres.railway.internal` (that's the internal one currently in use)

### Step 2: Update DATABASE_URL in Vercel
1. Go to https://vercel.com/dashboard
2. Click on setter-crm project
3. Click Settings → Environment Variables
4. Find DATABASE_URL
5. Click the edit (pencil) icon
6. Replace the entire value with the PUBLIC Railway URL you copied in Step 1
7. Click Save
8. Wait for automatic redeploy to complete

### Step 3: Verify the Fix
Run this command to test:
```bash
bash verify-database.sh
```

Or manually test:
```bash
# Should return "status": "ok" and "database": "connected"
curl https://setter-crm-kappa.vercel.app/api/debug/status | jq .

# Should return "success": true
curl -X POST https://setter-crm-kappa.vercel.app/api/seed | jq .
```

## After Verification
Once the database is connected, you can log in to the application:
- **Setter Dashboard**: angelcruzgabriel44@gmail.com / 15598654Aa
- **Owner Dashboard**: acmarketing02023@gmail.com / 64186418Am

## Why This Happened
- Local development uses SQLite (file-based) database
- Production uses PostgreSQL (Railway-hosted)
- Railway provides two URLs:
  - **Internal**: For services within Railway's network (Vercel can't access this)
  - **Public**: For external services like Vercel (this is what we need)

## Architecture Changes Made
1. ✅ Updated Prisma schema to use PostgreSQL (was using SQLite)
2. ✅ Added runtime database initialization on first request
3. ✅ Added manual seed endpoint for database setup
4. ✅ Added debug endpoints to diagnose database issues
5. ❌ Vercel environment variables need updating with correct DATABASE_URL
