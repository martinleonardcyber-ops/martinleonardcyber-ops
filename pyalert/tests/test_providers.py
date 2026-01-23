"""Tests for provider functionality."""

import pytest
from unittest.mock import Mock, patch
from pyalert import Alert, Severity
from pyalert.providers import DiscordProvider, SlackProvider, TelegramProvider


class TestDiscordProvider:
    """Test Discord provider."""

    def test_initialization(self):
        """Test Discord provider initialization."""
        webhook_url = "https://discord.com/api/webhooks/test"
        provider = DiscordProvider(webhook_url)

        assert provider.webhook_url == webhook_url

    @patch('pyalert.providers.discord.requests.post')
    def test_send_alert(self, mock_post):
        """Test sending alert to Discord."""
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        provider = DiscordProvider("https://test.url")
        alert = Alert("Test message", severity=Severity.INFO)

        provider.send(alert)

        assert mock_post.called
        call_args = mock_post.call_args

        assert call_args[1]['json']['embeds'][0]['title'] == alert.title
        assert call_args[1]['json']['embeds'][0]['description'] == alert.message

    @patch('pyalert.providers.discord.requests.post')
    def test_send_alert_with_fields(self, mock_post):
        """Test sending alert with fields to Discord."""
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        provider = DiscordProvider("https://test.url")
        alert = Alert("Test")
        alert.add_field("Field1", "Value1")

        provider.send(alert)

        embed = mock_post.call_args[1]['json']['embeds'][0]
        assert 'fields' in embed
        assert len(embed['fields']) == 1
        assert embed['fields'][0]['name'] == "Field1"


class TestSlackProvider:
    """Test Slack provider."""

    def test_initialization(self):
        """Test Slack provider initialization."""
        webhook_url = "https://hooks.slack.com/test"
        provider = SlackProvider(webhook_url)

        assert provider.webhook_url == webhook_url

    @patch('pyalert.providers.slack.requests.post')
    def test_send_alert(self, mock_post):
        """Test sending alert to Slack."""
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        provider = SlackProvider("https://test.url")
        alert = Alert("Test message", severity=Severity.WARNING)

        provider.send(alert)

        assert mock_post.called
        call_args = mock_post.call_args

        assert call_args[1]['json']['attachments'][0]['title'] == alert.title
        assert call_args[1]['json']['attachments'][0]['text'] == alert.message


class TestTelegramProvider:
    """Test Telegram provider."""

    def test_initialization(self):
        """Test Telegram provider initialization."""
        bot_token = "123456:ABC-DEF"
        chat_id = "12345678"
        provider = TelegramProvider(bot_token, chat_id)

        assert provider.bot_token == bot_token
        assert provider.chat_id == chat_id
        assert "123456:ABC-DEF" in provider.api_url

    @patch('pyalert.providers.telegram.requests.post')
    def test_send_alert(self, mock_post):
        """Test sending alert to Telegram."""
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        provider = TelegramProvider("token", "chat_id")
        alert = Alert("Test message", title="Test Title")

        provider.send(alert)

        assert mock_post.called
        call_args = mock_post.call_args

        assert call_args[1]['json']['chat_id'] == "chat_id"
        assert "Test Title" in call_args[1]['json']['text']
        assert "Test message" in call_args[1]['json']['text']


class TestAlertIntegration:
    """Test Alert integration with providers."""

    @patch('pyalert.providers.discord.requests.post')
    def test_alert_to_discord(self, mock_post):
        """Test alert.to_discord() method."""
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        alert = Alert("Test")
        result = alert.to_discord("https://test.url")

        assert result is alert  # Check method chaining
        assert len(alert._providers) == 1

    @patch('pyalert.providers.discord.requests.post')
    def test_alert_send_success(self, mock_post):
        """Test successful alert sending."""
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        alert = Alert("Test")
        alert.to_discord("https://test.url")
        results = alert.send()

        assert results["DiscordProvider"] is True

    @patch('pyalert.providers.discord.requests.post')
    def test_alert_send_failure(self, mock_post):
        """Test failed alert sending."""
        mock_post.side_effect = Exception("Network error")

        alert = Alert("Test")
        alert.to_discord("https://test.url")
        results = alert.send()

        assert results["DiscordProvider"] is False
