@echo off
REM Osiris Cron Job - Code Review
REM Location: C:\Users\kathi\workspace\osiris\logs\code_review.log

echo === Osiris Code Review - %DATE% %TIME% === >> "C:\Users\kathi\workspace\osiris\logs\code_review.log"

cd /d "C:\Users\kathi\workspace\osiris"

REM Set UTF-8 for Python
chcp 65001 >nul

REM Run ECC code review using hermes
"C:\Users\kathi\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe" -E -X utf8 -c "
import subprocess
import sys
result = subprocess.run([
    'hermes', '--conversation',
    'Review all Python and Solidity files in /c/Users/kathi/workspace/osiris/src/. Check for security vulnerabilities, money-path issues, and performance problems. Use ecc-agent-router to select the best agent for each file type.',
    '--no-stream'
], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
sys.exit(result.returncode)
" >> "C:\Users\kathi\workspace\osiris\logs\code_review.log" 2>&1

echo === Complete: %DATE% %TIME% === >> "C:\Users\kathi\workspace\osiris\logs\code_review.log"