#!/bin/bash
# Skoolie deploy script — run from the project root
# Set VERCEL_TOKEN in your shell: export VERCEL_TOKEN=your_token_here
TOKEN="${VERCEL_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "Error: VERCEL_TOKEN is not set. Run: export VERCEL_TOKEN=your_token"
  exit 1
fi

# Deploy to production
npx vercel --token "$TOKEN" \
  --name skoolie \
  --env NEXT_PUBLIC_SUPABASE_URL="https://bqhiwlpmrejvjdljxspy.supabase.co" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaGl3bHBtcmVqdmpkbGp4c3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NDMzMzMsImV4cCI6MjA2NTMxOTMzM30.oBpRTsRHTaAkNgpEEKHfOXb1Q2sF_3MFmPcJXFicFpk" \
  --prod --yes
