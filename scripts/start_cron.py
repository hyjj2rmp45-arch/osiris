#!/usr/bin/env python3
"""Start the Osiris cron watchdog as a background service"""

import subprocess
import sys
import os

# Path to the watchdog script
WATCHDOG_SCRIPT = "/c/Users/kathi/workspace/osiris/scripts/cron_watchdog.py"

if __name__ == "__main__":
    print("Starting Osiris cron watchdog...")
    
    # Run the watchdog in the background
    process = subprocess.Popen(
        [sys.executable, WATCHDOG_SCRIPT],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
    )
    
    # Save the PID for later reference
    pid_file = "/c/Users/kathi/workspace/osiris/logs/cron_watchdog.pid"
    with open(pid_file, 'w') as f:
        f.write(str(process.pid))
    
    print(f"Cron watchdog started with PID: {process.pid}")
    print(f"PID saved to: {pid_file}")
    print("Check logs in: /c/Users/kathi/workspace/osiris/logs/cron_watchdog.log")