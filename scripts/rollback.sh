#!/bin/bash
# Quick rollback script
# Usage: bash scripts/rollback.sh <commit-hash>

if [ -z "$1" ]; then
  echo "Usage: bash scripts/rollback.sh <commit-hash>"
  echo ""
  echo "Recent commits:"
  git log --oneline -10
  exit 1
fi

COMMIT=$1

echo "Rolling back to commit: $COMMIT"
git reset --hard "$COMMIT"

echo "Rebuilding and restarting..."
npm install
npm run build
pm2 restart all

echo "Rollback complete!"
