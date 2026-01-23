"""Telegram bot provider."""

import requests
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core import Alert


class TelegramProvider:
    """Send alerts to Telegram via bot API."""

    def __init__(self, bot_token: str, chat_id: str):
        """
        Initialize Telegram provider.

        Args:
            bot_token: Telegram bot token
            chat_id: Telegram chat ID
        """
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

    def send(self, alert: "Alert") -> None:
        """
        Send alert to Telegram.

        Args:
            alert: Alert instance to send
        """
        # Format message with Markdown
        message_lines = [
            f"*{alert.title}*",
            "",
            alert.message,
            "",
            f"_Severity: {alert.severity.display_name.upper()}_",
        ]

        # Add fields if present
        if alert.fields:
            message_lines.append("")
            for name, field in alert.fields.items():
                message_lines.append(f"*{name}:* {field['value']}")

        payload = {
            "chat_id": self.chat_id,
            "text": "\n".join(message_lines),
            "parse_mode": "Markdown",
        }

        response = requests.post(self.api_url, json=payload, timeout=10)
        response.raise_for_status()
