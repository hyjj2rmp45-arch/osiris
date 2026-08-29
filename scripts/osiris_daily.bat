@echo off
REM Osiris Cron Job - Daily Analysis
REM Run from: C:\Users\kathi\workspace\osiris

echo === Osiris Daily Analysis - %DATE% %TIME% === >> "C:\Users\kathi\workspace\osiris\logs\daily_analysis.log"

cd /d "C:\Users\kathi\workspace\osiris"

REM Set UTF-8 for Python
chcp 65001 >nul

REM Run daily health check
"C:\Users\kathi\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe" -E -X utf8 -c "
import subprocess
import sys
result = subprocess.run([
    'hermes', '--conversation',
    'Perform daily health check: run security audit on trading code, verify decimal precision handling, check for dead code, and summarize recent operations. Use ecc-agent-router to select appropriate agents.',
    '--no-stream'
], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
sys.exit(result.returncode)
" >> "C:\Users\kathi\workspace\osiris\logs\daily_analysis.log" 2>&1

echo === Complete: %DATE% %TIME% === >> "C:\Users\kathi\workspace\osiris\logs\daily_analysis.log"