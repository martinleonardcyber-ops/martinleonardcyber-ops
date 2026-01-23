"""Discord webhook provider."""

import requests
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core import Alert


class DiscordProvider:
    """Send alerts to Discord via webhooks."""

    def __init__(self, webhook_url: str):
        """
        Initialize Discord provider.

        Args:
            webhook_url: Discord webhook URL
        """
        self.webhook_url = webhook_url

    def send(self, alert: "Alert") -> None:
        """
        Send alert to Discord.

        Args:
            alert: Alert instance to send
        """
        embed = {
            "title": alert.title,
            "description": alert.message,
            "color": alert.severity.color,
            "timestamp": alert.timestamp.isoformat(),
            "footer": {"text": f"Severity: {alert.severity.display_name.upper()}"},
        }

        # Add fields if present
        if alert.fields:
            embed["fields"] = [
                {"name": name, "value": field["value"], "inline": field["inline"]}
                for name, field in alert.fields.items()
            ]

        payload = {"embeds": [embed]}

        response = requests.post(self.webhook_url, json=payload, timeout=10)
        response.raise_for_status()
