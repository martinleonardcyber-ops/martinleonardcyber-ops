"""Core Alert functionality."""

from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime


class Severity(Enum):
    """Alert severity levels with color coding."""

    SUCCESS = ("success", 0x00FF00, "✅")
    INFO = ("info", 0x3498DB, "ℹ️")
    WARNING = ("warning", 0xFFAA00, "⚠️")
    ERROR = ("error", 0xFF0000, "❌")
    CRITICAL = ("critical", 0x8B0000, "🚨")

    def __init__(self, name: str, color: int, emoji: str):
        self.display_name = name
        self.color = color
        self.emoji = emoji


class Alert:
    """
    Create and send alerts to multiple platforms with ease.

    Example:
        >>> alert = Alert("Server is down!", severity=Severity.CRITICAL)
        >>> alert.add_field("Server", "api.example.com")
        >>> alert.to_discord("https://discord.com/api/webhooks/...")
        >>> alert.send()
    """

    def __init__(
        self,
        message: str,
        title: Optional[str] = None,
        severity: Severity = Severity.INFO,
        fields: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize an alert.

        Args:
            message: Main alert message
            title: Optional title for the alert
            severity: Alert severity level (default: INFO)
            fields: Optional dictionary of field name -> value pairs
        """
        self.message = message
        self.title = title or f"{severity.emoji} Alert"
        self.severity = severity
        self.fields = fields or {}
        self.timestamp = datetime.utcnow()
        self._providers: List[Any] = []

    def add_field(self, name: str, value: Any, inline: bool = True) -> "Alert":
        """
        Add a field to the alert.

        Args:
            name: Field name
            value: Field value
            inline: Whether to display inline (default: True)

        Returns:
            Self for method chaining
        """
        self.fields[name] = {"value": str(value), "inline": inline}
        return self

    def to_discord(self, webhook_url: str) -> "Alert":
        """
        Add Discord as a destination.

        Args:
            webhook_url: Discord webhook URL

        Returns:
            Self for method chaining
        """
        from .providers.discord import DiscordProvider

        self._providers.append(DiscordProvider(webhook_url))
        return self

    def to_slack(self, webhook_url: str) -> "Alert":
        """
        Add Slack as a destination.

        Args:
            webhook_url: Slack webhook URL

        Returns:
            Self for method chaining
        """
        from .providers.slack import SlackProvider

        self._providers.append(SlackProvider(webhook_url))
        return self

    def to_telegram(self, bot_token: str, chat_id: str) -> "Alert":
        """
        Add Telegram as a destination.

        Args:
            bot_token: Telegram bot token
            chat_id: Telegram chat ID

        Returns:
            Self for method chaining
        """
        from .providers.telegram import TelegramProvider

        self._providers.append(TelegramProvider(bot_token, chat_id))
        return self

    def send(self) -> Dict[str, bool]:
        """
        Send the alert to all configured providers.

        Returns:
            Dictionary mapping provider names to success status
        """
        results = {}
        for provider in self._providers:
            try:
                provider.send(self)
                results[provider.__class__.__name__] = True
            except Exception as e:
                results[provider.__class__.__name__] = False
                print(f"Failed to send via {provider.__class__.__name__}: {e}")
        return results

    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary representation."""
        return {
            "title": self.title,
            "message": self.message,
            "severity": self.severity.display_name,
            "fields": self.fields,
            "timestamp": self.timestamp.isoformat(),
        }
