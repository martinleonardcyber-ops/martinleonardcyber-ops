"""Server monitoring example with PyAlert."""

import psutil
from pyalert import Alert, Severity

# Replace with your webhook URL
DISCORD_WEBHOOK = "https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE"

# Thresholds
CPU_THRESHOLD = 80
MEMORY_THRESHOLD = 85
DISK_THRESHOLD = 90


def check_system_health():
    """Check system health and send alerts if thresholds are exceeded."""

    # Get system metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory_percent = psutil.virtual_memory().percent
    disk_percent = psutil.disk_usage('/').percent

    # Determine severity
    if (cpu_percent > CPU_THRESHOLD or
        memory_percent > MEMORY_THRESHOLD or
        disk_percent > DISK_THRESHOLD):

        severity = Severity.CRITICAL if any([
            cpu_percent > 95,
            memory_percent > 95,
            disk_percent > 95
        ]) else Severity.WARNING

        # Create alert
        alert = Alert(
            message="System resources exceeding thresholds!",
            title="System Health Alert",
            severity=severity
        )

        # Add metrics
        alert.add_field("CPU Usage", f"{cpu_percent}%", inline=True) \
             .add_field("Memory Usage", f"{memory_percent}%", inline=True) \
             .add_field("Disk Usage", f"{disk_percent}%", inline=True)

        # Send to Discord
        result = alert.to_discord(DISCORD_WEBHOOK).send()

        if result.get("DiscordProvider"):
            print("Alert sent successfully!")
        else:
            print("Failed to send alert")
    else:
        print(f"System healthy - CPU: {cpu_percent}%, Memory: {memory_percent}%, Disk: {disk_percent}%")


if __name__ == "__main__":
    check_system_health()
