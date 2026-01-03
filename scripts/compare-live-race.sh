#!/bin/bash

# Script to help diagnose live race discrepancies
# Run this before starting a race, then check the output after

echo "🔍 Live Race Diagnostic Helper"
echo "================================"
echo ""
echo "This will help diagnose why client and server produce different results."
echo ""
echo "Instructions:"
echo "1. Keep this terminal open"
echo "2. Start a race in your browser"
echo "3. After the race completes, check the browser console for 'CLIENT SIMULATOR INPUT'"
echo "4. Check this terminal for 'SERVER SIMULATOR INPUT'"
echo "5. Compare the two JSON outputs - they should be identical"
echo ""
echo "If they differ, that's the source of the bug!"
echo ""
echo "Watching server logs for race simulation data..."
echo ""

# Watch for server simulation logs
tail -f /dev/null
