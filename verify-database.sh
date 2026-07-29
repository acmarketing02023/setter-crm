#!/bin/bash

# Database Connection Verification Script
# This script tests if the deployed application can connect to the database

set -e

echo "🔍 Vercel Setter CRM Database Connection Test"
echo "=============================================="
echo ""

APP_URL="https://setter-crm-kappa.vercel.app"

echo "1️⃣  Testing database status endpoint..."
STATUS_RESPONSE=$(curl -s "$APP_URL/api/debug/status")
echo "Response: $STATUS_RESPONSE"
echo ""

# Check if connection was successful
if echo "$STATUS_RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ Database connection: SUCCESS"
    echo ""

    echo "2️⃣  Testing seed endpoint..."
    SEED_RESPONSE=$(curl -s -X POST "$APP_URL/api/seed")
    echo "Response: $SEED_RESPONSE"
    echo ""

    if echo "$SEED_RESPONSE" | grep -q '"success":true'; then
        echo "✅ Database seeding: SUCCESS"
        echo ""
        echo "🎉 All tests passed! You can now log in with:"
        echo "   Setter: angelcruzgabriel44@gmail.com / 15598654Aa"
        echo "   Owner:  acmarketing02023@gmail.com / 64186418Am"
    else
        echo "❌ Database seeding: FAILED"
        echo "Error: $(echo "$SEED_RESPONSE" | grep -o '"error":"[^"]*"')"
    fi
else
    echo "❌ Database connection: FAILED"

    if echo "$STATUS_RESPONSE" | grep -q 'postgres.railway.internal'; then
        echo "Error: DATABASE_URL is still using internal Railway address"
        echo "Solution: Update DATABASE_URL in Vercel to use the PUBLIC Railway URL"
    elif echo "$STATUS_RESPONSE" | grep -q 'Can.t reach database server'; then
        echo "Error: Cannot reach database server"
        echo "Possible causes:"
        echo "  1. DATABASE_URL is incorrect or still using internal address"
        echo "  2. Railway database is down"
        echo "  3. Network connectivity issue"
    else
        echo "Error details:"
        echo "$STATUS_RESPONSE" | jq '.error' 2>/dev/null || echo "$STATUS_RESPONSE"
    fi
fi

echo ""
echo "For help, see: /tmp/RAILWAY_URL_INSTRUCTIONS.md"
