"""Slack webhook provider."""

import requests
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core import Alert


class SlackProvider:
    """Send alerts to Slack via webhooks."""

    def __init__(self, webhook_url: str):
        """
        Initialize Slack provider.

        Args:
            webhook_url: Slack webhook URL
        """
        self.webhook_url = webhook_url

    def send(self, alert: "Alert") -> None:
        """
        Send alert to Slack.

        Args:
            alert: Alert instance to send
        """
        # Map severity to Slack colors
        color_map = {
            "success": "good",
            "info": "#3498DB",
            "warning": "warning",
            "error": "danger",
            "critical": "danger",
        }

        attachment = {
            "title": alert.title,
            "text": alert.message,
            "color": color_map.get(alert.severity.display_name, "#3498DB"),
            "ts": int(alert.timestamp.timestamp()),
            "footer": f"Severity: {alert.severity.display_name.upper()}",
        }

        # Add fields if present
        if alert.fields:
            attachment["fields"] = [
                {"title": name, "value": field["value"], "short": field["inline"]}
                for name, field in alert.fields.items()
            ]

        payload = {"attachments": [attachment]}

        response = requests.post(self.webhook_url, json=payload, timeout=10)
        response.raise_for_status()
