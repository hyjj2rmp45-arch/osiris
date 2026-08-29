#!/usr/bin/env python3
"""Osiris cron watchdog - Python-based replacement for cronjob tool
This runs as a background process and executes scheduled tasks.
"""

import os
import sys
import time
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Setup
WORKSPACE = Path("/c/Users/kathi/workspace/osiris")
LOGS_DIR = WORKSPACE / "logs"
SCRIPTS_DIR = WORKSPACE / "scripts"
LOGS_DIR.mkdir(exist_ok=True)

# Tasks configuration
TASKS = {
    "daily_analysis": {
        "schedule": "09:00",
        "interval_minutes": None,
        "script": SCRIPTS_DIR / "run_ecc_review.py",
        "description": "Daily health check via ecc-agent-router"
    },
    "period_code_review": {
        "schedule": "every_30_min",
        "interval_minutes": 30,
        "script": SCRIPTS_DIR / "run_ecc_review.py",
        "description": "Periodic code review via ecc-agent-router"
    }
}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / 'cron_watchdog.log')
    ]
)
log = logging.getLogger(__name__)

# Last run tracking
last_runs: dict = {}

def run_task(task_name: str):
    """Execute a scheduled task"""
    task = TASKS[task_name]
    log.info(f"Running task: {task_name}")
    
    try:
        # Import hermes_tools and run the conversation
        result = subprocess.run([
            sys.executable, "-E", "-X", "utf8", "-c", f"""
import sys
sys.path.insert(0, '/c/Users/kathi/.browser-use-env/Scripts')

# Run hermes conversation
import subprocess
result = subprocess.run([
    'hermes', '--conversation',
    'Review all Python and Solidity files in /c/Users/kathi/workspace/osiris/src/. Check for security vulnerabilities, money-path issues, and performance problems. Use ecc-agent-router to select the best agent for each file type.',
    '--no-stream', '--max_tokens', '4096'
], capture_output=True, text=True, timeout=300)
print(result.stdout)
if result.stderr:
    print(result.stderr, file=sys.stderr)
"""
        ], capture_output=True, text=True, timeout=300)
        
        output = result.stdout[:2000] if result.stdout else "No output"
        log.info(f"Task {task_name} completed: {output[:500]}")
        
    except subprocess.TimeoutExpired:
        log.error(f"Task {task_name} timed out")
    except Exception as e:
        log.error(f"Task {task_name} failed: {e}")

def should_run(task_name: str) -> bool:
    """Check if task should run based on schedule"""
    task = TASKS[task_name]
    now = datetime.now()
    
    if task_name not in last_runs:
        return True
    
    last_run = last_runs[task_name]
    
    if task["schedule"] == "every_30_min":
        return now - last_run >= timedelta(minutes=30)
    elif task["schedule"] == "09:00":
        # Check if it's time for daily run
        last_daily = last_run.replace(hour=0, minute=0, second=0, microsecond=0)
        expected = last_daily + timedelta(days=1)
        if now.hour >= 9 and expected.date() == now.date():
            return True
        return False
    
    return False

def main():
    """Main watchdog loop"""
    log.info("Osiris cron watchdog started")
    
    while True:
        try:
            for task_name in TASKS:
                if should_run(task_name):
                    run_task(task_name)
                    last_runs[task_name] = datetime.now()
            
            time.sleep(60)  # Check every minute
            
        except KeyboardInterrupt:
            log.info("Watchdog stopped by user")
            break
        except Exception as e:
            log.error(f"Watchdog error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()