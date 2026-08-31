#!/usr/bin/env python3
import os
import time
import requests
import logging

# Configuration
WORKER_URL = os.getenv('WORKER_WATCHDOG_URL', 'https://osiris.orkestr.run/health')
NTFY_TOPIC = os.getenv('NTFY_TOPIC', 'OSIRIS')
CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', 300))  # 5 minutes by default

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/c/Users/kathi/workspace/osiris/logs/worker_watchdog.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger('worker_watchdog')

def check_worker_health():
    """Check if the OSIRIS worker is healthy"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            log.info("Worker health check passed")
            return True
    except Exception as e:
        log.error(f"Health check failed: {e}")
        return False
    return False

def send_alert(message):
    """Send alert via ntfy.sh"""
    ntfy_url = f"https://ntfy.sh/{ntfyTopic}"
    try:
        response = requests.post(ntfy_url, data=message)
        if response.status_code == 200:
            log.info("Alert sent successfully")
        else:
            log.error(f"Failed to send alert: {response.status_code} {response.text}")
    except Exception as e:
        log.error(f"Alert failed: {e}")

def main():
    log.info("Starting OSIRIS worker watchdog...")
    while True:
        try:
            if not check_worker_health():
                send_alert("OSIRIS Worker is down or unhealthy")
        except Exception as e:
            log.error(f"Watchdog error: {e}")
        time.sleep(CHECK_INTERVAL)