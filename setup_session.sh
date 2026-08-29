#!/bin/bash
# Osiris Session Setup Script
# Run this to initialize the Osiris session with cron jobs

set -e

echo "=== Osiris Session Setup ==="
echo "Creating logs directory..."
mkdir -p /c/Users/kathi/workspace/osiris/logs

echo "Setting up cron job for periodic code analysis..."
# Create cron job that runs every 30 minutes and uses ecc-agent-router
hermes cron add \
  --schedule "every 30 minutes" \
  --name "osiris-code-review" \
  --script "hermes --conversation 'Run comprehensive code review on all Python and Solidity files in /c/Users/kathi/workspace/osiris/src/. Check for security vulnerabilities, money-path issues, and performance problems. Use ecc-agent-router to select the best agent for each file type.'"

echo "Creating daily analysis cron job..."
hermes cron add \
  --schedule "daily at 9am" \
  --name "osiris-daily-analysis" \
  --script "hermes --conversation 'Perform daily health check: analyze recent commits, run security audit on trading code, verify decimal precision handling, and check for dead code. Use ecc-agent-router to select appropriate agents.'"

echo "=== Osiris cron jobs created ==="
hermes cron list | grep osiris

echo "=== Setup complete ==="