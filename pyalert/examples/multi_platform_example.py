"""Send alerts to multiple platforms simultaneously."""

from pyalert import Alert, Severity

# Configuration
DISCORD_WEBHOOK = "https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE"
SLACK_WEBHOOK = "https://hooks.slack.com/services/YOUR_WEBHOOK_HERE"
TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN"
TELEGRAM_CHAT_ID = "YOUR_CHAT_ID"


def send_deployment_notification(version: str, status: str):
    """Send deployment notification to all platforms."""

    severity = Severity.SUCCESS if status == "success" else Severity.ERROR

    alert = Alert(
        message=f"Deployment of version {version} {status}!",
        title="Deployment Notification",
        severity=severity
    )

    alert.add_field("Version", version) \
         .add_field("Status", status.upper()) \
         .add_field("Environment", "Production")

    # Send to all platforms at once
    results = alert.to_discord(DISCORD_WEBHOOK) \
                   .to_slack(SLACK_WEBHOOK) \
                   .to_telegram(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) \
                   .send()

    print("Notification results:")
    for provider, success in results.items():
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {provider}: {'Success' if success else 'Failed'}")


if __name__ == "__main__":
    # Example: successful deployment
    send_deployment_notification("v2.1.0", "success")

    # Example: failed deployment
    # send_deployment_notification("v2.1.1", "failed")
