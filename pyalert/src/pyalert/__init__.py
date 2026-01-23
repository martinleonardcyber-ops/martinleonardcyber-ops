"""
PyAlert - Send beautiful alerts to Discord, Slack, Telegram and more with just one line of code.
"""

from .core import Alert, Severity
from .providers import DiscordProvider, SlackProvider, TelegramProvider

__version__ = "0.1.0"
__all__ = ["Alert", "Severity", "DiscordProvider", "SlackProvider", "TelegramProvider"]
