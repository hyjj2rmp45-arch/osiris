#!/bin/bash
URL="https://osiris.orkestr.run/health"
TOPIC="OSIRIS"
if curl -fs -s -o /dev/null "$URL" || [ $? -ne 200 ]; then
  curl -s -X POST "https://ntfy.sh/${TOPIC}" \
    -H "Title: 🛑 OSIRIS Worker Down" \
    -H "Priority: 5" \
    -d "Worker health check failed at $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > /dev/null
fi
