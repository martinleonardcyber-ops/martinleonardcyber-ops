"""Basic PyAlert usage example."""

from pyalert import Alert, Severity

# Replace with your actual webhook URL
DISCORD_WEBHOOK = "https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE"


def main():
    """Demonstrate basic PyAlert usage."""

    # Simple alert
    print("Sending simple alert...")
    Alert("Hello from PyAlert!", severity=Severity.INFO) \
        .to_discord(DISCORD_WEBHOOK) \
        .send()

    # Alert with fields
    print("Sending alert with fields...")
    alert = Alert(
        message="Server metrics update",
        title="System Monitor",
        severity=Severity.SUCCESS
    )

    alert.add_field("CPU", "45%") \
         .add_field("Memory", "68%") \
         .add_field("Disk", "82%") \
         .to_discord(DISCORD_WEBHOOK) \
         .send()

    print("Alerts sent successfully!")


if __name__ == "__main__":
    main()
