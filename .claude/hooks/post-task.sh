#!/bin/bash

# Post-task hook for Claude Code
# This hook runs after Claude completes a task

# Get the last commit message to understand what changed
LAST_COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null)

# Keywords that indicate tutorial might need updating
TUTORIAL_KEYWORDS=(
  "feat"
  "feature"
  "mechanic"
  "gameplay"
  "stat"
  "phase"
  "bloodline"
  "jockey"
  "equipment"
  "race"
  "betting"
  "shop"
)

# Check if last commit contains relevant keywords
SHOULD_UPDATE_TUTORIAL=false
for keyword in "${TUTORIAL_KEYWORDS[@]}"; do
  if echo "$LAST_COMMIT_MSG" | grep -qi "$keyword"; then
    SHOULD_UPDATE_TUTORIAL=true
    break
  fi
done

# If tutorial update is needed, suggest it
if [ "$SHOULD_UPDATE_TUTORIAL" = true ]; then
  echo ""
  echo "🎓 Suggestion: Recent changes may affect the tutorial."
  echo "   Consider running: /update-tutorial"
  echo "   Or ask: 'Please update the tutorial to reflect the recent changes'"
  echo ""
fi

exit 0
