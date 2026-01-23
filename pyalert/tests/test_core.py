"""Tests for core Alert functionality."""

import pytest
from datetime import datetime
from pyalert import Alert, Severity


class TestAlert:
    """Test Alert class."""

    def test_alert_creation(self):
        """Test basic alert creation."""
        alert = Alert("Test message")

        assert alert.message == "Test message"
        assert alert.severity == Severity.INFO
        assert alert.title == "ℹ️ Alert"
        assert alert.fields == {}
        assert isinstance(alert.timestamp, datetime)

    def test_alert_with_title(self):
        """Test alert with custom title."""
        alert = Alert("Test", title="Custom Title")

        assert alert.title == "Custom Title"

    def test_alert_severity_levels(self):
        """Test all severity levels."""
        for severity in Severity:
            alert = Alert("Test", severity=severity)
            assert alert.severity == severity

    def test_add_field(self):
        """Test adding fields to alert."""
        alert = Alert("Test")
        alert.add_field("Field1", "Value1")
        alert.add_field("Field2", "Value2", inline=False)

        assert "Field1" in alert.fields
        assert alert.fields["Field1"]["value"] == "Value1"
        assert alert.fields["Field1"]["inline"] is True

        assert "Field2" in alert.fields
        assert alert.fields["Field2"]["value"] == "Value2"
        assert alert.fields["Field2"]["inline"] is False

    def test_add_field_chaining(self):
        """Test method chaining for add_field."""
        alert = Alert("Test")
        result = alert.add_field("Field1", "Value1").add_field("Field2", "Value2")

        assert result is alert
        assert len(alert.fields) == 2

    def test_to_dict(self):
        """Test converting alert to dictionary."""
        alert = Alert("Test message", title="Test Title", severity=Severity.WARNING)
        alert.add_field("Field1", "Value1")

        data = alert.to_dict()

        assert data["title"] == "Test Title"
        assert data["message"] == "Test message"
        assert data["severity"] == "warning"
        assert "Field1" in data["fields"]
        assert "timestamp" in data


class TestSeverity:
    """Test Severity enum."""

    def test_severity_attributes(self):
        """Test severity level attributes."""
        assert Severity.SUCCESS.display_name == "success"
        assert Severity.SUCCESS.color == 0x00FF00
        assert Severity.SUCCESS.emoji == "✅"

        assert Severity.INFO.display_name == "info"
        assert Severity.WARNING.display_name == "warning"
        assert Severity.ERROR.display_name == "error"
        assert Severity.CRITICAL.display_name == "critical"

    def test_all_severities_have_colors(self):
        """Test that all severity levels have color codes."""
        for severity in Severity:
            assert isinstance(severity.color, int)
            assert severity.color >= 0

    def test_all_severities_have_emojis(self):
        """Test that all severity levels have emojis."""
        for severity in Severity:
            assert isinstance(severity.emoji, str)
            assert len(severity.emoji) > 0
